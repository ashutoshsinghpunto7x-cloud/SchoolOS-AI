import mongoose, { Document, Schema } from 'mongoose';

// ── Enums ─────────────────────────────────────────────────────────────────────

export type FeeHead =
  | 'tuition'
  | 'admission'
  | 'examination'
  | 'transport'
  | 'hostel'
  | 'miscellaneous';

// Extension point: add 'library' | 'sports' | 'lab' | 'uniform' without migration
// via customHead field on miscellaneous records.

export type FeeStatus =
  | 'pending'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'waived';

export type PaymentMode =
  | 'cash'
  | 'cheque'
  | 'bank_transfer'
  | 'online'
  | 'demand_draft';

// Extension point: add 'upi' | 'gateway_razorpay' | 'gateway_paytm' for online payments.

// ── Document Interface ────────────────────────────────────────────────────────

export interface IFeeRecord extends Document {
  // Student context (denormalized for performant search without joins)
  studentId: string;
  studentName: string;
  admissionNumber: string;
  class: string;
  section: string;
  schoolId: string;

  // Fee definition
  feeHead: FeeHead;
  customHead?: string;        // custom label when feeHead = 'miscellaneous'
  description?: string;       // e.g., "April 2024 Tuition Fee"
  academicYear: string;       // e.g., "2024-25"
  month?: string;             // e.g., "April" (optional, for monthly fees)

  // Amounts (all in rupees, 2 decimal precision enforced at validation)
  totalAmount: number;        // gross amount charged
  discountAmount: number;     // scholarship / concession (default 0)
  discountReason?: string;
  waivedAmount: number;       // amount formally waived (default 0)
  waivedReason?: string;
  fineAmount: number;         // late fine added on top of totalAmount (default 0)
  fineReason?: string;
  paidAmount: number;         // sum of all successful payments
  balance: number;            // totalAmount + fineAmount - discountAmount - waivedAmount - paidAmount

  // Lifecycle
  dueDate: Date;
  status: FeeStatus;

  // Internal staff notes
  notes?: string;

  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;

  // Audit
  createdBy: string;
  updatedBy?: string;

  // Extension points (future: installment plan, parent portal, gateway ref)
  metadata?: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const FEE_HEADS: FeeHead[] = [
  'tuition', 'admission', 'examination', 'transport', 'hostel', 'miscellaneous',
];

const FEE_STATUSES: FeeStatus[] = [
  'pending', 'partially_paid', 'paid', 'overdue', 'waived',
];

const feeRecordSchema = new Schema<IFeeRecord>(
  {
    studentId:       { type: String, required: true },
    studentName:     { type: String, required: true, trim: true },
    admissionNumber: { type: String, required: true, trim: true },
    class:           { type: String, required: true, trim: true },
    section:         { type: String, required: true, trim: true },
    schoolId:        { type: String, required: true, default: 'school_001' },

    feeHead:         { type: String, enum: FEE_HEADS, required: true },
    customHead:      { type: String, trim: true },
    description:     { type: String, trim: true, maxlength: 500 },
    academicYear:    { type: String, required: true, trim: true },
    month:           { type: String, trim: true },

    totalAmount:     { type: Number, required: true, min: 0 },
    discountAmount:  { type: Number, default: 0, min: 0 },
    discountReason:  { type: String, trim: true },
    waivedAmount:    { type: Number, default: 0, min: 0 },
    waivedReason:    { type: String, trim: true },
    fineAmount:      { type: Number, default: 0, min: 0 },
    fineReason:      { type: String, trim: true },
    paidAmount:      { type: Number, default: 0, min: 0 },
    balance:         { type: Number, required: true, min: 0 },

    dueDate:         { type: Date, required: true },
    status:          { type: String, enum: FEE_STATUSES, default: 'pending' },

    notes:           { type: String, trim: true, maxlength: 2000 },

    isDeleted:       { type: Boolean, default: false },
    deletedAt:       { type: Date },
    deletedBy:       { type: String },

    createdBy:       { type: String, required: true },
    updatedBy:       { type: String },

    metadata:        { type: Schema.Types.Mixed },
  },
  { timestamps: true, versionKey: false }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

feeRecordSchema.index({ schoolId: 1, isDeleted: 1, createdAt: -1 });
feeRecordSchema.index({ schoolId: 1, isDeleted: 1, studentId: 1 });
feeRecordSchema.index({ schoolId: 1, isDeleted: 1, status: 1 });
feeRecordSchema.index({ schoolId: 1, isDeleted: 1, dueDate: 1, status: 1 }); // outstanding queries
feeRecordSchema.index({ schoolId: 1, isDeleted: 1, class: 1, section: 1 });
feeRecordSchema.index({ schoolId: 1, isDeleted: 1, feeHead: 1 });
feeRecordSchema.index({ schoolId: 1, isDeleted: 1, academicYear: 1 });
// Text search across denormalized fields
feeRecordSchema.index({ studentName: 'text', admissionNumber: 'text', description: 'text' });

export const FeeRecord = mongoose.model<IFeeRecord>('FeeRecord', feeRecordSchema);
