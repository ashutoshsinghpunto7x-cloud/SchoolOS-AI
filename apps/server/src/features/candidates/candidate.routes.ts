import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { candidateController } from './candidate.controller';
import { documentUploadMiddleware } from '../../lib/image-upload';

const router = Router();
router.use(authenticate);

// Reception logs/forwards/rejects; principal reviews what's forwarded to
// them. HR has no dedicated role (see candidate.service.ts) — `admin` is HR.
const canAccessCandidates = authorize('admin', 'principal', 'reception');
// Final hire/reject/hold call is Principal/HR only, same split as
// admission-form verification (§4 permissions matrix: "counselor proposes,
// principal approves").
const canDecide = authorize('admin', 'principal');

router.get('/check-duplicate', canAccessCandidates, candidateController.checkDuplicate);
router.post('/',               canAccessCandidates, documentUploadMiddleware, candidateController.create);
router.get('/',                canAccessCandidates, candidateController.list);
router.get('/:id',             canAccessCandidates, candidateController.getById);
router.patch('/:id/forward',        canAccessCandidates, candidateController.forward);
router.patch('/:id/reject',         canAccessCandidates, candidateController.reject);
router.patch('/:id/under-review',   canAccessCandidates, candidateController.markUnderReview);
router.patch('/:id/decision',       canDecide, candidateController.setFinalDecision);
router.delete('/:id', authorize('admin'), candidateController.deleteCandidate);

export default router;
