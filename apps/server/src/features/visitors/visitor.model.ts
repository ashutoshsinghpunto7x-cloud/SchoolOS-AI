import mongoose, { Document, Schema } from 'mongoose';

// ── Enums ─────────────────────────────────────────────────────────────────────

export type VisitorPurpose =
  | 'meet_student'
  | 'meet_staff'
  | 'admission_enquiry'
  | 'fee_payment'
  | 'delivery'
  | 'vendor'
  | 'interview'
  | 'other';

// ── Document Interface ────────────────────────────────────────────────────────

export interface IVisitor extends Document {
  schoolId: string;
  // Visitor details
  name: string;
  contactNumber: string;
  purpose: VisitorPurpose;
  purposeNote?: string;
  // Who they came to see
  personToVisit: string;
  // Visit window
  checkInTime: Date;
  checkOutTime?: Date;
  // Front-desk staff who logged the entry
  recordedById: string;
  recordedByName: string;
  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const VISITOR_PURPOSES: VisitorPurpose[] = [
  'meet_student', 'meet_staff', 'admission_enquiry', 'fee_payment',
  'delivery', 'vendor', 'interview', 'other',
];

const visitorSchema = new Schema<IVisitor>(
  {
    schoolId:       { type: String, required: true, index: true },
    name:           { type: String, required: true, trim: true, maxlength: 100 },
    contactNumber:  { type: String, required: true, trim: true },
    purpose:        { type: String, enum: VISITOR_PURPOSES, required: true },
    purposeNote:    { type: String, trim: true, maxlength: 500 },
    personToVisit:  { type: String, required: true, trim: true, maxlength: 100 },
    checkInTime:    { type: Date, required: true },
    checkOutTime:   { type: Date },
    recordedById:   { type: String, required: true },
    recordedByName: { type: String, required: true },
    isDeleted:      { type: Boolean, default: false, index: true },
    deletedAt:      { type: Date },
    deletedBy:      { type: String },
  },
  { timestamps: true, versionKey: false }
);

// Primary query: today's visitor log for a school, most recent first
visitorSchema.index({ schoolId: 1, isDeleted: 1, checkInTime: -1 });
// Currently-on-campus visitors (no checkout yet)
visitorSchema.index({ schoolId: 1, isDeleted: 1, checkOutTime: 1 });

export const Visitor = mongoose.model<IVisitor>('Visitor', visitorSchema);
