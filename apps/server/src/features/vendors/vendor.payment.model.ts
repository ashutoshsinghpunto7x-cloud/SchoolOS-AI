import mongoose, { Document, Schema } from 'mongoose';
import type { PaymentMode } from '../fees/fee.model';

// ── Document Interface ────────────────────────────────────────────────────────

export interface IVendorPayment extends Document {
  vendorId: string;
  billId?: string;    // omitted for an on-account/advance payment not tied to one bill
  schoolId: string;

  amount: number;
  paymentDate: Date;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  remarks?: string;

  recordedById: string;
  recordedByName: string;

  receiptNumber?: string;
  /** Client-supplied key to make a payment submission safe to retry — a resend
   *  of the same key returns the original payment instead of creating a second one. */
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;

  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const PAYMENT_MODES: PaymentMode[] = ['cash', 'cheque', 'bank_transfer', 'online', 'demand_draft'];

const vendorPaymentSchema = new Schema<IVendorPayment>(
  {
    vendorId: { type: String, required: true },
    billId:   { type: String },
    schoolId: { type: String, required: true },

    amount:          { type: Number, required: true, min: 0.01 },
    paymentDate:     { type: Date, required: true },
    paymentMode:     { type: String, enum: PAYMENT_MODES, required: true },
    referenceNumber: { type: String, trim: true },
    remarks:         { type: String, trim: true, maxlength: 500 },

    recordedById:   { type: String, required: true },
    recordedByName: { type: String, required: true },

    receiptNumber:  { type: String, trim: true },
    idempotencyKey: { type: String, trim: true },
    metadata:       { type: Schema.Types.Mixed },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String },
  },
  { timestamps: true, versionKey: false },
);

vendorPaymentSchema.index({ billId: 1, isDeleted: 1, createdAt: -1 });
vendorPaymentSchema.index({ schoolId: 1, vendorId: 1, isDeleted: 1, createdAt: -1 });
vendorPaymentSchema.index({ schoolId: 1, isDeleted: 1, paymentDate: -1 });
vendorPaymentSchema.index({ schoolId: 1, receiptNumber: 1 }, { unique: true, sparse: true });
vendorPaymentSchema.index({ schoolId: 1, idempotencyKey: 1 }, { unique: true, sparse: true });

export const VendorPayment = mongoose.model<IVendorPayment>('VendorPayment', vendorPaymentSchema);
