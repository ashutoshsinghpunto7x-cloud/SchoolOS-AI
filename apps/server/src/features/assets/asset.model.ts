import mongoose, { Document, Schema } from 'mongoose';

// ── Enums ─────────────────────────────────────────────────────────────────────

export type AssetCategory =
  | 'computers' | 'printers' | 'projectors' | 'ac_units' | 'desks' | 'smart_boards' | 'vehicles' | 'other';

export type AssetStatus = 'active' | 'under_repair' | 'disposed';

// ── Document Interface ────────────────────────────────────────────────────────

export interface IAsset extends Document {
  schoolId: string;

  assetId: string; // AST-{CATEGORY_PREFIX}-{seq}
  name: string;
  category: AssetCategory;

  purchaseDate?: Date;
  purchaseCost?: number;
  vendorId?: string;

  warrantyExpiry?: Date;
  amcExpiry?: Date;

  location: string;
  assignedTo?: string; // ref → Employee, optional

  status: AssetStatus;

  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;

  createdBy: string;
  updatedBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

export const ASSET_CATEGORIES: AssetCategory[] = [
  'computers', 'printers', 'projectors', 'ac_units', 'desks', 'smart_boards', 'vehicles', 'other',
];
const ASSET_STATUSES: AssetStatus[] = ['active', 'under_repair', 'disposed'];

const assetSchema = new Schema<IAsset>(
  {
    schoolId: { type: String, required: true, default: 'DEMO_SCHOOL' },

    assetId:  { type: String, required: true },
    name:     { type: String, required: true, trim: true, maxlength: 200 },
    category: { type: String, enum: ASSET_CATEGORIES, required: true },

    purchaseDate: { type: Date },
    purchaseCost: { type: Number, min: 0 },
    vendorId:     { type: String },

    warrantyExpiry: { type: Date },
    amcExpiry:      { type: Date },

    location:   { type: String, required: true, trim: true, maxlength: 200 },
    assignedTo: { type: String },

    status: { type: String, enum: ASSET_STATUSES, default: 'active' },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String },

    createdBy: { type: String, required: true },
    updatedBy: { type: String },
  },
  { timestamps: true, versionKey: false },
);

// ── Indexes ───────────────────────────────────────────────────────────────────

assetSchema.index({ schoolId: 1, assetId: 1 }, { unique: true });
assetSchema.index({ schoolId: 1, isDeleted: 1, category: 1 });
assetSchema.index({ schoolId: 1, isDeleted: 1, status: 1 });
// Warranty/AMC-expiring scans (basis for a future alerts phase, but the
// Assets page itself already filters/sorts by these dates today).
assetSchema.index({ schoolId: 1, isDeleted: 1, warrantyExpiry: 1 });

export const Asset = mongoose.model<IAsset>('Asset', assetSchema);
