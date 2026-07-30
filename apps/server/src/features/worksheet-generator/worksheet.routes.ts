import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { worksheetController } from './worksheet.controller';

const router = Router();

router.use(authenticate);

router.post('/generate', worksheetController.generate);
router.post('/', worksheetController.save);
router.get('/', worksheetController.list);
router.get('/:id', worksheetController.getById);
router.delete('/:id', worksheetController.delete);

export default router;
