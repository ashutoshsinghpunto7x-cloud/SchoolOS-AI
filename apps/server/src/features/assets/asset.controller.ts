import { Request, Response, NextFunction } from 'express';
import { assetService } from './asset.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const assetController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const asset = await assetService.createAsset(req.body, ctx);
      sendCreated(res, asset, 'Asset added');
    } catch (err) { next(err); }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const result = await assetService.listAssets(req.query, ctx);
      sendPaginated(res, result.records, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  async underRepairCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const count = await assetService.countUnderRepair(ctx);
      sendSuccess(res, { count });
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const asset = await assetService.getById(req.params.id, ctx);
      sendSuccess(res, asset);
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const asset = await assetService.updateAsset(req.params.id, req.body, ctx);
      sendSuccess(res, asset, 'Asset updated');
    } catch (err) { next(err); }
  },

  async deleteAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await assetService.deleteAsset(req.params.id, ctx);
      sendSuccess(res, null, 'Asset deleted');
    } catch (err) { next(err); }
  },
};
