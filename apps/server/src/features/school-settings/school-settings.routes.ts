import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { imageUploadMiddleware } from '../../lib/image-upload';
import { schoolSettingsController } from './school-settings.controller';

const router = Router();

router.use(authenticate);

router.get('/', schoolSettingsController.getSettings);
router.post('/logo', authorize('admin', 'principal', 'accountant'), imageUploadMiddleware, schoolSettingsController.uploadLogo);
router.delete('/logo', authorize('admin', 'principal', 'accountant'), schoolSettingsController.removeLogo);
router.patch('/attendance-rules', authorize('admin'), schoolSettingsController.updateAttendanceRules);
router.patch('/payroll-config', authorize('admin'), schoolSettingsController.updatePayrollConfig);

export default router;
