import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { User } from '../users/user.model';
import { userRepository } from '../users/user.repository';
import { recoveryRequestRepository } from './recovery-request.repository';
import { RememberedDevice } from './remembered-device.model';
import {
  submitRecoveryRequestSchema, rejectRecoveryRequestSchema,
  setNewPasswordSchema, setPinSchema, loginWithPinSchema, setupPinSchema,
} from './recovery.validation';
import { IRecoveryRequest } from './recovery-request.model';
import { tokenService, AccessTokenPayload } from './token.service';
import { NotFoundError, ValidationError, UnauthorizedError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { automationService } from '../automation/automation.service';
import { logger } from '../../lib/logger';

const SALT_ROUNDS = 12;
const TEMP_PASSWORD_VALID_HOURS = 24;
const REMEMBERED_DEVICE_VALID_DAYS = 90;

export type EnrichedRecoveryRequest = Pick<
  IRecoveryRequest,
  | 'schoolId' | 'employeeId' | 'email' | 'userId' | 'status' | 'requestedAt' | 'approvedAt' | 'approvedBy'
  | 'temporaryPasswordExpiresAt' | 'rejectionReason' | 'ipAddress' | 'browser' | 'device' | 'completedAt'
  | 'createdAt' | 'updatedAt'
> & { _id: unknown; staffName?: string; role?: string };

/** Joins each request to its matched User (if any) purely for display — the
 *  RecoveryRequest schema itself stores only what was submitted, so this never
 *  goes stale relative to whatever the User record says right now. */
async function enrich(requests: IRecoveryRequest[]): Promise<EnrichedRecoveryRequest[]> {
  const userIds = Array.from(new Set(requests.map((r) => r.userId).filter((id): id is string => !!id)));
  if (userIds.length === 0) return requests;

  const users = await User.find({ _id: { $in: userIds } }).select('firstName lastName role').lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));

  return requests.map((r) => {
    const u = r.userId ? byId.get(r.userId) : undefined;
    return u ? { ...r, staffName: `${u.firstName} ${u.lastName}`, role: u.role } : r;
  });
}

