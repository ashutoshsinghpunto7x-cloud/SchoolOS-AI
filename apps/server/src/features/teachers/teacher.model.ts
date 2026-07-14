import mongoose, { Document, Schema } from 'mongoose';

// ── Enums ─────────────────────────────────────────────────────────────────────

export type EmploymentStatus =
  | 'applicant'
  | 'active'
  | 'on_leave'
  | 'suspended'
  | 'resigned'
  | 'retired'
  | 'inactive';

export type TeacherGender = 'male' | 'female' | 'other';

// ── Sub-document interfaces ───────────────────────────────────────────────────

export interface IEmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface IQualification {
  degree: string;
  institution: string;
  yearOfPassing?: number;
}

// ── Document Interface ────────────────────────────────────────────────────────

export interface ITeacher extends Document {
  // Personal
  fullName: string;
  gender: TeacherGender;
  dateOfBirth?: Date;
  // Identity
  employeeId: string;
  photoUrl?: string;
  // Contact
  phone: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  emergencyContact?: IEmergencyContact;
  // Professional
  department?: string;
  subjects: string[];
  assignedClasses: string[];          // e.g. ['10A', '11B']
  qualification?: IQualification;
  experienceYears?: number;
  joiningDate?: Date;
  // Lifecycle
  employmentStatus: EmploymentStatus;
  // Meta
  tags: string[];
  remarks?: string;
  /** Arbitrary extra columns from an import file that don't map to a known field
   * (e.g. Blood Group, Previous School, Aadhar Number) — kept instead of dropped. */
  customFields?: Record<string, unknown>;
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

const emergencyContactSchema = new Schema<IEmergencyContact>(
  { name: { type: String, trim: true }, phone: { type: String, trim: true }, relation: { type: String, trim: true } },
  { _id: false }
);

const qualificationSchema = new Schema<IQualification>(
  {
    degree: { type: String, trim: true },
    institution: { type: String, trim: true },
    yearOfPassing: { type: Number },
  },
  { _id: false }
);

const EMPLOYMENT_STATUSES: EmploymentStatus[] = [
  'applicant', 'active', 'on_leave', 'suspended', 'resigned', 'retired', 'inactive',
];

const teacherSchema = new Schema<ITeacher>(
  {
    fullName:        { type: String, required: true, trim: true },
    gender:          { type: String, enum: ['male', 'female', 'other'], required: true },
    dateOfBirth:     { type: Date },
    employeeId:      { type: String, required: true, trim: true },
    photoUrl:        { type: String },
    phone:           { type: String, required: true, trim: true },
    alternatePhone:  { type: String, trim: true },
    email:           { type: String, trim: true, lowercase: true },
    address:         { type: String, trim: true },
    emergencyContact:{ type: emergencyContactSchema },
    department:      { type: String, trim: true },
    subjects:        { type: [String], default: [] },
    assignedClasses: { type: [String], default: [] },
    qualification:   { type: qualificationSchema },
    experienceYears: { type: Number, min: 0 },
    joiningDate:     { type: Date },
    employmentStatus:{ type: String, enum: EMPLOYMENT_STATUSES, default: 'applicant' },
    tags:            { type: [String], default: [] },
    remarks:         { type: String, trim: true },
    customFields:    { type: Schema.Types.Mixed },
    isDeleted:       { type: Boolean, default: false },
    deletedAt:       { type: Date },
    deletedBy:       { type: String },
    createdBy:       { type: String },
    updatedBy:       { type: String },
    schoolId:        { type: String, required: true, default: 'DEMO_SCHOOL' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// Scoped to active (non-deleted) records only, matching Student/Attendance —
// so a soft-deleted teacher never blocks reuse of its employee ID.
teacherSchema.index(
  { schoolId: 1, employeeId: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

teacherSchema.index({ schoolId: 1, isDeleted: 1, createdAt: -1 });
teacherSchema.index({ schoolId: 1, isDeleted: 1, employmentStatus: 1 });
teacherSchema.index({ schoolId: 1, isDeleted: 1, department: 1 });
teacherSchema.index({ schoolId: 1, isDeleted: 1, subjects: 1 });
teacherSchema.index({ schoolId: 1, isDeleted: 1, assignedClasses: 1 });
teacherSchema.index({ phone: 1 });
teacherSchema.index({ schoolId: 1, email: 1 });
teacherSchema.index({
  fullName: 'text',
  employeeId: 'text',
  email: 'text',
  phone: 'text',
  department: 'text',
  subjects: 'text',
});

export const Teacher = mongoose.model<ITeacher>('Teacher', teacherSchema);
