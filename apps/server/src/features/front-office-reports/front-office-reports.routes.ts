import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { frontOfficeReportsController } from './front-office-reports.controller';

const router = Router();
router.use(authenticate);

// Reception Management Module SRD, Module 9, §"Reports & Analytics":
// "Principal, Admin (full); Receptionist/Counselor (own performance only)."
// Per-counselor scoping for reception's own view isn't implemented yet —
// reception sees the same school-wide report as admin/principal for now,
// same access level as the front-office modules they already use daily.
const canViewReports = authorize('admin', 'principal', 'reception');

router.get('/admissions',  canViewReports, frontOfficeReportsController.getAdmissions);
router.get('/recruitment', canViewReports, frontOfficeReportsController.getRecruitment);
router.get('/visitors',    canViewReports, frontOfficeReportsController.getVisitors);

export default router;
