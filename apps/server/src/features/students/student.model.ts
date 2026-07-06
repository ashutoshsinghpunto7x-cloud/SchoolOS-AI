import mongoose, { Document, Schema } from 'mongoose';

// ── Enums ─────────────────────────────────────────────────────────────────────

/**
 * Full student lifecycle.
 * Legacy values (inquiry, enrolled, withdrawn) kept for backward compatibility.
 */
export type AdmissionStatus =
  | 'enquiry'
  | 'application'
  | 'admission_pending'
  | 'active'
  | 'transferred'
  | 'graduated'
  | 'inactive'
  | 'inquiry'     // legacy → enquiry
  | 'enrolled'    // legacy → active
  | 'withdrawn';  // legacy → inactive

export type Gender = 'male' | 'female' | 'other';

// ── Sub-document interfaces ───────────────────────────────────────────────────

export interface IEmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

// ── Document Interface ────────────────────────────────────────────────────────

export interface IStudent extends Document {
  fullName: string;
  admissionNumber: string;
  rollNumber?: string;
  class: string;
  section: string;
  gender?: Gender;
  dateOfBirth?: Date;
  fatherName?: string;
  motherName?: string;
  parentPhone?: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  emergencyContact?: IEmergencyContact;
  admissionStatus: AdmissionStatus;
  admissionYear: number;
  tags: string[];
  remarks?: string;
  /** Recurring monthly tuition fee amount set by admin — drives auto-generated tuition FeeRecords. */
  monthlyTuitionFee?: number;
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

const studentSchema = new Schema<IStudent>(
  {
    fullName: { type: String, required: true, trim: true },
    admissionNumber: { type: String, required: true, unique: true, trim: true },
    rollNumber: { type: String, trim: true },
    class: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    dateOfBirth: { type: Date },
    fatherName: { type: String, trim: true },
    motherName: { type: String, trim: true },
    parentPhone: { type: String, trim: true },
    alternatePhone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    emergencyContact: { type: emergencyContactSchema },
    admissionStatus: {
      type: String,
      enum: ['enquiry', 'application', 'admission_pending', 'active', 'transferred', 'graduated', 'inactive', 'inquiry', 'enrolled', 'withdrawn'],
      default: 'active',
    },
    admissionYear: { type: Number, required: true },
    tags: { type: [String], default: [] },
    remarks: { type: String, trim: true },
    monthlyTuitionFee: { type: Number, min: 0 },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String },
    createdBy: { type: String },
    updatedBy: { type: String },
    schoolId: { type: String, required: true, default: 'school_001' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

studentSchema.index({ schoolId: 1, isDeleted: 1, createdAt: -1 });
studentSchema.index({ schoolId: 1, isDeleted: 1, admissionStatus: 1 });
studentSchema.index({ schoolId: 1, isDeleted: 1, class: 1, section: 1 });
studentSchema.index({ schoolId: 1, isDeleted: 1, admissionYear: 1 });
studentSchema.index({ schoolId: 1, isDeleted: 1, gender: 1 });
studentSchema.index({ parentPhone: 1 });
studentSchema.index({ schoolId: 1, isDeleted: 1, class: 1, section: 1, rollNumber: 1 });
// Text index for full-text search
studentSchema.index({
  fullName: 'text',
  admissionNumber: 'text',
  rollNumber: 'text',
  fatherName: 'text',
  motherName: 'text',
  parentPhone: 'text',
});

export const Student = mongoose.model<IStudent>('Student', studentSchema);
