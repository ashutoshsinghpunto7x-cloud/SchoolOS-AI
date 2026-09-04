import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { purchaseController } from './purchase.controller';

const requestRouter = Router();
requestRouter.use(authenticate);
requestRouter.use(authorize('admin', 'operations_manager', 'principal'));

requestRouter.get('/pending-count', purchaseController.pendingRequestCount);
requestRouter.post('/',   purchaseController.createRequest);
requestRouter.get('/',    purchaseController.listRequests);
requestRouter.get('/:id', purchaseController.getRequestById);
requestRouter.put('/:id/approve', purchaseController.approveRequest);
requestRouter.put('/:id/reject',  purchaseController.rejectRequest);

const orderRouter = Router();
orderRouter.use(authenticate);
orderRouter.use(authorize('admin', 'operations_manager'));

orderRouter.post('/',   purchaseController.createOrder);
orderRouter.get('/',    purchaseController.listOrders);
orderRouter.get('/:id', purchaseController.getOrderById);
orderRouter.put('/:id/receive', purchaseController.receiveOrder);

export { requestRouter as purchaseRequestRouter, orderRouter as purchaseOrderRouter };
