import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import type { UserRole } from '../users/user.model';

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  schoolId: string;
  firstName: string;
  lastName: string;
}

interface RefreshTokenPayload extends AccessTokenPayload {
  tokenVersion: number;
}

export interface DecodedRefreshToken extends RefreshTokenPayload {
  iat: number;
  exp: number;
}

// Access token: 15 minutes. Refresh token: 7 days.
// Hardcoded to satisfy @types/jsonwebtoken StringValue constraint.
// Adjust in the constants below if needed.
const ACCESS_EXPIRES = '15m' as const;
const REFRESH_EXPIRES = '7d' as const;

export const tokenService = {
  generateAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
  },

  generateRefreshToken(payload: RefreshTokenPayload): string {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
  },

  verifyAccessToken(token: string): AccessTokenPayload {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  },

  verifyRefreshToken(token: string): DecodedRefreshToken {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as DecodedRefreshToken;
  },
};
