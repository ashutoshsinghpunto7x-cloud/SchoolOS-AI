import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { reportCardTemplateController } from './report-card-template.controller';

const router = Router();

router.use(authenticate);

// Templates configure how report cards are generated — only leadership roles
// may create/edit/publish them. Teachers can read (to know the subjects/skill
// rows/grading key they're entering data against) but never write.
const canRead = authorize('admin', 'principal', 'teacher');
const canWrite = authorize('admin', 'principal');

// Static routes first — must come before /:id to avoid param conflicts
router.get('/class/:class/year/:academicYear', canRead, reportCardTemplateController.getByClassYear);
router.post('/clone', canWrite, reportCardTemplateController.clone);

router.post('/', canWrite, reportCardTemplateController.create);
router.get('/', canRead, reportCardTemplateController.list);
router.get('/:id', canRead, reportCardTemplateController.getById);
router.patch('/:id', canWrite, reportCardTemplateController.update);
router.post('/:id/publish', canWrite, reportCardTemplateController.publish);
router.post('/:id/unpublish', canWrite, reportCardTemplateController.unpublish);
router.delete('/:id', canWrite, reportCardTemplateController.deleteTemplate);

export default router;
