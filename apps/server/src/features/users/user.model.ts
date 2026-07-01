import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'admin' | 'reception' | 'teacher' | 'accountant';
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  tokenVersion: number;
  avatarUrl?: string;
  lastLoginAt?: Date;
  schoolId: string;
  deletedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'reception', 'teacher', 'accountant'], required: true },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
    tokenVersion: { type: Number, default: 0 },
    avatarUrl: { type: String },
    lastLoginAt: { type: Date },
    schoolId: { type: String, required: true, index: true },
    deletedAt: { type: Date },
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true, versionKey: false }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ schoolId: 1, status: 1 });
userSchema.index({ schoolId: 1, role: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
