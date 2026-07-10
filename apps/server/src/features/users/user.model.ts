import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'admin' | 'principal' | 'reception' | 'teacher' | 'accountant';
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
  /** Staff/employee identifier used to verify account-recovery requests — distinct from the Teacher model's employeeId, since not every role (admin/accountant/principal) has a Teacher profile. */
  employeeId?: string;
  pinHash?: string;
  /** Set true when logging in with a temporary password issued by an approved recovery request — forces the password + PIN reset flow before anything else. */
  mustResetPassword?: boolean;
  mustResetPin?: boolean;
  tempPasswordExpiresAt?: Date;
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
    role: { type: String, enum: ['admin', 'principal', 'reception', 'teacher', 'accountant'], required: true },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
    tokenVersion: { type: Number, default: 0 },
    avatarUrl: { type: String },
    lastLoginAt: { type: Date },
    schoolId: { type: String, required: true, index: true },
    deletedAt: { type: Date },
    createdBy: { type: String },
    updatedBy: { type: String },
    employeeId: { type: String, trim: true },
    pinHash: { type: String },
    mustResetPassword: { type: Boolean, default: false },
    mustResetPin: { type: Boolean, default: false },
    tempPasswordExpiresAt: { type: Date },
  },
  { timestamps: true, versionKey: false }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ schoolId: 1, status: 1 });
userSchema.index({ schoolId: 1, role: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
