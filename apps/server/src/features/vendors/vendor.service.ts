import mongoose from 'mongoose';
import { vendorRepository, PaginatedVendors } from './vendor.repository';
import { vendorBillRepository, PaginatedVendorBills, VendorBillSummary } from './vendor.bill.repository';
import { vendorPaymentRepository } from './vendor.payment.repository';
import { IVendor } from './vendor.model';
import { IVendorBill } from './vendor.bill.model';
import { IVendorPayment } from './vendor.payment.model';
import {
  createVendorSchema,
  updateVendorSchema,
  listVendorsSchema,
  createVendorBillSchema,
  listVendorBillsSchema,
  recordVendorPaymentSchema,
} from './vendor.validation';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';

export interface VendorFinancialSummary {
  totalBilled: number;
  totalPaid: number;
  outstandingBalance: number;
  lastPaymentDate?: string;
}

export interface VendorProfile {
  vendor: IVendor;
  summary: VendorFinancialSummary;
}

export interface VendorLedgerEntry {
  _id: string;
  type: 'bill' | 'payment';
  date: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  reference?: string;
}

export interface VendorLedgerData {
  vendor: IVendor;
  entries: VendorLedgerEntry[];
  summary: VendorFinancialSummary;
}

async function buildSummary(vendorId: string, schoolId: string): Promise<VendorFinancialSummary> {
  const [bills, payments] = await Promise.all([
    vendorBillRepository.findByVendor(vendorId, schoolId),
    vendorPaymentRepository.findByVendor(vendorId, schoolId),
  ]);
  const totalBilled = bills.reduce((sum, b) => sum + b.amount, 0);
  const totalPaid = bills.reduce((sum, b) => sum + b.paidAmount, 0);
  const outstandingBalance = bills.reduce((sum, b) => sum + b.balance, 0);
  const lastPaymentDate = payments[0]?.paymentDate.toISOString();
  return { totalBilled, totalPaid, outstandingBalance, lastPaymentDate };
}

