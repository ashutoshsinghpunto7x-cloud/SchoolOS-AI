import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { visitorController } from './visitor.controller';

const router = Router();
router.use(authenticate);

// Front-desk role plus leadership oversight — matches the reception-owned
// enquiries/fees front-desk pattern elsewhere in the app.
const canAccessVisitors = authorize('admin', 'principal', 'reception');

router.post('/',                 canAccessVisitors, visitorController.create);
router.get('/',                  canAccessVisitors, visitorController.list);
router.get('/:id',               canAccessVisitors, visitorController.getById);
router.patch('/:id/check-out',   canAccessVisitors, visitorController.checkOut);
router.delete('/:id', authorize('admin'), visitorController.deleteVisitor);

export default router;
