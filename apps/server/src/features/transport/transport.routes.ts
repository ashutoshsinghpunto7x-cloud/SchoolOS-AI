import { Router } from 'express';
import { transportController } from './transport.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const router = Router();

router.use(authenticate);

// ── Driver ───────────────────────────────────────────────────────────────────
router.get('/driver/me', authorize('driver'), transportController.getMyVehicle);
router.post('/driver/start', authorize('driver'), transportController.ping);
router.post('/driver/ping', authorize('driver'), transportController.ping);
router.post('/driver/end', authorize('driver'), transportController.endRoute);

// ── Parent ───────────────────────────────────────────────────────────────────
router.get('/parent/live', authorize('parent'), transportController.getLiveForParent);

// ── Admin / Principal ────────────────────────────────────────────────────────
router.get('/vehicles', authorize('admin', 'principal'), transportController.listVehicles);
router.post('/vehicles', authorize('admin', 'principal'), transportController.createVehicle);
router.post('/vehicles/:id/assign-driver', authorize('admin', 'principal'), transportController.assignDriver);
router.post('/vehicles/:id/assign-students', authorize('admin', 'principal'), transportController.assignStudents);
router.get('/vehicles/:id/students', authorize('admin', 'principal'), transportController.listVehicleStudents);
router.get('/drivers', authorize('admin', 'principal'), transportController.listDrivers);
router.get('/live', authorize('admin', 'principal'), transportController.listAllLive);

export default router;
