import mongoose, { Document, Schema } from 'mongoose';

// ── Enums ─────────────────────────────────────────────────────────────────────

export type InventoryCategory =
  | 'stationery'
  | 'furniture'
  | 'it_equipment'
  | 'sports_equipment'
  | 'electrical'
  | 'lab_equipment'
  | 'cleaning_materials'
  | 'consumables'
  | 'other';

// ── Document Interface ────────────────────────────────────────────────────────

export interface IInventoryItem extends Document {
  schoolId: string;

  sku: string;
  itemName: string;
  category: InventoryCategory;

  qtyAvailable: number;
  minStockLevel: number;
  unitPrice?: number;

  preferredVendorId?: string;
  storageLocation?: string;

  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;

  createdBy: string;
  updatedBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

export const INVENTORY_CATEGORIES: InventoryCategory[] = [
  'stationery', 'furniture', 'it_equipment', 'sports_equipment', 'electrical',
  'lab_equipment', 'cleaning_materials', 'consumables', 'other',
];

const inventoryItemSchema = new Schema<IInventoryItem>(
  {
    schoolId: { type: String, required: true, default: 'DEMO_SCHOOL' },

    sku:      { type: String, required: true, trim: true, uppercase: true, maxlength: 60 },
    itemName: { type: String, required: true, trim: true, maxlength: 200 },
    category: { type: String, enum: INVENTORY_CATEGORIES, required: true },

    qtyAvailable:  { type: Number, required: true, default: 0, min: 0 },
    minStockLevel: { type: Number, required: true, default: 0, min: 0 },
    unitPrice:     { type: Number, min: 0 },

    preferredVendorId: { type: String },
    storageLocation:   { type: String, trim: true, maxlength: 200 },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String },

    createdBy: { type: String, required: true },
    updatedBy: { type: String },
  },
  { timestamps: true, versionKey: false },
);

// ── Indexes ───────────────────────────────────────────────────────────────────

inventoryItemSchema.index({ schoolId: 1, sku: 1 }, { unique: true });
inventoryItemSchema.index({ schoolId: 1, isDeleted: 1, category: 1 });
// Low-stock scans compare qtyAvailable to minStockLevel per document — no single
// index can express that cross-field comparison, so this just narrows the scan.
inventoryItemSchema.index({ schoolId: 1, isDeleted: 1, qtyAvailable: 1 });

export const InventoryItem = mongoose.model<IInventoryItem>('InventoryItem', inventoryItemSchema);