function generateTemporaryPassword(): string {
  // 12 chars, mixed case + digits + symbol — strong, and typeable from a phone screen.
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%';
  const all = upper + lower + digits + symbols;
  const pick = (set: string) => set[crypto.randomInt(set.length)];
  const required = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  const rest = Array.from({ length: 8 }, () => pick(all));
  const chars = [...required, ...rest];
  // Fisher-Yates shuffle so the required-category chars aren't always in the same positions.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

function describeUserAgent(userAgent?: string): string | undefined {
  if (!userAgent) return undefined;
  return userAgent.length > 300 ? userAgent.slice(0, 300) : userAgent;
}

interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

export const recoveryService = {
  // ── Submit (public, rate-limited) ──────────────────────────────────────────

  async submitRequest(rawInput: unknown, meta: RequestMeta): Promise<void> {
    const data = submitRecoveryRequestSchema.parse(rawInput);

    const alreadyPending = await recoveryRequestRepository.hasPendingForEmail(data.email);
    if (alreadyPending) {
      // Don't reveal whether the email matched an account — just say it's handled.
      return;
    }

    const user = await userRepository.findByEmail(data.email);

    await recoveryRequestRepository.create({
      schoolId: data.schoolId,
      employeeId: data.employeeId,
      email: data.email.toLowerCase(),
      userId: user?._id?.toString(),
      ipAddress: meta.ip,
      browser: describeUserAgent(meta.userAgent),
    });

    if (user) {
      auditService.log({
        userId: user._id.toString(), userDisplayName: `${user.firstName} ${user.lastName}`,
        action: 'auth.recovery_requested', resource: 'auth', resourceId: user._id.toString(),
        details: { email: data.email }, ip: meta.ip, schoolId: user.schoolId,
      });
    }
  },

  // ── Admin queue ────────────────────────────────────────────────────────────

  async listRequests(schoolId: string, status?: IRecoveryRequest['status']): Promise<EnrichedRecoveryRequest[]> {
    const requests = await recoveryRequestRepository.findAll(schoolId, status);
    return enrich(requests);
  },

  async getRequest(id: string, schoolId: string): Promise<EnrichedRecoveryRequest> {
    const request = await recoveryRequestRepository.findById(id, schoolId);
    if (!request) throw new NotFoundError('Recovery request');
    const [result] = await enrich([request]);
    return result;
  },

  /** Approve: issues a temporary password, invalidates the PIN, revokes existing sessions. */
  async approveRequest(id: string, ctx: AuthContext): Promise<{ request: IRecoveryRequest; temporaryPassword?: string; emailed: boolean }> {
    const request = await recoveryRequestRepository.findById(id, ctx.schoolId);
    if (!request) throw new NotFoundError('Recovery request');
    if (request.status !== 'pending') throw new ValidationError('This request has already been reviewed.');
    if (!request.userId) throw new ValidationError('No matching account was found for this request — reject it and ask the staff member to verify their details.');

    const user = await User.findById(request.userId);
    if (!user) throw new NotFoundError('User');

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + TEMP_PASSWORD_VALID_HOURS * 60 * 60 * 1000);

    user.passwordHash = passwordHash;
    user.mustResetPassword = true;
    user.mustResetPin = true;
    user.pinHash = undefined;
    user.tempPasswordExpiresAt = expiresAt;
    user.tokenVersion += 1; // revokes all existing refresh tokens/sessions
    await user.save();

    // Any remembered devices are invalidated along with the PIN they unlock.
    await RememberedDevice.deleteMany({ userId: user._id.toString() });

    const updated = await recoveryRequestRepository.markApproved(id, ctx.displayName, expiresAt);
    if (!updated) throw new NotFoundError('Recovery request');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'auth.recovery_approved', resource: 'auth', resourceId: id,
      details: { targetUserId: user._id.toString(), email: user.email },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });
    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'auth.temp_password_generated', resource: 'auth', resourceId: user._id.toString(),
      details: { expiresAt: expiresAt.toISOString() },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    let emailed = false;
    try {
      await automationService.dispatch({
        type: 'EMAIL',
        payload: {
          to: user.email,
          subject: 'Your SchoolOS account recovery — temporary password',
          firstName: user.firstName,
          temporaryPassword,
          expiresInHours: TEMP_PASSWORD_VALID_HOURS,
          triggeredByName: ctx.displayName,
        },
        referenceType: 'custom',
        triggeredBy: ctx.userId,
        schoolId: ctx.schoolId,
      });
      emailed = true;
    } catch (err) {
      // No email provider configured (or it failed) — the admin will be shown
      // the password directly instead, per the spec's fallback.
      logger.warn('Recovery email dispatch failed, falling back to on-screen password', { error: String(err) });
    }

    return { request: updated, temporaryPassword: emailed ? undefined : temporaryPassword, emailed };
  },

  async rejectRequest(id: string, rawInput: unknown, ctx: AuthContext): Promise<IRecoveryRequest> {
    const { reason } = rejectRecoveryRequestSchema.parse(rawInput);

    const request = await recoveryRequestRepository.findById(id, ctx.schoolId);
    if (!request) throw new NotFoundError('Recovery request');
    if (request.status !== 'pending') throw new ValidationError('This request has already been reviewed.');

    const updated = await recoveryRequestRepository.markRejected(id, reason);
    if (!updated) throw new NotFoundError('Recovery request');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'auth.recovery_rejected', resource: 'auth', resourceId: id,
      details: { reason }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return updated;
  },

  // ── Forced reset flow (authenticated, only reachable while flags are set) ──

  async completePasswordReset(rawInput: unknown, ctx: AuthContext): Promise<void> {
    const { newPassword } = setNewPasswordSchema.parse(rawInput);

    const user = await User.findById(ctx.userId);
    if (!user) throw new UnauthorizedError('User not found');
    if (!user.mustResetPassword) throw new ValidationError('No password reset is pending for this account.');

    user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.mustResetPassword = false;
    user.tempPasswordExpiresAt = undefined;
    await user.save();

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'auth.password_changed', resource: 'auth', resourceId: ctx.userId,
      details: { viaRecovery: true }, ip: ctx.ip, schoolId: ctx.schoolId,
    });
  },

  async completePinReset(rawInput: unknown, ctx: AuthContext): Promise<void> {
    const { pin } = setPinSchema.parse(rawInput);

    const user = await User.findById(ctx.userId);
    if (!user) throw new UnauthorizedError('User not found');
    if (!user.mustResetPin) throw new ValidationError('No PIN reset is pending for this account.');
    if (user.mustResetPassword) throw new ValidationError('Set a new password first.');

    user.pinHash = await bcrypt.hash(pin, SALT_ROUNDS);
    user.mustResetPin = false;
    await user.save();

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'auth.pin_reset', resource: 'auth', resourceId: ctx.userId,
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    const latestApproved = await recoveryRequestRepository.findLatestApprovedForUser(ctx.userId);
    if (latestApproved) {
      await recoveryRequestRepository.markCompleted(String((latestApproved as unknown as { _id: { toString(): string } })._id));
    }
  },

  // ── PIN + remember-device quick login (fully additive, existing login untouched) ──

  async setupPin(rawInput: unknown, ctx: AuthContext, meta: RequestMeta): Promise<{ deviceId: string }> {
    const { pin, deviceLabel } = setupPinSchema.parse(rawInput);

    const user = await User.findById(ctx.userId);
    if (!user) throw new UnauthorizedError('User not found');

    user.pinHash = await bcrypt.hash(pin, SALT_ROUNDS);
    await user.save();

    const deviceId = crypto.randomBytes(24).toString('hex');
    await RememberedDevice.create({
      schoolId: ctx.schoolId,
      userId: ctx.userId,
      deviceId,
      deviceLabel: deviceLabel ?? describeUserAgent(meta.userAgent),
      expiresAt: new Date(Date.now() + REMEMBERED_DEVICE_VALID_DAYS * 24 * 60 * 60 * 1000),
    });

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'auth.pin_reset', resource: 'auth', resourceId: ctx.userId,
      details: { setup: true }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return { deviceId };
  },

  async loginWithPin(
    rawInput: unknown, meta: RequestMeta,
  ): Promise<{ accessToken: string; refreshToken: string; user: AccessTokenPayload }> {
    const { deviceId, pin } = loginWithPinSchema.parse(rawInput);

    const device = await RememberedDevice.findOne({ deviceId });
    if (!device || device.expiresAt < new Date()) throw new UnauthorizedError('This device is no longer remembered. Please log in with your password.');

    const user = await userRepository.findByIdForAuth(device.userId);
    if (!user || user.status !== 'active') throw new UnauthorizedError('Invalid credentials');
    if (!user.pinHash) throw new UnauthorizedError('No PIN set for this account. Please log in with your password.');
    if (user.mustResetPassword || user.mustResetPin) throw new UnauthorizedError('Please log in with your password to complete account recovery first.');

    const isMatch = await bcrypt.compare(pin, user.pinHash);
    if (!isMatch) throw new UnauthorizedError('Incorrect PIN');

    device.lastUsedAt = new Date();
    await device.save();

    const payload: AccessTokenPayload = {
      userId: user._id.toString(), email: user.email, role: user.role,
      schoolId: user.schoolId, firstName: user.firstName, lastName: user.lastName,
    };

    auditService.log({
      userId: payload.userId, userDisplayName: `${user.firstName} ${user.lastName}`,
      action: 'auth.login', resource: 'auth', resourceId: payload.userId,
      details: { viaPin: true }, ip: meta.ip, schoolId: user.schoolId,
    });

    return {
      accessToken: tokenService.generateAccessToken(payload),
      refreshToken: tokenService.generateRefreshToken({ ...payload, tokenVersion: user.tokenVersion }),
      user: payload,
    };
  },

  async forgetDevice(deviceId: string): Promise<void> {
    await RememberedDevice.deleteOne({ deviceId });
  },
};
