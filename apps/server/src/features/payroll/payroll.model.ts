import mongoose, { Document, Schema } from 'mongoose';
import type { PaymentMode } from '../fees/fee.model';

// ── Enums ─────────────────────────────────────────────────────────────────────

export type PayrollStatus = 'draft' | 'generated' | 'paid';

// ── Document Interface ────────────────────────────────────────────────────────

export interface IPayrollRecord extends Document {
  employeeObjectId: string; // ref to Employee _id
  employeeId: string;       // human-readable EMP-xxxx
  employeeName: string;
  designation: string;
  department?: string;

  schoolId: string;

  month: number; // 1-12
  year: number;

  // Snapshotted at generation time — never recomputed later even if the
  // employee's salary or the school's payroll config subsequently changes,
  // so past payroll records stay historically accurate.
  workingDaysPerMonth: number;
  dailyRate: number;

  presentDays: number;
  lateDays: number;
  halfDays: number;
  absentDays: number;

  grossSalary: number;
  deductions: number;
  netSalary: number;

  status: PayrollStatus;
  generatedAt: Date;
  paidAt?: Date;
  paidBy?: string;
  paymentMode?: PaymentMode;
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

const PAYROLL_STATUSES: PayrollStatus[] = ['draft', 'generated', 'paid'];

const payrollRecordSchema = new Schema<IPayrollRecord>(
  {
    employeeObjectId: { type: String, required: true },
    employeeId:       { type: String, required: true },
    employeeName:     { type: String, required: true, trim: true },
    designation:      { type: String, required: true, trim: true },
    department:       { type: String, trim: true },

    schoolId:         { type: String, required: true, default: 'DEMO_SCHOOL' },

    month:             { type: Number, required: true, min: 1, max: 12 },
    year:              { type: Number, required: true },

    workingDaysPerMonth: { type: Number, required: true, min: 1, max: 31 },
    dailyRate:           { type: Number, required: true, min: 0 },

    presentDays: { type: Number, required: true, default: 0, min: 0 },
    lateDays:    { type: Number, required: true, default: 0, min: 0 },
    halfDays:    { type: Number, required: true, default: 0, min: 0 },
    absentDays:  { type: Number, required: true, default: 0, min: 0 },

    grossSalary: { type: Number, required: true, min: 0 },
    deductions:  { type: Number, required: true, default: 0, min: 0 },
    netSalary:   { type: Number, required: true, min: 0 },

    status:      { type: String, enum: PAYROLL_STATUSES, default: 'generated' },
    generatedAt: { type: Date, required: true, default: () => new Date() },
    paidAt:      { type: Date },
    paidBy:      { type: String },
    paymentMode: { type: String, enum: ['cash', 'cheque', 'bank_transfer', 'online', 'demand_draft'] },
    notes:       { type: String, trim: true, maxlength: 1000 },

    isDeleted:   { type: Boolean, default: false },
    deletedAt:   { type: Date },
    deletedBy:   { type: String },

    createdBy:   { type: String, required: true },
    updatedBy:   { type: String },
  },
  { timestamps: true, versionKey: false },
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// One payroll record per employee per month — scoped to non-deleted records
// only, matching the pattern in employee.model.ts / teacher.model.ts.
payrollRecordSchema.index(
  { schoolId: 1, employeeObjectId: 1, month: 1, year: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

payrollRecordSchema.index({ schoolId: 1, month: 1, year: 1 });
payrollRecordSchema.index({ schoolId: 1, status: 1 });

export const PayrollRecord = mongoose.model<IPayrollRecord>('PayrollRecord', payrollRecordSchema);
