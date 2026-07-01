import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authLimiter } from '../../middlewares/rateLimiter';

const router = Router();

// Public — rate limited
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authLimiter, authController.refresh);

// Dev-only seed endpoint
router.post('/seed', authController.seed);

// Protected
router.get('/me', authenticate, authController.me);
router.post('/logout', authenticate, authController.logout);

export default router;
