import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { admissionFormController } from './admission-form.controller';
import { documentUploadMiddleware } from '../../lib/image-upload';

const router = Router();
router.use(authenticate);

// Same admission-pipeline roles as enquiries/follow-ups.
const canAccessForms = authorize('admin', 'principal', 'reception');
// Verification is a leadership call per the SRD's permissions matrix
// (counselor "propose," principal "approve") — reception issues/tracks
// forms but doesn't get the final verify/reject call.
const canVerify = authorize('admin', 'principal');

router.post('/',                            canAccessForms, admissionFormController.issue);
router.get('/',                             canAccessForms, admissionFormController.list);
router.get('/by-enquiry/:enquiryId',        canAccessForms, admissionFormController.getByEnquiry);
router.get('/:id',                          canAccessForms, admissionFormController.getById);
router.patch('/:id/payment',                canAccessForms, admissionFormController.updatePayment);
router.patch('/:id/submit',                 canAccessForms, admissionFormController.recordSubmission);
router.patch('/:id/resubmit',               canAccessForms, admissionFormController.resubmit);
router.patch('/:id/verify',                 canVerify,      admissionFormController.verify);
router.post('/:id/checklist',               canAccessForms, admissionFormController.addChecklistItem);
router.delete('/:id/checklist/:itemId',     canAccessForms, admissionFormController.removeChecklistItem);
router.patch('/:id/checklist/:itemId',      canAccessForms, admissionFormController.updateChecklistItem);
router.patch(
  '/:id/checklist/:itemId/file',
  canAccessForms,
  documentUploadMiddleware,
  admissionFormController.uploadChecklistItemFile,
);
router.delete('/:id', authorize('admin'), admissionFormController.deleteForm);

export default router;
