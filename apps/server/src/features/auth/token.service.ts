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
  // Identifies the browser tab/device this refresh token belongs to (see
  // auth-cookies.ts). Required so concurrent logins as different accounts in
  // different tabs of the same browser each get their own refresh cookie
  // instead of clobbering a single shared one — see auth.service.refresh for
  // the mismatch check this enables.
  sessionId: string;
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
    // Pin the algorithm explicitly: both secrets here are symmetric (HMAC), so an attacker who got
    // hold of any public key (e.g. from a future RS256/JWKS integration) couldn't replay an
    // alg-confusion attack against this HMAC-only secret.
    return jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] }) as AccessTokenPayload;
  },

  verifyRefreshToken(token: string): DecodedRefreshToken {
    return jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ['HS256'] }) as DecodedRefreshToken;
  },
};
