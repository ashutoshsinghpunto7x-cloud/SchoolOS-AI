import { Request, Response, NextFunction } from 'express';
import { schoolSettingsService } from './school-settings.service';
import { sendSuccess } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';
import { ValidationError } from '../../middlewares/errorHandler';
import { fileToDataUri } from '../../lib/image-upload';

export const schoolSettingsController = {
  async getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const settings = await schoolSettingsService.getSettings(ctx.schoolId);
      sendSuccess(res, settings);
    } catch (err) { next(err); }
  },

  async uploadLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new ValidationError('No file uploaded. Send the file in a "file" form field.');
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const settings = await schoolSettingsService.updateLogo(fileToDataUri(req.file), ctx);
      sendSuccess(res, settings, 'Logo updated');
    } catch (err) { next(err); }
  },

  async removeLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const settings = await schoolSettingsService.removeLogo(ctx);
      sendSuccess(res, settings, 'Logo removed');
    } catch (err) { next(err); }
  },
};
