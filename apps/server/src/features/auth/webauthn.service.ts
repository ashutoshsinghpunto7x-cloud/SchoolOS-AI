import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  WebAuthnCredential,
} from '@simplewebauthn/server';
import { User } from '../users/user.model';
import { userRepository } from '../users/user.repository';
import { WebAuthnCredential as WebAuthnCredentialModel, IWebAuthnCredential } from './webauthn-credential.model';
import { WebAuthnChallenge } from './webauthn-challenge.model';
import { tokenService, AccessTokenPayload } from './token.service';
import { NotFoundError, UnauthorizedError, ValidationError, MaintenanceModeError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { maintenanceService } from '../maintenance/maintenance.service';
import { webauthnRpId, webauthnRpName, webauthnExpectedOrigins } from '../../config/webauthn';

interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

function toWebAuthnCredential(doc: IWebAuthnCredential): WebAuthnCredential {
  return {
    id: doc.credentialId,
    publicKey: isoBase64URL.toBuffer(doc.publicKey),
    counter: doc.counter,
    transports: doc.transports as WebAuthnCredential['transports'],
  };
}

export const webauthnService = {
  // ── Registration (authenticated: add a passkey to the current account) ────

  async getRegistrationOptions(ctx: AuthContext): Promise<PublicKeyCredentialCreationOptionsJSON> {
    const user = await User.findById(ctx.userId);
    if (!user) throw new UnauthorizedError('User not found');

    const existing = await WebAuthnCredentialModel.find({ userId: ctx.userId }).lean();

    const options = await generateRegistrationOptions({
      rpName: webauthnRpName,
      rpID: webauthnRpId,
      userName: user.email,
      userDisplayName: `${user.firstName} ${user.lastName}`,
      userID: new Uint8Array(Buffer.from(ctx.userId, 'utf8')),
      attestationType: 'none',
      excludeCredentials: existing.map((c) => ({ id: c.credentialId, transports: c.transports as never })),
      authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
    });

    await WebAuthnChallenge.deleteMany({ userId: ctx.userId, purpose: 'register' });
    await WebAuthnChallenge.create({ purpose: 'register', userId: ctx.userId, challenge: options.challenge });

    return options;
  },

  async verifyRegistration(ctx: AuthContext, response: RegistrationResponseJSON, deviceLabel?: string): Promise<void> {
    const stored = await WebAuthnChallenge.findOne({ userId: ctx.userId, purpose: 'register' }).sort({ createdAt: -1 });
    if (!stored) throw new ValidationError('Registration expired — please try again.');
    await WebAuthnChallenge.deleteOne({ _id: stored._id });

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: stored.challenge,
      expectedOrigin: webauthnExpectedOrigins,
      expectedRPID: webauthnRpId,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new ValidationError('Could not verify that passkey — please try again.');
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    await WebAuthnCredentialModel.create({
      schoolId: ctx.schoolId,
      userId: ctx.userId,
      credentialId: credential.id,
      publicKey: isoBase64URL.fromBuffer(credential.publicKey),
      counter: credential.counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: credential.transports,
      deviceLabel,
    });

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'auth.passkey_registered', resource: 'auth', resourceId: ctx.userId,
      ip: ctx.ip, schoolId: ctx.schoolId,
    });
  },

  async listCredentials(ctx: AuthContext): Promise<IWebAuthnCredential[]> {
    return WebAuthnCredentialModel.find({ userId: ctx.userId }).sort({ createdAt: -1 }).lean<IWebAuthnCredential[]>();
  },

  /** Scoped to the requesting user's own userId — same IDOR-safe pattern as recovery.service.ts's forgetDevice. */
  async deleteCredential(ctx: AuthContext, id: string): Promise<void> {
    const deleted = await WebAuthnCredentialModel.findOneAndDelete({ _id: id, userId: ctx.userId });
    if (!deleted) throw new NotFoundError('Passkey');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'auth.passkey_removed', resource: 'auth', resourceId: ctx.userId,
      ip: ctx.ip, schoolId: ctx.schoolId,
    });
  },

  // ── Login (public: discoverable/usernameless credential) ──────────────────

  async getLoginOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
    const options = await generateAuthenticationOptions({
      rpID: webauthnRpId,
      userVerification: 'required',
    });

    await WebAuthnChallenge.create({ purpose: 'login', challenge: options.challenge });

    return options;
  },

  async verifyLogin(
    response: AuthenticationResponseJSON, challenge: string, meta: RequestMeta,
  ): Promise<{ accessToken: string; refreshToken: string; user: AccessTokenPayload }> {
    const credentialDoc = await WebAuthnCredentialModel.findOne({ credentialId: response.id });
    if (!credentialDoc) throw new UnauthorizedError('This passkey is not registered on this device.');

    // Discoverable/usernameless login happens before we know who's signing in, so there's no
    // session to key the pending challenge by — the client instead echoes back the exact
    // challenge value it received from getLoginOptions, single-use (deleted immediately below).
    const challengeDoc = await WebAuthnChallenge.findOne({ purpose: 'login', challenge });
    if (!challengeDoc) throw new ValidationError('Login expired — please try again.');
    await WebAuthnChallenge.deleteOne({ _id: challengeDoc._id });

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeDoc.challenge,
      expectedOrigin: webauthnExpectedOrigins,
      expectedRPID: webauthnRpId,
      credential: toWebAuthnCredential(credentialDoc),
    });

    if (!verification.verified) throw new UnauthorizedError('Could not verify that passkey.');

    const user = await userRepository.findByIdForAuth(credentialDoc.userId);
    if (!user || user.status !== 'active') throw new UnauthorizedError('Invalid credentials');
    if (user.mustResetPassword || user.mustResetPin) throw new UnauthorizedError('Please log in with your password to complete account recovery first.');

    const maintenance = await maintenanceService.getStatus();
    if (maintenance.isActive && !maintenanceService.isRoleExempt(user.role)) {
      throw new MaintenanceModeError(maintenance.message || undefined);
    }

    credentialDoc.counter = verification.authenticationInfo.newCounter;
    credentialDoc.lastUsedAt = new Date();
    await credentialDoc.save();

    const payload: AccessTokenPayload = {
      userId: user._id.toString(), email: user.email, role: user.role,
      schoolId: user.schoolId, firstName: user.firstName, lastName: user.lastName,
    };

    auditService.log({
      userId: payload.userId, userDisplayName: `${user.firstName} ${user.lastName}`,
      action: 'auth.login', resource: 'auth', resourceId: payload.userId,
      details: { viaPasskey: true }, ip: meta.ip, schoolId: user.schoolId,
    });

    return {
      accessToken: tokenService.generateAccessToken(payload),
      refreshToken: tokenService.generateRefreshToken({ ...payload, tokenVersion: user.tokenVersion }),
      user: payload,
    };
  },
};
