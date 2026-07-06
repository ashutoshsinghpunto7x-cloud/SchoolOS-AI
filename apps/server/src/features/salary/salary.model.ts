import mongoose, { Document, Schema } from 'mongoose';
import type { PaymentMode } from '../fees/fee.model';

// ── Enums ─────────────────────────────────────────────────────────────────────

export type SalaryStatus = 'scheduled' | 'pending' | 'paid';

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
