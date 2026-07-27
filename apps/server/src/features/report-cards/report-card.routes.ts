import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { reportCardController } from './report-card.controller';

const router = Router();

// Public — QR-code verification, no auth. Must be registered before
// router.use(authenticate) below so it never requires a session.
router.get('/verify/:token', reportCardController.verify);

router.use(authenticate);

router.get('/roster', reportCardController.getRoster);
router.post('/generate', reportCardController.generate);
router.get('/by-exam/:examId/student/:studentId', reportCardController.getByExamStudent);
router.get('/:id', reportCardController.getById);
router.get('/:id/qr', reportCardController.getQrImage);
router.patch('/:id', reportCardController.update);
router.post('/:id/regenerate-remark', reportCardController.regenerateRemark);
router.post('/:id/publish', reportCardController.publish);

export default router;
