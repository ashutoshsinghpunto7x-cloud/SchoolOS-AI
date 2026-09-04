import mongoose, { Document, Schema } from 'mongoose';

export type UserRole =
  | 'admin'
  | 'principal'
  // Mirrors 'principal' 1:1 today (same permissions/routes/dashboard) — kept
  // as its own role so it can diverge from principal later without a migration.
  | 'incharge'
  | 'reception'
  | 'teacher'
  | 'accountant'
  // Admin Officer / Operations Manager — see packages/types UserRole for the
  // full rationale (kept distinct from the OPS_ROLES/'ops-center' vocabulary).
  | 'operations_manager'
  // Owns syllabus/calendar/exam setup for the Academic Planning Engine — see
  // packages/types UserRole for the full rationale.
  | 'academic_coordinator'
  | 'parent'
  | 'driver'
  // Internal SchoolOS staff roles — Ops Center access only, not tied to a real school tenant.
  | 'owner'
  | 'super_admin'
  | 'devops'
  | 'developer'
  | 'support';

/** Sentinel schoolId used for internal staff accounts, which have no real tenant. */
export const INTERNAL_SCHOOL_ID = 'INTERNAL';
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  /** Admin-issued alternate login identifier for staff (e.g. teachers) who log in
   *  without using their email — separate from and never replaces email, which
   *  stays the identity used to link a User back to its Teacher/etc. record. */
  username?: string;
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
  /** Feature-flag targeting segments — a school-tenant user (teacher, principal,
   *  etc.) can be flagged as a developer/internal tester without changing their
   *  real role, so real accounts can be used for on-device testing of unfinished
   *  features. Set only via the feature-flags "testers" endpoint. */
  isDeveloper?: boolean;
  isInternalTester?: boolean;
  /** Parent role only — Student._id values this account may view. Set by an
   *  admin/principal when creating or editing the parent account (no
   *  self-serve linking flow yet). Empty/undefined means no linked children,
   *  which the Parent Workspace treats as "nothing to show" rather than an error. */
  linkedStudentIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone: { type: String },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'principal', 'incharge', 'reception', 'teacher', 'accountant', 'operations_manager', 'academic_coordinator', 'parent', 'driver', 'owner', 'super_admin', 'devops', 'developer', 'support'],
      required: true,
    },
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
    isDeveloper: { type: Boolean, default: false },
    isInternalTester: { type: Boolean, default: false },
    linkedStudentIds: { type: [String], default: undefined },
  },
  { timestamps: true, versionKey: false }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true, sparse: true });
userSchema.index({ schoolId: 1, status: 1 });
userSchema.index({ schoolId: 1, role: 1 });
// Used as a join key to link a login account to its Employee/Teacher profile
// (account recovery, employee-teacher linking) — was an unindexed plain string.
userSchema.index({ schoolId: 1, employeeId: 1 }, { sparse: true });

export const User = mongoose.model<IUser>('User', userSchema);
