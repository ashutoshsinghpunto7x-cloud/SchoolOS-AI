import mongoose, { Document, Schema } from 'mongoose';

// ── Enums ─────────────────────────────────────────────────────────────────────

export type PurchaseOrderStatus = 'issued' | 'partially_received' | 'received' | 'closed';

// ── Sub-document interfaces ───────────────────────────────────────────────────

export interface IPurchaseOrderLineItem {
  itemName: string;
  inventoryItemId?: string; // ref → InventoryItem, set once matched/created on receiving
  quantity: number;
  unitPrice: number;
  total: number;
  quantityReceived: number;
}

// ── Document Interface ────────────────────────────────────────────────────────

export interface IPurchaseOrder extends Document {
  schoolId: string;

  poNumber: string; // PO-{year}-{seq}

  vendorId: string;
  vendorName: string; // denormalized for list display without a join
  requestIds: string[];

  lineItems: IPurchaseOrderLineItem[];
  totalAmount: number;

  deliveryDate?: Date;
  status: PurchaseOrderStatus;

  /** Set once receiving creates a bill in the existing Vendor Bill system —
   *  Operations tracks fulfilment here, Accountant still owns the money via
   *  that bill (see vendors/vendor.bill.model.ts). */
  vendorBillId?: string;

  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;

  createdBy: string;
  updatedBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const PURCHASE_ORDER_STATUSES: PurchaseOrderStatus[] = ['issued', 'partially_received', 'received', 'closed'];

const purchaseOrderLineItemSchema = new Schema<IPurchaseOrderLineItem>(
  {
    itemName:         { type: String, required: true, trim: true, maxlength: 200 },
    inventoryItemId:  { type: String },
    quantity:         { type: Number, required: true, min: 1 },
    unitPrice:        { type: Number, required: true, min: 0 },
    total:            { type: Number, required: true, min: 0 },
    quantityReceived: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const purchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    schoolId: { type: String, required: true, default: 'DEMO_SCHOOL' },

    poNumber: { type: String, required: true },

    vendorId:   { type: String, required: true },
    vendorName: { type: String, required: true, trim: true },
    requestIds: { type: [String], default: [] },

    lineItems:   { type: [purchaseOrderLineItemSchema], required: true, validate: (v: unknown[]) => v.length > 0 },
    totalAmount: { type: Number, required: true, min: 0 },

    deliveryDate: { type: Date },
    status:       { type: String, enum: PURCHASE_ORDER_STATUSES, default: 'issued' },

    vendorBillId: { type: String },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String },

    createdBy: { type: String, required: true },
    updatedBy: { type: String },
  },
  { timestamps: true, versionKey: false },
);

// ── Indexes ───────────────────────────────────────────────────────────────────

purchaseOrderSchema.index({ schoolId: 1, isDeleted: 1, status: 1, createdAt: -1 });
purchaseOrderSchema.index({ schoolId: 1, poNumber: 1 }, { unique: true });
purchaseOrderSchema.index({ schoolId: 1, isDeleted: 1, vendorId: 1 });

export const PurchaseOrder = mongoose.model<IPurchaseOrder>('PurchaseOrder', purchaseOrderSchema);
