import mongoose, { Document, Schema } from 'mongoose';

// ── Enums ─────────────────────────────────────────────────────────────────────

export type ExpenseCategory = 'electricity' | 'maintenance' | 'fuel' | 'supplies' | 'other';

// Extension point: split 'supplies' into 'office_supplies' | 'lab_supplies' later
// without migration — 'other' + notes covers ad-hoc categories for now.

export type ExpenseStatus = 'pending' | 'approved';

// ── Document Interface ────────────────────────────────────────────────────────

export interface IExpenseRecord extends Document {
  schoolId: string;

  title: string;
  category: ExpenseCategory;
  amount: number;
  date: Date;
  status: ExpenseStatus;

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

const EXPENSE_CATEGORIES: ExpenseCategory[] = ['electricity', 'maintenance', 'fuel', 'supplies', 'other'];
const EXPENSE_STATUSES: ExpenseStatus[] = ['pending', 'approved'];

const expenseRecordSchema = new Schema<IExpenseRecord>(
  {
    schoolId: { type: String, required: true, default: 'DEMO_SCHOOL' },

    title:    { type: String, required: true, trim: true, maxlength: 200 },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    amount:   { type: Number, required: true, min: 0 },
    date:     { type: Date, required: true },
    status:   { type: String, enum: EXPENSE_STATUSES, default: 'pending' },

    notes:    { type: String, trim: true, maxlength: 1000 },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String },

    createdBy: { type: String, required: true },
    updatedBy: { type: String },
  },
  { timestamps: true, versionKey: false },
);

// ── Indexes ───────────────────────────────────────────────────────────────────

expenseRecordSchema.index({ schoolId: 1, isDeleted: 1, createdAt: -1 });
expenseRecordSchema.index({ schoolId: 1, isDeleted: 1, status: 1 });
expenseRecordSchema.index({ schoolId: 1, isDeleted: 1, category: 1 });
expenseRecordSchema.index({ schoolId: 1, isDeleted: 1, date: -1 });
expenseRecordSchema.index({ title: 'text' });

export const ExpenseRecord = mongoose.model<IExpenseRecord>('ExpenseRecord', expenseRecordSchema);
