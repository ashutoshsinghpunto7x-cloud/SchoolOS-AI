import mongoose, { Document, Schema } from 'mongoose';
import type { PaymentMode } from './fee.model';

// ── Document Interface ────────────────────────────────────────────────────────

export interface IFeePayment extends Document {
  feeRecordId: string;
  studentId: string;
  schoolId: string;

  amount: number;
  paymentDate: Date;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  remarks?: string;

  recordedById: string;
  recordedByName: string;

  // Future: auto-generated receipt / gateway integration
  receiptNumber?: string;
  /** Shared bill number across all months paid together in one multi-month collection. */
  batchId?: string;
  metadata?: Record<string, unknown>;

  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const PAYMENT_MODES: PaymentMode[] = [
  'cash', 'cheque', 'bank_transfer', 'online', 'demand_draft',
];

const feePaymentSchema = new Schema<IFeePayment>(
  {
    feeRecordId:    { type: String, required: true },
    studentId:      { type: String, required: true },
    schoolId:       { type: String, required: true },

    amount:         { type: Number, required: true, min: 0.01 },
    paymentDate:    { type: Date, required: true },
    paymentMode:    { type: String, enum: PAYMENT_MODES, required: true },
    referenceNumber:{ type: String, trim: true },
    remarks:        { type: String, trim: true, maxlength: 500 },

    recordedById:   { type: String, required: true },
    recordedByName: { type: String, required: true },

    receiptNumber:  { type: String, trim: true },
    batchId:        { type: String, trim: true },
    metadata:       { type: Schema.Types.Mixed },

    isDeleted:      { type: Boolean, default: false },
    deletedAt:      { type: Date },
    deletedBy:      { type: String },
  },
  { timestamps: true, versionKey: false }
);

feePaymentSchema.index({ feeRecordId: 1, isDeleted: 1, createdAt: -1 });
feePaymentSchema.index({ schoolId: 1, studentId: 1, isDeleted: 1, createdAt: -1 });
feePaymentSchema.index({ schoolId: 1, isDeleted: 1, paymentDate: -1 });
feePaymentSchema.index({ schoolId: 1, receiptNumber: 1 }, { unique: true, sparse: true });
feePaymentSchema.index({ schoolId: 1, batchId: 1 });

export const FeePayment = mongoose.model<IFeePayment>('FeePayment', feePaymentSchema);
