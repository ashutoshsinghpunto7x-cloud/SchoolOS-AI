import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { schoolPostService } from './school-post.service';
import { SCHOOL_POST_KINDS, SchoolPostKind } from './school-post.model';
import { sendSuccess } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';
import { NotFoundError } from '../../middlewares/errorHandler';

function postId(req: Request): string {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) throw new NotFoundError('Post');
  return id;
}

export const schoolPostController = {
  async getTargets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      sendSuccess(res, await schoolPostService.getTargets(ctx));
    } catch (err) { next(err); }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const kind = SCHOOL_POST_KINDS.includes(req.query.kind as SchoolPostKind)
        ? (req.query.kind as SchoolPostKind)
        : undefined;
      sendSuccess(res, await schoolPostService.list(ctx, kind));
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      const post = await schoolPostService.create(req.body, files, ctx);
      sendSuccess(res, post, 'Posted', 201);
    } catch (err) { next(err); }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      await schoolPostService.remove(postId(req), ctx);
      sendSuccess(res, null, 'Post deleted');
    } catch (err) { next(err); }
  },

  async getPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const image = await schoolPostService.getPhoto(postId(req), String(req.params.photoId), ctx);
      res.setHeader('Content-Type', image.contentType);
      // Photos never change once posted, but access is per user and posts can be deleted — short private cache.
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.send(image.buffer);
    } catch (err) { next(err); }
  },
};
