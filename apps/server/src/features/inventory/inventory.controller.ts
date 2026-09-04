import { Request, Response, NextFunction } from 'express';
import { inventoryService } from './inventory.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const inventoryController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const item = await inventoryService.createItem(req.body, ctx);
      sendCreated(res, item, 'Item added');
    } catch (err) { next(err); }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const result = await inventoryService.listItems(req.query, ctx);
      sendPaginated(res, result.records, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  async lowStockCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const count = await inventoryService.countLowStock(ctx);
      sendSuccess(res, { count });
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const item = await inventoryService.getById(req.params.id, ctx);
      sendSuccess(res, item);
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const item = await inventoryService.updateItem(req.params.id, req.body, ctx);
      sendSuccess(res, item, 'Item updated');
    } catch (err) { next(err); }
  },

  async deleteItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await inventoryService.deleteItem(req.params.id, ctx);
      sendSuccess(res, null, 'Item deleted');
    } catch (err) { next(err); }
  },

  async createMovement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const movement = await inventoryService.createMovement(req.params.id, req.body, ctx);
      sendCreated(res, movement, 'Stock movement recorded');
    } catch (err) { next(err); }
  },

  async listMovements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const movements = await inventoryService.listMovements(req.params.id, ctx);
      sendSuccess(res, movements);
    } catch (err) { next(err); }
  },
};
