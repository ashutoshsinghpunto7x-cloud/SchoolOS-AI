import { Router } from 'express';
import { employeeController } from './employee.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { imageUploadMiddleware } from '../../lib/image-upload';

const router = Router();

router.use(authenticate);

// ── Self-service (must precede /:id) ───────────────────────────────────────────
router.get('/me',    employeeController.getMe);
router.get('/me/qr', employeeController.getMyQr);

// ── Employee CRUD ─────────────────────────────────────────────────────────────
router.post('/',   authorize('admin'), employeeController.create);
router.get('/',    authorize('admin', 'principal', 'accountant'), employeeController.list);
router.get('/:id', authorize('admin', 'principal', 'accountant'), employeeController.getById);
router.patch('/:id', authorize('admin'), employeeController.update);
router.delete('/:id', authorize('admin'), employeeController.deleteEmployee);

// ── Photo / Signature uploads ─────────────────────────────────────────────────
router.patch('/:id/photo',     authorize('admin'), imageUploadMiddleware, employeeController.uploadPhoto);
router.patch('/:id/signature', authorize('admin'), imageUploadMiddleware, employeeController.uploadSignature);

// ── Login provisioning ────────────────────────────────────────────────────────
router.post('/:id/login', authorize('admin'), employeeController.createLogin);

// ── QR ────────────────────────────────────────────────────────────────────────
router.post('/:id/qr/regenerate', authorize('admin'), employeeController.regenerateQr);
router.patch('/:id/qr/disable',   authorize('admin'), employeeController.disableQr);
router.get('/:id/qr',             authorize('admin', 'principal'), employeeController.getQr);

export default router;
