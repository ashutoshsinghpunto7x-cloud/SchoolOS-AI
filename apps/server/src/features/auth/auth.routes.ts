import { Router } from 'express';
import { authController } from './auth.controller';
import { recoveryController } from './recovery.controller';
import { webauthnController } from './webauthn.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { authLimiter, authAccountLimiter, pinLoginLimiter, webauthnLoginLimiter } from '../../middlewares/rateLimiter';
import { verifyCsrf } from '../../middlewares/csrf';
import { env } from '../../config/env';

const router = Router();

// Public — rate limited. /refresh is cookie-authenticated (the refresh token
// lives in an httpOnly cookie, not the request body) so it needs the CSRF
// check — every other route here authenticates via a Bearer header instead.
// authAccountLimiter keys on the `identifier` field this route's body has;
// /login-pin has no such field (it's deviceId + PIN) so it gets its own
// deviceId-keyed pinLoginLimiter instead — same purpose, different key.
router.post('/login', authLimiter, authAccountLimiter, authController.login);
router.post('/refresh', authLimiter, verifyCsrf, authController.refresh);
router.post('/login-pin', authLimiter, pinLoginLimiter, recoveryController.loginWithPin);
router.post('/recovery/request', authLimiter, recoveryController.submitRequest);

// Passkey (fingerprint/Face ID) login — public, discoverable credential, no identifier in the body.
router.post('/webauthn/login/options', authLimiter, webauthnLoginLimiter, webauthnController.getLoginOptions);
router.post('/webauthn/login/verify', authLimiter, webauthnLoginLimiter, webauthnController.verifyLogin);

// Dev-only seed endpoint — not registered at all outside development, so a
// misconfigured NODE_ENV in prod can't fall through to the controller's own
// runtime check and expose an unauthenticated admin-creation endpoint.
if (env.NODE_ENV === 'development') {
  router.post('/seed', authController.seed);
}

// Protected
router.get('/me', authenticate, authController.me);
router.post('/logout', authenticate, authController.logout);
router.post('/change-password', authenticate, authController.changePassword);

// Account recovery — forced reset flow (self, only reachable while flags are set)
router.post('/complete-password-reset', authenticate, recoveryController.completePasswordReset);
router.post('/complete-pin-reset', authenticate, recoveryController.completePinReset);

// PIN + remember-device (self-service, additive to the existing login)
router.post('/setup-pin', authenticate, recoveryController.setupPin);
router.delete('/devices/:deviceId', authenticate, recoveryController.forgetDevice);

// Passkey registration + management (self-service, additive to the existing login)
router.post('/webauthn/register/options', authenticate, webauthnController.getRegistrationOptions);
router.post('/webauthn/register/verify', authenticate, webauthnController.verifyRegistration);
router.get('/webauthn/credentials', authenticate, webauthnController.listCredentials);
router.delete('/webauthn/credentials/:id', authenticate, webauthnController.deleteCredential);

// Admin recovery-request queue
router.get('/recovery/requests', authenticate, authorize('admin'), recoveryController.list);
router.get('/recovery/requests/:id', authenticate, authorize('admin'), recoveryController.getById);
router.post('/recovery/requests/:id/approve', authenticate, authorize('admin'), recoveryController.approve);
router.post('/recovery/requests/:id/reject', authenticate, authorize('admin'), recoveryController.reject);

export default router;
