import bcrypt from 'bcryptjs';
import { userRepository, FindUsersOptions, PaginatedUsers } from './user.repository';
import { createUserSchema, updateUserSchema, statusChangeSchema } from './user.validation';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { IUser, UserRole } from './user.model';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import {
  ROLE_PERMISSIONS,
  ROLE_META,
  PERMISSION_META,
  Permission,
} from '../../lib/permissions';

const SALT_ROUNDS = 12;

export const userService = {
  async listUsers(schoolId: string, options: FindUsersOptions = {}): Promise<PaginatedUsers> {
    return userRepository.findAll(schoolId, options);
  },

  async getUser(id: string, schoolId: string): Promise<IUser> {
    const user = await userRepository.findById(id, schoolId);
    if (!user) throw new NotFoundError('User');
    return user;
  },

  async createUser(rawInput: unknown, ctx: AuthContext): Promise<IUser> {
    const data = createUserSchema.parse(rawInput);

    const existing = await userRepository.findByEmail(data.email);
    if (existing) throw new ValidationError('A user with this email already exists');

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    const user = await userRepository.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      passwordHash,
      role: data.role,
      schoolId: ctx.schoolId,
      createdBy: ctx.userId,
    });

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'user.created',
      resource: 'users',
      resourceId: user._id.toString(),
      details: { email: data.email, role: data.role },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return user;
  },

  async updateUser(id: string, rawInput: unknown, ctx: AuthContext): Promise<IUser> {
    const data = updateUserSchema.parse(rawInput);

    const updateData: Partial<IUser> & { password?: string } = { ...data };
    delete updateData.password;

    if (data.password) {
      (updateData as Record<string, unknown>).passwordHash = await bcrypt.hash(
        data.password,
        SALT_ROUNDS
      );
    }

    updateData.updatedBy = ctx.userId;

    const user = await userRepository.update(id, ctx.schoolId, updateData);
    if (!user) throw new NotFoundError('User');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'user.updated',
      resource: 'users',
      resourceId: id,
      details: { fields: Object.keys(data) },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return user;
  },

  async changeStatus(id: string, rawInput: unknown, ctx: AuthContext): Promise<IUser> {
    if (id === ctx.userId) throw new ValidationError('You cannot change your own status');

    const { status } = statusChangeSchema.parse(rawInput);
    const user = await userRepository.update(id, ctx.schoolId, {
      status,
      updatedBy: ctx.userId,
    });
    if (!user) throw new NotFoundError('User');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'user.status_changed',
      resource: 'users',
      resourceId: id,
      details: { status },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return user;
  },

  async deleteUser(id: string, ctx: AuthContext): Promise<void> {
    if (id === ctx.userId) throw new ValidationError('You cannot delete your own account');
    const deleted = await userRepository.softDelete(id, ctx.schoolId);
    if (!deleted) throw new NotFoundError('User');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'user.deleted',
      resource: 'users',
      resourceId: id,
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });
  },

  getRoles(): { id: UserRole; label: string; description: string; permissions: Permission[] }[] {
    return (Object.keys(ROLE_META) as UserRole[]).map((role) => ({
      id: role,
      ...ROLE_META[role],
      permissions: [...ROLE_PERMISSIONS[role]] as Permission[],
    }));
  },

  getPermissions(): { id: Permission; label: string; category: string }[] {
    return (Object.keys(PERMISSION_META) as Permission[]).map((permission) => ({
      id: permission,
      ...PERMISSION_META[permission],
    }));
  },
};