export const vendorService = {
  async createVendor(rawInput: unknown, ctx: AuthContext): Promise<IVendor> {
    const data = createVendorSchema.parse(rawInput);
    const record = await vendorRepository.create({ ...data, schoolId: ctx.schoolId, createdBy: ctx.displayName });

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'vendor.created', resource: 'vendors', resourceId: record._id.toString(),
      details: { name: data.name, category: data.category },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return record;
  },

  async listVendors(rawQuery: unknown, ctx: AuthContext): Promise<PaginatedVendors> {
    const opts = listVendorsSchema.parse(rawQuery);
    return vendorRepository.findAll(ctx.schoolId, opts);
  },

  async getVendorById(id: string, ctx: AuthContext): Promise<IVendor> {
    const record = await vendorRepository.findById(id, ctx.schoolId);
    if (!record) throw new NotFoundError('Vendor');
    return record;
  },

  async getVendorProfile(id: string, ctx: AuthContext): Promise<VendorProfile> {
    const vendor = await vendorRepository.findById(id, ctx.schoolId);
    if (!vendor) throw new NotFoundError('Vendor');
    const summary = await buildSummary(id, ctx.schoolId);
    return { vendor, summary };
  },

  async updateVendor(id: string, rawInput: unknown, ctx: AuthContext): Promise<IVendor> {
    const data = updateVendorSchema.parse(rawInput);
    if (!Object.keys(data).length) throw new ValidationError('No fields to update');

    const existing = await vendorRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Vendor');

    const record = await vendorRepository.update(id, ctx.schoolId, { ...data, updatedBy: ctx.displayName });
    if (!record) throw new NotFoundError('Vendor');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'vendor.updated', resource: 'vendors', resourceId: id,
      details: { fields: Object.keys(data) }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return record;
  },

  async deleteVendor(id: string, ctx: AuthContext): Promise<void> {
    const existing = await vendorRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Vendor');

    const deleted = await vendorRepository.softDelete(id, ctx.schoolId, ctx.displayName);
    if (!deleted) throw new NotFoundError('Vendor');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'vendor.deleted', resource: 'vendors', resourceId: id,
      details: { name: existing.name }, ip: ctx.ip, schoolId: ctx.schoolId,
    });
  },

  async listVendorBills(vendorId: string, rawQuery: unknown, ctx: AuthContext): Promise<PaginatedVendorBills> {
    const vendor = await vendorRepository.findById(vendorId, ctx.schoolId);
    if (!vendor) throw new NotFoundError('Vendor');

    const opts = listVendorBillsSchema.parse(rawQuery);
    const all = await vendorBillRepository.findByVendor(vendorId, ctx.schoolId);
    // Small per-vendor volumes make in-memory pagination fine here; findAll() is used
    // for cross-vendor listing where the repo-level query/pagination pulls its weight.
    const filtered = opts.status ? all.filter((b) => b.status === opts.status) : all;
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 20;
    const start = (page - 1) * limit;
    return { records: filtered.slice(start, start + limit), total: filtered.length, page, limit };
  },

  async recordVendorBill(vendorId: string, rawInput: unknown, ctx: AuthContext): Promise<IVendorBill> {
    const vendor = await vendorRepository.findById(vendorId, ctx.schoolId);
    if (!vendor) throw new NotFoundError('Vendor');

    const data = createVendorBillSchema.parse(rawInput);
    const bill = await vendorBillRepository.create({
      schoolId: ctx.schoolId,
      vendorId,
      vendorName: vendor.name,
      billNumber: data.billNumber,
      description: data.description,
      category: data.category,
      amount: data.amount,
      billDate: new Date(data.billDate),
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      notes: data.notes,
      createdBy: ctx.displayName,
    });

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'vendor_bill.created', resource: 'vendors', resourceId: bill._id.toString(),
      details: { vendorId, vendorName: vendor.name, amount: data.amount, description: data.description },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return bill;
  },

  async recordVendorPayment(
    vendorId: string,
    rawInput: unknown,
    ctx: AuthContext,
  ): Promise<{ payment: IVendorPayment; bill?: IVendorBill }> {
    const vendor = await vendorRepository.findById(vendorId, ctx.schoolId);
    if (!vendor) throw new NotFoundError('Vendor');

    const data = recordVendorPaymentSchema.parse(rawInput);

    // Idempotent replay: a resubmission carrying the same key returns the original
    // payment instead of recording the amount twice.
    if (data.idempotencyKey) {
      const existing = await vendorPaymentRepository.findByIdempotencyKey(ctx.schoolId, data.idempotencyKey);
      if (existing) {
        const bill = existing.billId ? await vendorBillRepository.findById(existing.billId, ctx.schoolId) ?? undefined : undefined;
        return { payment: existing, bill };
      }
    }

    let bill: IVendorBill | null = null;
    if (data.billId) {
      bill = await vendorBillRepository.findById(data.billId, ctx.schoolId);
      if (!bill) throw new NotFoundError('Vendor bill');
      if (bill.status === 'paid') throw new ValidationError('This bill is already fully paid');
      if (data.amount > bill.balance + 0.01) {
        throw new ValidationError(
          `Payment amount (₹${data.amount}) exceeds outstanding balance (₹${bill.balance.toFixed(2)})`,
        );
      }
    }

    // Payment creation + bill balance update happen atomically — mirrors fee.service.ts's
    // recordPayment, so a crash mid-write never leaves a payment on record with no matching
    // balance/status change on the bill.
    const session = await mongoose.startSession();
    let payment: IVendorPayment | undefined;
    let updatedBill: IVendorBill | undefined;
    try {
      await session.withTransaction(async () => {
        const receiptNumber = await vendorPaymentRepository.generateReceiptNumber(ctx.schoolId);
        payment = await vendorPaymentRepository.create({
          vendorId,
          billId: data.billId,
          schoolId: ctx.schoolId,
          amount: data.amount,
          paymentDate: new Date(data.paymentDate),
          paymentMode: data.paymentMode,
          referenceNumber: data.referenceNumber,
          remarks: data.remarks,
          recordedById: ctx.userId,
          recordedByName: ctx.displayName,
          receiptNumber,
          idempotencyKey: data.idempotencyKey,
        }, session);

        if (data.billId) {
          const applied = await vendorBillRepository.applyPayment(data.billId, ctx.schoolId, data.amount, ctx.displayName, session);
          if (!applied) throw new NotFoundError('Vendor bill');
          updatedBill = applied;
        }
      });
    } finally {
      await session.endSession();
    }
    if (!payment) throw new Error('Failed to record vendor payment');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'vendor_payment.recorded', resource: 'vendors', resourceId: vendorId,
      details: {
        paymentId: payment._id.toString(), billId: data.billId, amount: data.amount,
        paymentMode: data.paymentMode, newBillStatus: updatedBill?.status, newBillBalance: updatedBill?.balance,
      },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return { payment, bill: updatedBill };
  },

  /** Merges a vendor's bills (debits) and payments (credits) into one chronological ledger with a running balance. */
  async getVendorLedger(vendorId: string, ctx: AuthContext): Promise<VendorLedgerData> {
    const vendor = await vendorRepository.findById(vendorId, ctx.schoolId);
    if (!vendor) throw new NotFoundError('Vendor');

    const [bills, payments] = await Promise.all([
      vendorBillRepository.findByVendor(vendorId, ctx.schoolId),
      vendorPaymentRepository.findByVendor(vendorId, ctx.schoolId),
    ]);

    type RawEntry = { date: Date; entry: Omit<VendorLedgerEntry, 'runningBalance'> };
    const raw: RawEntry[] = [
      ...bills.map((b) => ({
        date: b.billDate,
        entry: {
          _id: b._id.toString(), type: 'bill' as const, date: b.billDate.toISOString(),
          description: b.description, debit: b.amount, credit: 0, reference: b.billNumber,
        },
      })),
      ...payments.map((p) => ({
        date: p.paymentDate,
        entry: {
          _id: p._id.toString(), type: 'payment' as const, date: p.paymentDate.toISOString(),
          description: p.billId ? 'Payment against bill' : 'On-account payment', debit: 0, credit: p.amount,
          reference: p.receiptNumber,
        },
      })),
    ];
    raw.sort((a, b) => a.date.getTime() - b.date.getTime());

    let runningBalance = 0;
    const entriesAscending: VendorLedgerEntry[] = raw.map(({ entry }) => {
      runningBalance += entry.debit - entry.credit;
      return { ...entry, runningBalance };
    });

    const summary = await buildSummary(vendorId, ctx.schoolId);
    return { vendor, entries: entriesAscending.reverse(), summary };
  },

  /** Unpaid/partially-paid bills past due — for the dashboard's Needs Attention list. */
  async getOverdueBills(ctx: AuthContext, limit = 20): Promise<IVendorBill[]> {
    return vendorBillRepository.getOverdue(ctx.schoolId, new Date(), limit);
  },

  async getBillsSummary(ctx: AuthContext, dateFrom?: string, dateTo?: string): Promise<VendorBillSummary> {
    return vendorBillRepository.getSummary(ctx.schoolId, { dateFrom, dateTo });
  },
};
