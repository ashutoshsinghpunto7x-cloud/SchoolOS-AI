import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { deviceTokenController } from './device-token.controller';

const router = Router();

router.use(authenticate);

router.post('/', deviceTokenController.register);
router.delete('/:token', deviceTokenController.unregister);

export default router;
