import { Router } from 'express';
import { opsController } from './ops.controller';
import { authenticate } from '../../middlewares/authenticate';
import { permit } from '../../middlewares/permit';
import { PERMISSIONS } from '../../lib/permissions';

const router = Router();

router.use(authenticate);
router.use(permit(PERMISSIONS.OPS_VIEW));

router.get('/dashboard', opsController.dashboard);
router.get('/schools', opsController.schools);
router.get('/infrastructure', opsController.infrastructure);
router.get('/security', opsController.security);
router.get('/logs', opsController.logs);
router.get('/audit-trail', opsController.auditTrail);
router.get('/applications', opsController.applications);
router.get('/chapter-capture-usage', opsController.chapterCaptureUsage);
router.get('/schools/:schoolId', opsController.schoolDetail);
router.get('/errors', opsController.errors);
router.get('/errors/by-module', opsController.errorsByModule);
router.get('/database', opsController.database);
router.get('/deployments', opsController.deployments);
router.get('/communications', opsController.communications);
router.get('/fee-receipts', opsController.feeReceiptWhatsapp);
router.get('/users', opsController.users);
router.get('/alerts', opsController.alerts);
router.patch('/alerts/:alertKey', opsController.updateAlert);
router.get('/settings', opsController.settings);

export default router;
