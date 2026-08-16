import { Vendor, IVendor, VendorCategory, VendorStatus } from './vendor.model';
import { VendorBill } from './vendor.bill.model';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FindVendorsOptions {
  page?: number;
  limit?: number;
  search?: string;
  category?: VendorCategory;
  status?: VendorStatus;
}

export interface PaginatedVendors {
  records: IVendor[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateVendorData {
  schoolId: string;
  name: string;
  category: VendorCategory;
  status?: VendorStatus;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  notes?: string;
  createdBy: string;
}

// ── Repository ────────────────────────────────────────────────────────────────

export const vendorRepository = {
  async create(data: CreateVendorData): Promise<IVendor> {
    const vendor = new Vendor(data);
    return vendor.save();
  },

  async findById(id: string, schoolId: string): Promise<IVendor | null> {
    return Vendor.findOne({ _id: id, schoolId, isDeleted: false }).lean<IVendor>();
  },

  async findAll(schoolId: string, opts: FindVendorsOptions = {}): Promise<PaginatedVendors> {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, isDeleted: false };

    if (opts.search?.trim()) {
      const regex = new RegExp(opts.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.name = regex;
    }
    if (opts.category) query.category = opts.category;
    if (opts.status)   query.status   = opts.status;

    const [records, total] = await Promise.all([
      Vendor.find(query).sort({ name: 1 }).skip(skip).limit(limit).lean<IVendor[]>(),
      Vendor.countDocuments(query),
    ]);

    return { records, total, page, limit };
  },

  async update(
    id: string,
    schoolId: string,
    data: Partial<IVendor> & { updatedBy?: string },
  ): Promise<IVendor | null> {
    return Vendor.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: data },
      { new: true, runValidators: true },
    ).lean<IVendor>();
  },

  async softDelete(id: string, schoolId: string, deletedBy: string): Promise<boolean> {
    const result = await Vendor.updateOne(
      { _id: id, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } },
    );
    return result.modifiedCount > 0;
  },

  /** Sum of outstanding balance across every non-fully-paid bill, for the dashboard. */
  async getOutstandingTotal(schoolId: string): Promise<number> {
    const agg = await VendorBill.aggregate<{ total: number }>([
      { $match: { schoolId, isDeleted: false, status: { $ne: 'paid' } } },
      { $group: { _id: null, total: { $sum: '$balance' } } },
    ]);
    return agg[0]?.total ?? 0;
  },
};
