import mongoose, { Document, Schema } from 'mongoose';

// ── Enums ─────────────────────────────────────────────────────────────────────

export type StockMovementType = 'added' | 'issued' | 'returned' | 'damaged' | 'lost';
export type StockMovementRefType = 'po_receipt' | 'requisition' | 'adjustment';

// ── Document Interface ────────────────────────────────────────────────────────
// Append-only ledger, matching how vendor.payment.model.ts is never mutated
// once created — a correction is a new movement, not an edit to an old one.

export interface IStockMovement extends Document {
  schoolId: string;

  itemId: string;
  itemName: string;   // denormalized for list display without a join
  type: StockMovementType;

  qty: number;
  balanceAfter: number;

  refType: StockMovementRefType;
  refId?: string;

  issuedTo?: string;  // ref → Employee, for 'issued' movements
  recordedBy: string;
  note?: string;

  createdAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const STOCK_MOVEMENT_TYPES: StockMovementType[] = ['added', 'issued', 'returned', 'damaged', 'lost'];
const STOCK_MOVEMENT_REF_TYPES: StockMovementRefType[] = ['po_receipt', 'requisition', 'adjustment'];

const stockMovementSchema = new Schema<IStockMovement>(
  {
    schoolId: { type: String, required: true, default: 'DEMO_SCHOOL' },

    itemId:   { type: String, required: true },
    itemName: { type: String, required: true, trim: true },
    type:     { type: String, enum: STOCK_MOVEMENT_TYPES, required: true },

    qty:          { type: Number, required: true },
    balanceAfter: { type: Number, required: true, min: 0 },

    refType: { type: String, enum: STOCK_MOVEMENT_REF_TYPES, required: true },
    refId:   { type: String },

    issuedTo:   { type: String },
    recordedBy: { type: String, required: true },
    note:       { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

// ── Indexes ───────────────────────────────────────────────────────────────────

stockMovementSchema.index({ schoolId: 1, itemId: 1, createdAt: -1 });
stockMovementSchema.index({ schoolId: 1, type: 1, createdAt: -1 });

export const StockMovement = mongoose.model<IStockMovement>('StockMovement', stockMovementSchema);
