import mongoose, { Document, Schema } from 'mongoose';

// ── Enums ─────────────────────────────────────────────────────────────────────

export type PurchaseCategory =
  | 'stationery'
  | 'furniture'
  | 'it_equipment'
  | 'lab_equipment'
  | 'cleaning_supplies'
  | 'maintenance_materials'
  | 'other';

export type PurchaseRequestStatus = 'pending' | 'approved' | 'rejected' | 'converted';

// ── Sub-document interfaces ───────────────────────────────────────────────────

export interface IPurchaseRequestItem {
  name: string;
  quantity: number;
  unit: string;
  estimatedCost?: number;
}

// ── Document Interface ────────────────────────────────────────────────────────

export interface IPurchaseRequest extends Document {
  schoolId: string;

  requestNo: string; // PR-{year}-{seq}

  raisedBy: string;       // ref → Employee._id
  raisedByName: string;   // denormalized for list display without a join
  department?: string;

  category: PurchaseCategory;
  items: IPurchaseRequestItem[];
  justification?: string;

  status: PurchaseRequestStatus;
  approvedBy?: string;
  decidedAt?: Date;
  rejectionReason?: string;
  poId?: string;

  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;

  createdBy: string;
  updatedBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

export const PURCHASE_CATEGORIES: PurchaseCategory[] = [
  'stationery', 'furniture', 'it_equipment', 'lab_equipment',
  'cleaning_supplies', 'maintenance_materials', 'other',
];
const PURCHASE_REQUEST_STATUSES: PurchaseRequestStatus[] = ['pending', 'approved', 'rejected', 'converted'];

const purchaseRequestItemSchema = new Schema<IPurchaseRequestItem>(
  {
    name:          { type: String, required: true, trim: true, maxlength: 200 },
    quantity:      { type: Number, required: true, min: 1 },
    unit:          { type: String, required: true, trim: true, maxlength: 30 },
    estimatedCost: { type: Number, min: 0 },
  },
  { _id: false },
);

const purchaseRequestSchema = new Schema<IPurchaseRequest>(
  {
    schoolId: { type: String, required: true, default: 'DEMO_SCHOOL' },

    requestNo: { type: String, required: true },

    raisedBy:     { type: String, required: true },
    raisedByName: { type: String, required: true, trim: true },
    department:   { type: String, trim: true },

    category: { type: String, enum: PURCHASE_CATEGORIES, required: true },
    items: { type: [purchaseRequestItemSchema], required: true, validate: (v: unknown[]) => v.length > 0 },
    justification: { type: String, trim: true, maxlength: 1000 },

    status:           { type: String, enum: PURCHASE_REQUEST_STATUSES, default: 'pending' },
    approvedBy:       { type: String },
    decidedAt:        { type: Date },
    rejectionReason:  { type: String, trim: true, maxlength: 500 },
    poId:             { type: String },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String },

    createdBy: { type: String, required: true },
    updatedBy: { type: String },
  },
  { timestamps: true, versionKey: false },
);

// ── Indexes ───────────────────────────────────────────────────────────────────

purchaseRequestSchema.index({ schoolId: 1, isDeleted: 1, status: 1, createdAt: -1 });
purchaseRequestSchema.index({ schoolId: 1, requestNo: 1 }, { unique: true });

export const PurchaseRequest = mongoose.model<IPurchaseRequest>('PurchaseRequest', purchaseRequestSchema);
