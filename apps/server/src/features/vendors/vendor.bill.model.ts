import mongoose, { Document, Schema } from 'mongoose';
import type { VendorCategory } from './vendor.model';

// ── Enums ─────────────────────────────────────────────────────────────────────

export type VendorBillStatus = 'unpaid' | 'partially_paid' | 'paid';

// ── Document Interface ────────────────────────────────────────────────────────

export interface IVendorBill extends Document {
  schoolId: string;

  vendorId: string;
  vendorName: string;   // denormalized for list display without a join

  billNumber?: string;  // the vendor's own invoice/bill number
  description: string;
  category: VendorCategory;

  amount: number;
  paidAmount: number;
  balance: number;      // amount - paidAmount, maintained by the service on each payment

  billDate: Date;
  dueDate?: Date;
  status: VendorBillStatus;

  notes?: string;

  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;

  createdBy: string;
  updatedBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const VENDOR_BILL_STATUSES: VendorBillStatus[] = ['unpaid', 'partially_paid', 'paid'];

const vendorBillSchema = new Schema<IVendorBill>(
  {
    schoolId: { type: String, required: true, default: 'DEMO_SCHOOL' },

    vendorId:   { type: String, required: true },
    vendorName: { type: String, required: true, trim: true },

    billNumber:  { type: String, trim: true, maxlength: 100 },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    category:    { type: String, required: true },

    amount:     { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    balance:    { type: Number, required: true, min: 0 },

    billDate: { type: Date, required: true },
    dueDate:  { type: Date },
    status:   { type: String, enum: VENDOR_BILL_STATUSES, default: 'unpaid' },

    notes: { type: String, trim: true, maxlength: 1000 },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String },

    createdBy: { type: String, required: true },
    updatedBy: { type: String },
  },
  { timestamps: true, versionKey: false },
);

// ── Indexes ───────────────────────────────────────────────────────────────────

vendorBillSchema.index({ schoolId: 1, isDeleted: 1, vendorId: 1, createdAt: -1 });
vendorBillSchema.index({ schoolId: 1, isDeleted: 1, status: 1 });
vendorBillSchema.index({ schoolId: 1, isDeleted: 1, billDate: -1 });
vendorBillSchema.index({ schoolId: 1, isDeleted: 1, dueDate: 1, status: 1 }); // overdue queries

export const VendorBill = mongoose.model<IVendorBill>('VendorBill', vendorBillSchema);
