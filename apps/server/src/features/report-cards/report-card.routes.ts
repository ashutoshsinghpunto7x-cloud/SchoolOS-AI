import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { reportCardController } from './report-card.controller';

const router = Router();

// Public — QR-code verification, no auth. Must be registered before
// router.use(authenticate) below so it never requires a session.
router.get('/verify/:token', reportCardController.verify);

router.use(authenticate);

// Only teaching/leadership roles touch report cards — reception/accountant
// have no legitimate reason to generate, edit, or view them.
const canAccessReportCards = authorize('admin', 'principal', 'teacher');

router.get('/roster', canAccessReportCards, reportCardController.getRoster);
router.post('/generate', canAccessReportCards, reportCardController.generate);
router.get('/by-exam/:examId/student/:studentId', canAccessReportCards, reportCardController.getByExamStudent);
router.get('/:id', canAccessReportCards, reportCardController.getById);
router.get('/:id/qr', canAccessReportCards, reportCardController.getQrImage);
router.patch('/:id', canAccessReportCards, reportCardController.update);
router.post('/:id/regenerate-remark', canAccessReportCards, reportCardController.regenerateRemark);
// Publishing makes the report card visible/downloadable by parents and is
// hard to walk back — same admin/principal-only bar as marks.publish.
router.post('/:id/publish', authorize('admin', 'principal'), reportCardController.publish);

export default router;
