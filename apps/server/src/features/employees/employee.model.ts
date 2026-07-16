import mongoose, { Document, Schema } from 'mongoose';

// ── Enums ─────────────────────────────────────────────────────────────────────

export type EmployeeGender = 'male' | 'female' | 'other';

export type EmployeeRole =
  | 'teacher'
  | 'principal'
  | 'vice_principal'
  | 'receptionist'
  | 'accountant'
  | 'librarian'
  | 'driver'
  | 'peon'
  | 'other';

export type EmploymentType = 'full_time' | 'part_time' | 'contract';

export type EmployeeStatus = 'active' | 'inactive';

export type QrStatus = 'active' | 'expired' | 'disabled';

// ── Sub-document interfaces ───────────────────────────────────────────────────

export interface IEmployeeQr {
  token: string;
  issuedAt: Date;
  status: QrStatus;
}

// ── Document Interface ────────────────────────────────────────────────────────

export interface IEmployee extends Document {
  // Personal
  fullName: string;
  gender: EmployeeGender;
  dateOfBirth?: Date;
  // Identity
  employeeId: string;
  photoUrl?: string;
  signatureUrl?: string;
  // Contact
  phone: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  // Professional
  designation: string;
  department?: string;
  joiningDate?: Date;
  monthlySalary?: number;
  employmentType?: EmploymentType;
  /** HR job-role classification — distinct from the auth UserRole enum. */
  role: EmployeeRole;
  // Links
  teacherId?: string;
  userId?: string;
  // QR / attendance
  qr?: IEmployeeQr;
  // Lifecycle
  status: EmployeeStatus;
  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  // Audit
  createdBy?: string;
  updatedBy?: string;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const employeeQrSchema = new Schema<IEmployeeQr>(
  {
    token: { type: String, required: true },
    issuedAt: { type: Date, required: true },
    status: { type: String, enum: ['active', 'expired', 'disabled'], default: 'active' },
  },
  { _id: false }
);

const EMPLOYEE_ROLES: EmployeeRole[] = [
  'teacher', 'principal', 'vice_principal', 'receptionist',
  'accountant', 'librarian', 'driver', 'peon', 'other',
];

const EMPLOYMENT_TYPES: EmploymentType[] = ['full_time', 'part_time', 'contract'];

const employeeSchema = new Schema<IEmployee>(
  {
    fullName:       { type: String, required: true, trim: true },
    gender:         { type: String, enum: ['male', 'female', 'other'], required: true },
    dateOfBirth:    { type: Date },
    employeeId:     { type: String, required: true, trim: true },
    photoUrl:       { type: String },
    signatureUrl:   { type: String },
    phone:          { type: String, required: true, trim: true },
    alternatePhone: { type: String, trim: true },
    email:          { type: String, trim: true, lowercase: true },
    address:        { type: String, trim: true },
    designation:    { type: String, required: true, trim: true },
    department:     { type: String, trim: true },
    joiningDate:    { type: Date },
    monthlySalary:  { type: Number, min: 0 },
    employmentType: { type: String, enum: EMPLOYMENT_TYPES },
    role:           { type: String, enum: EMPLOYEE_ROLES, required: true },
    teacherId:      { type: String },
    userId:         { type: String },
    qr:             { type: employeeQrSchema },
    status:         { type: String, enum: ['active', 'inactive'], default: 'active' },
    isDeleted:      { type: Boolean, default: false },
    deletedAt:      { type: Date },
    deletedBy:      { type: String },
    createdBy:      { type: String },
    updatedBy:      { type: String },
    schoolId:       { type: String, required: true, default: 'DEMO_SCHOOL' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// Scoped to active (non-deleted) records only — mirrors Teacher's pattern so a
// soft-deleted employee never blocks reuse of its employee ID.
employeeSchema.index(
  { schoolId: 1, employeeId: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

employeeSchema.index({ schoolId: 1, isDeleted: 1, createdAt: -1 });
employeeSchema.index({ schoolId: 1, isDeleted: 1, status: 1 });
employeeSchema.index({ schoolId: 1, isDeleted: 1, role: 1 });
employeeSchema.index({ schoolId: 1, isDeleted: 1, department: 1 });
employeeSchema.index({ phone: 1 });
employeeSchema.index({ schoolId: 1, email: 1 });
employeeSchema.index({ 'qr.token': 1 });
employeeSchema.index({
  fullName: 'text',
  employeeId: 'text',
  email: 'text',
  phone: 'text',
  department: 'text',
  designation: 'text',
});

export const Employee = mongoose.model<IEmployee>('Employee', employeeSchema);
