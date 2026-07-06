import bcrypt from 'bcrypt';
import { User } from '../users/user.model';
import { userRepository } from '../users/user.repository';
import { tokenService, AccessTokenPayload } from './token.service';
import { UnauthorizedError } from '../../middlewares/errorHandler';
import { loginSchema } from '../users/user.validation';
import { logger } from '../../lib/logger';
import { auditService } from '../audit/audit.service';

const SALT_ROUNDS = 12;

export const authService = {
  async login(
    rawInput: unknown,
    ip?: string
  ): Promise<{ accessToken: string; refreshToken: string; user: AccessTokenPayload }> {
    const { email, password } = loginSchema.parse(rawInput);

    const user = await userRepository.findByEmail(email);
    if (!user) {
      logger.warn('Login failed: user not found', { email, ip });
      throw new UnauthorizedError('Invalid credentials');
    }

    if (user.status !== 'active') {
      logger.warn('Login failed: inactive user', { email, ip });
      throw new UnauthorizedError('Account is inactive. Contact your administrator.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      logger.warn('Login failed: wrong password', { email, ip });
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

    logger.info('Login success', { userId: payload.userId, email, ip });

    auditService.log({
      userId: payload.userId,
      userDisplayName: `${user.firstName} ${user.lastName}`,
      action: 'auth.login',
      resource: 'auth',
      resourceId: payload.userId,
      ip,
      schoolId: user.schoolId,
    });

    return { accessToken, refreshToken, user: payload };
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

  async me(userId: string): Promise<AccessTokenPayload & { lastLoginAt?: Date }> {
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
    };
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
