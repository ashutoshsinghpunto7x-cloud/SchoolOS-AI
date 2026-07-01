import mongoose from 'mongoose';
import { User, IUser, UserRole, UserStatus } from './user.model';

interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: IUser['role'];
  schoolId: string;
  createdBy?: string;
}

export interface FindUsersOptions {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface PaginatedUsers {
  data: IUser[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export const userRepository = {
  async create(data: CreateUserInput): Promise<IUser> {
    return User.create(data);
  },

  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({
      email: email.toLowerCase(),
      deletedAt: { $exists: false },
    });
  },

  async findById(id: string, schoolId: string): Promise<IUser | null> {
    return User.findOne({ _id: id, schoolId, deletedAt: { $exists: false } })
      .select('-passwordHash')
      .lean<IUser>();
  },

  async findByIdForAuth(id: string): Promise<IUser | null> {
    return User.findOne({ _id: id, deletedAt: { $exists: false } });
  },

  async findAll(schoolId: string, options: FindUsersOptions = {}): Promise<PaginatedUsers> {
    const { page = 1, limit = 20, search, role, status } = options;
    const skip = (page - 1) * limit;

    const filter: mongoose.FilterQuery<IUser> = {
      schoolId,
      deletedAt: { $exists: false },
    };

    if (role) filter.role = role;
    if (status) filter.status = status;

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { phone: regex },
      ];
    }

    const [data, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<IUser[]>(),
      User.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  },

  async update(id: string, schoolId: string, data: Partial<IUser>): Promise<IUser | null> {
    return User.findOneAndUpdate(
      { _id: id, schoolId, deletedAt: { $exists: false } },
      { $set: data },
      { new: true }
    )
      .select('-passwordHash')
      .lean<IUser>();
  },

  async softDelete(id: string, schoolId: string): Promise<boolean> {
    const result = await User.updateOne(
      { _id: id, schoolId, deletedAt: { $exists: false } },
      { $set: { deletedAt: new Date(), status: 'inactive' } }
    );
    return result.modifiedCount > 0;
  },

  async incrementTokenVersion(id: string): Promise<void> {
    await User.updateOne({ _id: id }, { $inc: { tokenVersion: 1 } });
  },

  async updateLastLogin(id: string): Promise<void> {
    await User.updateOne({ _id: id }, { $set: { lastLoginAt: new Date() } });
  },

  async countBySchool(schoolId: string): Promise<number> {
    return User.countDocuments({ schoolId, deletedAt: { $exists: false } });
  },
};
