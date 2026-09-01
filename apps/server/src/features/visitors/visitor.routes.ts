import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { visitorController } from './visitor.controller';
import { visitorAppointmentController } from './visitor-appointment.controller';
import { imageUploadMiddleware, documentUploadMiddleware } from '../../lib/image-upload';

const router = Router();
router.use(authenticate);

// Front-desk role plus leadership oversight — matches the reception-owned
// enquiries/fees front-desk pattern elsewhere in the app.
const canAccessVisitors = authorize('admin', 'principal', 'reception');

// ── Appointments (must precede /:id) ────────────────────────────────────────────
router.post('/appointments',                    canAccessVisitors, visitorAppointmentController.create);
router.get('/appointments',                     canAccessVisitors, visitorAppointmentController.list);
router.get('/appointments/:id',                 canAccessVisitors, visitorAppointmentController.getById);
router.patch('/appointments/:id/cancel',        canAccessVisitors, visitorAppointmentController.cancel);
router.patch('/appointments/:id/no-show',       canAccessVisitors, visitorAppointmentController.markNoShow);
router.post('/appointments/:appointmentId/arrive', canAccessVisitors, visitorController.arriveFromAppointment);

// ── Visitors ─────────────────────────────────────────────────────────────────
router.post('/',                 canAccessVisitors, visitorController.create);
router.get('/',                  canAccessVisitors, visitorController.list);
router.get('/:id',               canAccessVisitors, visitorController.getById);
router.get('/:id/history',       canAccessVisitors, visitorController.getHistory);
router.patch('/:id/status',      canAccessVisitors, visitorController.updateStatus);
router.patch('/:id/photo',       canAccessVisitors, imageUploadMiddleware, visitorController.uploadPhoto);
router.patch('/:id/id-proof',    canAccessVisitors, documentUploadMiddleware, visitorController.uploadIdProof);
router.patch('/:id/check-out',   canAccessVisitors, visitorController.checkOut);
router.delete('/:id', authorize('admin'), visitorController.deleteVisitor);

export default router;
