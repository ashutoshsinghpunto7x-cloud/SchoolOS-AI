import mongoose, { Document, Schema } from 'mongoose';

// ── Enums ─────────────────────────────────────────────────────────────────────

export type VendorCategory = 'supplies' | 'services' | 'maintenance' | 'utilities' | 'other';

// Extension point: split 'supplies' into 'stationery' | 'food' | 'uniform' later
// without migration — 'other' + notes covers ad-hoc categories for now.

export type VendorStatus = 'active' | 'inactive';

// ── Document Interface ────────────────────────────────────────────────────────

export interface IVendor extends Document {
  schoolId: string;

  name: string;
  category: VendorCategory;
  status: VendorStatus;

  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
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

const VENDOR_CATEGORIES: VendorCategory[] = ['supplies', 'services', 'maintenance', 'utilities', 'other'];
const VENDOR_STATUSES: VendorStatus[] = ['active', 'inactive'];

const vendorSchema = new Schema<IVendor>(
  {
    schoolId: { type: String, required: true, default: 'DEMO_SCHOOL' },

    name:     { type: String, required: true, trim: true, maxlength: 200 },
    category: { type: String, enum: VENDOR_CATEGORIES, required: true },
    status:   { type: String, enum: VENDOR_STATUSES, default: 'active' },

    contactPerson: { type: String, trim: true, maxlength: 200 },
    phone:         { type: String, trim: true, maxlength: 20 },
    email:         { type: String, trim: true, maxlength: 200, lowercase: true },
    address:       { type: String, trim: true, maxlength: 500 },
    gstNumber:     { type: String, trim: true, maxlength: 30 },
    notes:         { type: String, trim: true, maxlength: 1000 },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String },

    createdBy: { type: String, required: true },
    updatedBy: { type: String },
  },
  { timestamps: true, versionKey: false },
);

// ── Indexes ───────────────────────────────────────────────────────────────────

vendorSchema.index({ schoolId: 1, isDeleted: 1, createdAt: -1 });
vendorSchema.index({ schoolId: 1, isDeleted: 1, status: 1 });
vendorSchema.index({ schoolId: 1, isDeleted: 1, category: 1 });
vendorSchema.index({ name: 'text' });

export const Vendor = mongoose.model<IVendor>('Vendor', vendorSchema);
