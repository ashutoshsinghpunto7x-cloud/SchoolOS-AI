import mongoose, { Document, Schema } from 'mongoose';
import type { PaymentMode } from '../fees/fee.model';

// ── Enums ─────────────────────────────────────────────────────────────────────

export type SalaryStatus = 'scheduled' | 'pending' | 'paid';
export type SecurityDepositMode = 'one_time' | 'installments';
export type SecurityDepositStatus = 'not_collected' | 'in_progress' | 'collected';

// ── Sub-documents ─────────────────────────────────────────────────────────────

export interface ISecurityDepositEntry {
  amount: number;
  date: Date;
  note?: string;
  recordedBy: string;
}

export interface ISecurityDepositInfo {
  totalAmount: number;
  mode: SecurityDepositMode;
  installmentCount?: number;
  collectedAmount: number;
  status: SecurityDepositStatus;
  history: ISecurityDepositEntry[];
}

const securityDepositEntrySchema = new Schema<ISecurityDepositEntry>(
  {
    amount:     { type: Number, required: true, min: 0 },
    date:       { type: Date, required: true },
    note:       { type: String, trim: true, maxlength: 500 },
    recordedBy: { type: String, required: true },
  },
  { _id: false },
);

const securityDepositSchema = new Schema<ISecurityDepositInfo>(
  {
    totalAmount:      { type: Number, required: true, min: 0 },
    mode:             { type: String, enum: ['one_time', 'installments'], required: true },
    installmentCount: { type: Number, min: 1 },
    collectedAmount:  { type: Number, default: 0, min: 0 },
    status:           { type: String, enum: ['not_collected', 'in_progress', 'collected'], default: 'not_collected' },
    history:          { type: [securityDepositEntrySchema], default: [] },
  },
  { _id: false },
);

// ── Document Interface ────────────────────────────────────────────────────────

export interface ISalaryRecord extends Document {
  schoolId: string;

  // Employee identity — free text so non-teaching staff (accountant, driver,
  // peon) can be paid without a dedicated HR/staff profile module.
  employeeName: string;
  designation: string;
  teacherId?: string; // optional link when the payee happens to be a Teacher

  month: string;   // e.g. "April"
  year: number;    // e.g. 2026
  amount: number;
  /** Salary flips from 'scheduled' to 'pending' automatically once this date passes. */
  dueDate: Date;

  status: SalaryStatus;
  paidDate?: Date;
  paymentMode?: PaymentMode;

  notes?: string;

  /** Leave-without-pay days for this month, entered manually by the accountant. */
  lwpDays?: number;
  /** Rupee amount to deduct for those LWP days. */
  lwpAmount?: number;

  securityDeposit?: ISecurityDepositInfo;

  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;

  createdBy: string;
  updatedBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const SALARY_STATUSES: SalaryStatus[] = ['scheduled', 'pending', 'paid'];

const salaryRecordSchema = new Schema<ISalaryRecord>(
  {
    schoolId:     { type: String, required: true, default: 'DEMO_SCHOOL' },

    employeeName: { type: String, required: true, trim: true },
    designation:  { type: String, required: true, trim: true },
    teacherId:    { type: String },

    month:        { type: String, required: true, trim: true },
    year:         { type: Number, required: true },
    amount:       { type: Number, required: true, min: 0 },
    dueDate:      { type: Date, required: true },

    status:       { type: String, enum: SALARY_STATUSES, default: 'scheduled' },
    paidDate:     { type: Date },
    paymentMode:  { type: String, enum: ['cash', 'cheque', 'bank_transfer', 'online', 'demand_draft'] },

    notes:        { type: String, trim: true, maxlength: 1000 },

    lwpDays:      { type: Number, min: 0 },
    lwpAmount:    { type: Number, min: 0 },

    securityDeposit: { type: securityDepositSchema },

    isDeleted:    { type: Boolean, default: false },
    deletedAt:    { type: Date },
    deletedBy:    { type: String },

    createdBy:    { type: String, required: true },
    updatedBy:    { type: String },
  },
  { timestamps: true, versionKey: false },
);

// ── Indexes ───────────────────────────────────────────────────────────────────

salaryRecordSchema.index({ schoolId: 1, isDeleted: 1, createdAt: -1 });
salaryRecordSchema.index({ schoolId: 1, isDeleted: 1, status: 1 });
salaryRecordSchema.index({ schoolId: 1, isDeleted: 1, month: 1, year: 1 });
salaryRecordSchema.index({ employeeName: 'text', designation: 'text' });

export const SalaryRecord = mongoose.model<ISalaryRecord>('SalaryRecord', salaryRecordSchema);
