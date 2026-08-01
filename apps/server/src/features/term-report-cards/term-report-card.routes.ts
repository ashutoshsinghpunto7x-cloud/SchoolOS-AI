import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { termReportCardController } from './term-report-card.controller';

const router = Router();

// Public — QR-code verification, no auth. Must be registered before
// router.use(authenticate) below so it never requires a session.
router.get('/verify/:token', termReportCardController.verify);

router.use(authenticate);

// Same access bar as the existing single-exam report-cards module.
const canAccessReportCards = authorize('admin', 'principal', 'teacher');

router.get('/roster', canAccessReportCards, termReportCardController.getRoster);
router.post('/generate', canAccessReportCards, termReportCardController.generate);
router.get('/by-student/:studentId/year/:academicYear', canAccessReportCards, termReportCardController.getByStudentYear);
router.get('/:id', canAccessReportCards, termReportCardController.getById);
router.get('/:id/qr', canAccessReportCards, termReportCardController.getQrImage);
router.patch('/:id', canAccessReportCards, termReportCardController.update);
router.patch('/:id/skills', canAccessReportCards, termReportCardController.updateSkills);
// Publishing makes the card visible/downloadable by parents — admin/principal-only.
router.post('/:id/publish', authorize('admin', 'principal'), termReportCardController.publish);

export default router;
