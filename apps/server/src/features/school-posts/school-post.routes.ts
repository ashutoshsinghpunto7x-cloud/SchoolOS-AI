import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { postPhotosUploadMiddleware } from '../../lib/image-upload';
import { schoolPostController } from './school-post.controller';

const router = Router();
router.use(authenticate);

// Staff who post. Parents read through /parent-workspace/feed; photos are shared with them below.
const canPost = authorize('teacher', 'principal', 'admin');

router.get('/targets', canPost, schoolPostController.getTargets);
router.get('/', canPost, schoolPostController.list);
router.post('/', canPost, postPhotosUploadMiddleware, schoolPostController.create);
router.delete('/:id', canPost, schoolPostController.remove);
router.get('/:id/photos/:photoId', authorize('teacher', 'principal', 'admin', 'parent'), schoolPostController.getPhoto);

export default router;
