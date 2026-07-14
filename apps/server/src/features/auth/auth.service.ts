import bcrypt from 'bcrypt';
import { User } from '../users/user.model';
import { userRepository } from '../users/user.repository';
import { tokenService, AccessTokenPayload } from './token.service';
import { UnauthorizedError, ValidationError } from '../../middlewares/errorHandler';
import { loginSchema, changePasswordSchema } from '../users/user.validation';
import { logger } from '../../lib/logger';
import { auditService } from '../audit/audit.service';

const SALT_ROUNDS = 12;

export const authService = {
  async login(
    rawInput: unknown,
    ip?: string
  ): Promise<{
    accessToken: string; refreshToken: string; user: AccessTokenPayload;
    mustResetPassword?: boolean; mustResetPin?: boolean;
  }> {
    const { identifier: rawIdentifier, password } = loginSchema.parse(rawInput);
    const identifier = rawIdentifier.trim().toLowerCase();

    // Every existing account logs in by email exactly as before. A non-email
    // identifier (no "@") is a staff-issued username — e.g. a teacher account
    // an admin created without a self-signup flow — resolved separately so
    // email-based login behavior is completely unaffected.
    const user = identifier.includes('@')
      ? await userRepository.findByEmail(identifier)
      : await userRepository.findByUsername(identifier);
    if (!user) {
      logger.warn('Login failed: user not found', { identifier, ip });
      throw new UnauthorizedError('Invalid credentials');
    }

    if (user.status !== 'active') {
      logger.warn('Login failed: inactive user', { identifier, ip });
      throw new UnauthorizedError('Account is inactive. Contact your administrator.');
    }

    // A temporary password issued by an approved recovery request expires
    // after 24 hours even if never used — expired attempts fall through to
    // the normal "invalid credentials" path rather than a distinguishing
    // message, so a stale temp password can't be used to probe account state.
    if (user.mustResetPassword && user.tempPasswordExpiresAt && user.tempPasswordExpiresAt < new Date()) {
      logger.warn('Login failed: temporary password expired', { identifier, ip });
      throw new UnauthorizedError('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      logger.warn('Login failed: wrong password', { identifier, ip });
      throw new UnauthorizedError('Invalid credentials');
    }

    // Fire-and-forget: not needed for the response, and shouldn't block login latency
    // on an extra write round-trip. Matches the auditService.log pattern below.
    userRepository.updateLastLogin(user._id.toString()).catch((err: unknown) => {
      logger.error('updateLastLogin failed', { userId: user._id.toString(), err });
    });

    const payload: AccessTokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    const accessToken = tokenService.generateAccessToken(payload);
    const refreshToken = tokenService.generateRefreshToken({
      ...payload,
      tokenVersion: user.tokenVersion,
    });

    logger.info('Login success', { userId: payload.userId, email: user.email, ip });

    auditService.log({
      userId: payload.userId,
      userDisplayName: `${user.firstName} ${user.lastName}`,
      action: 'auth.login',
      resource: 'auth',
      resourceId: payload.userId,
      ip,
      schoolId: user.schoolId,
    });

    return {
      accessToken, refreshToken, user: payload,
      mustResetPassword: user.mustResetPassword || undefined,
      mustResetPin: user.mustResetPin || undefined,
    };
  },

  async refresh(
    rawToken: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let decoded;
    try {
      decoded = tokenService.verifyRefreshToken(rawToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await userRepository.findByIdForAuth(decoded.userId);
    if (!user) throw new UnauthorizedError('User not found');
    if (user.status !== 'active') throw new UnauthorizedError('Account is inactive');
    if (user.tokenVersion !== decoded.tokenVersion) {
      throw new UnauthorizedError('Token has been revoked. Please log in again.');
    }

    const payload: AccessTokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    return {
      accessToken: tokenService.generateAccessToken(payload),
      refreshToken: tokenService.generateRefreshToken({
        ...payload,
        tokenVersion: user.tokenVersion,
      }),
    };
  },

  async logout(
    userId: string,
    schoolId: string,
    displayName: string,
    ip?: string
  ): Promise<void> {
    await userRepository.incrementTokenVersion(userId);
    logger.info('Logout', { userId });
    auditService.log({
      userId,
      userDisplayName: displayName,
      action: 'auth.logout',
      resource: 'auth',
      resourceId: userId,
      ip,
      schoolId,
    });
  },

  async me(userId: string): Promise<AccessTokenPayload & { lastLoginAt?: Date; mustResetPassword?: boolean; mustResetPin?: boolean }> {
    const user = await userRepository.findByIdForAuth(userId);
    if (!user) throw new UnauthorizedError('User not found');
    return {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
      firstName: user.firstName,
      lastName: user.lastName,
      lastLoginAt: user.lastLoginAt,
      mustResetPassword: user.mustResetPassword || undefined,
      mustResetPin: user.mustResetPin || undefined,
    };
  },

  /** Self-service password change — a user may only ever change their own password (ctx.userId), never anyone else's. */
  async changePassword(
    userId: string,
    rawInput: unknown,
    ctx: { schoolId: string; displayName: string; ip?: string },
  ): Promise<void> {
    const { currentPassword, newPassword } = changePasswordSchema.parse(rawInput);

    const user = await userRepository.findByIdForAuth(userId);
    if (!user) throw new UnauthorizedError('User not found');

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) throw new ValidationError('Current password is incorrect');

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await userRepository.updatePassword(userId, newHash);

    logger.info('Password changed', { userId });
    auditService.log({
      userId,
      userDisplayName: ctx.displayName,
      action: 'auth.password_changed',
      resource: 'auth',
      resourceId: userId,
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });
  },

  async seedFirstAdmin(schoolId: string): Promise<{ email: string; password: string }> {
    const password = 'Admin@123';
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const existing = await User.findOne({ email: 'admin@schoolos.app' });
    if (existing) {
      // Dev reset: update password and ensure schoolId is correct
      await User.updateOne(
        { email: 'admin@schoolos.app' },
        { $set: { passwordHash, schoolId, status: 'active', tokenVersion: existing.tokenVersion + 1 } }
      );
      logger.info('Seed: admin password reset', { schoolId });
      return { email: 'admin@schoolos.app', password };
    }

    await User.create({
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@schoolos.app',
      passwordHash,
      role: 'admin',
      schoolId,
      status: 'active',
    });

    logger.info('Seed: first admin created', { schoolId });
    return { email: 'admin@schoolos.app', password };
  },
};
