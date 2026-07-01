import { Request, Response, NextFunction } from 'express';
import { userService } from './user.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';
import type { UserRole, UserStatus } from './user.model';

export const userController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
      const role = req.query.role as UserRole | undefined;
      const status = req.query.status as UserStatus | undefined;

      const result = await userService.listUsers(req.user!.schoolId, {
        page,
        limit,
        search: search || undefined,
        role,
        status,
      });

      sendPaginated(res, result.data, result.meta);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.getUser(req.params.id, req.user!.schoolId);
      sendSuccess(res, user, 'User fetched successfully');
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const user = await userService.createUser(req.body, ctx);
      sendCreated(res, user, 'User created successfully');
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const user = await userService.updateUser(req.params.id, req.body, ctx);
      sendSuccess(res, user, 'User updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async changeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const user = await userService.changeStatus(req.params.id, req.body, ctx);
      sendSuccess(res, user, 'User status updated');
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      await userService.deleteUser(req.params.id, ctx);
      sendSuccess(res, null, 'User deleted successfully');
    } catch (err) {
      next(err);
    }
  },

  async getRoles(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roles = userService.getRoles();
      sendSuccess(res, roles, 'Roles fetched');
    } catch (err) {
      next(err);
    }
  },

  async getPermissions(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const permissions = userService.getPermissions();
      sendSuccess(res, permissions, 'Permissions fetched');
    } catch (err) {
      next(err);
    }
  },
};
