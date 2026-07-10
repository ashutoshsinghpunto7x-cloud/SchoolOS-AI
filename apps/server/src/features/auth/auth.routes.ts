import { Router } from 'express';
import { authController } from './auth.controller';
import { recoveryController } from './recovery.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { authLimiter } from '../../middlewares/rateLimiter';

const router = Router();

// Public — rate limited
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authLimiter, authController.refresh);
router.post('/login-pin', authLimiter, recoveryController.loginWithPin);
router.post('/recovery/request', authLimiter, recoveryController.submitRequest);

// Dev-only seed endpoint
router.post('/seed', authController.seed);

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

// Admin recovery-request queue
router.get('/recovery/requests', authenticate, authorize('admin'), recoveryController.list);
router.get('/recovery/requests/:id', authenticate, authorize('admin'), recoveryController.getById);
router.post('/recovery/requests/:id/approve', authenticate, authorize('admin'), recoveryController.approve);
router.post('/recovery/requests/:id/reject', authenticate, authorize('admin'), recoveryController.reject);

export default router;
