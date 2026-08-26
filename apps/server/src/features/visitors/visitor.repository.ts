import { Visitor, IVisitor, VisitorPurpose } from './visitor.model';

export interface CreateVisitorData {
  schoolId: string;
  name: string;
  contactNumber: string;
  purpose: VisitorPurpose;
  purposeNote?: string;
  personToVisit: string;
  checkInTime: Date;
  recordedById: string;
  recordedByName: string;
}

export interface FindVisitorsOptions {
  page?: number;
  limit?: number;
  search?: string;
  purpose?: VisitorPurpose;
  onlyOnSite?: boolean;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedVisitors {
  visitors: IVisitor[];
  total: number;
  page: number;
  limit: number;
}

// Visitor check-in/out times are recorded against the school's local
// calendar day (IST), not UTC — using a UTC midnight boundary here silently
// dropped/misfiled any visitor checked in between 12:00–5:29 AM IST, since
// that instant still falls on the *previous* UTC day.
const dayBounds = (dateStr: string): { start: Date; end: Date } => {
  const start = new Date(`${dateStr}T00:00:00.000+05:30`);
  const end = new Date(`${dateStr}T23:59:59.999+05:30`);
  return { start, end };
};

export const visitorRepository = {
  async create(data: CreateVisitorData): Promise<IVisitor> {
    const visitor = new Visitor(data);
    return visitor.save();
  },

  async findById(id: string, schoolId: string): Promise<IVisitor | null> {
    return Visitor.findOne({ _id: id, schoolId, isDeleted: false });
  },

  async findAll(schoolId: string, opts: FindVisitorsOptions = {}): Promise<PaginatedVisitors> {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(200, Math.max(1, opts.limit ?? 50));
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, isDeleted: false };

    if (opts.search?.trim()) {
      const escaped = opts.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      query.$or = [
        { name: regex },
        { contactNumber: regex },
        { personToVisit: regex },
      ];
    }
    if (opts.purpose) query.purpose = opts.purpose;
    if (opts.onlyOnSite) query.checkOutTime = { $exists: false };

    if (opts.date) {
      const { start, end } = dayBounds(opts.date);
      query.checkInTime = { $gte: start, $lte: end };
    } else if (opts.dateFrom || opts.dateTo) {
      const range: Record<string, Date> = {};
      if (opts.dateFrom) range.$gte = dayBounds(opts.dateFrom).start;
      if (opts.dateTo)   range.$lte = dayBounds(opts.dateTo).end;
      query.checkInTime = range;
    }

    const [visitors, total] = await Promise.all([
      Visitor.find(query).sort({ checkInTime: -1 }).skip(skip).limit(limit).lean<IVisitor[]>(),
      Visitor.countDocuments(query),
    ]);

    return { visitors, total, page, limit };
  },

  async checkOut(id: string, schoolId: string, checkOutTime: Date): Promise<IVisitor | null> {
    return Visitor.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: { checkOutTime } },
      { new: true },
    ).lean<IVisitor>();
  },

  async softDelete(id: string, schoolId: string, deletedBy: string): Promise<boolean> {
    const result = await Visitor.updateOne(
      { _id: id, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } },
    );
    return result.modifiedCount > 0;
  },
};
