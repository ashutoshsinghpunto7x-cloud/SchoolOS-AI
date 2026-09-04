import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { assetController } from './asset.controller';

const router = Router();

router.use(authenticate);
// 'accountant' can read (so a Facility Request they raise can link to a
// specific asset) but not write — asset tracking stays owned by Operations.
router.use(authorize('admin', 'operations_manager', 'accountant'));

router.get('/under-repair-count', authorize('admin', 'operations_manager'), assetController.underRepairCount);

router.post('/',      authorize('admin', 'operations_manager'), assetController.create);
router.get('/',        assetController.list);
router.get('/:id',     assetController.getById);
router.patch('/:id',   authorize('admin', 'operations_manager'), assetController.update);
router.delete('/:id',  authorize('admin', 'operations_manager'), assetController.deleteAsset);

export default router;
