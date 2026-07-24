import { BehaviorRecord, IBehaviorRecord } from './behavior-record.model';

export interface CreateBehaviorRecordData {
  studentId: string;
  schoolId: string;
  class: string;
  section: string;
  date: string;
  optionId: string;
  optionLabel: string;
  category: string;
  note?: string;
  markedById: string;
  markedByName: string;
  markedAt: Date;
}

export interface PaginatedBehaviorRecords {
  records: IBehaviorRecord[];
  total: number;
  page: number;
  limit: number;
}

export const behaviorRecordRepository = {
  async create(data: CreateBehaviorRecordData): Promise<IBehaviorRecord> {
    return BehaviorRecord.create(data);
  },

  async bulkCreate(records: CreateBehaviorRecordData[]): Promise<IBehaviorRecord[]> {
    return BehaviorRecord.insertMany(records);
  },

  async findById(id: string, schoolId: string): Promise<IBehaviorRecord | null> {
    return BehaviorRecord.findOne({ _id: id, schoolId, isDeleted: false }).lean<IBehaviorRecord>();
  },

  /** All records for a class+section on a specific date. */
  async findByClassDate(
    schoolId: string,
    cls: string,
    section: string,
    date: string,
  ): Promise<IBehaviorRecord[]> {
    return BehaviorRecord.find({ schoolId, class: cls, section, date, isDeleted: false })
      .sort({ markedAt: -1 })
      .lean<IBehaviorRecord[]>();
  },

  /** Paginated behaviour history for one student. */
  async findByStudent(
    schoolId: string,
    studentId: string,
    opts: { page: number; limit: number; dateFrom?: string; dateTo?: string },
  ): Promise<PaginatedBehaviorRecords> {
    const page  = Math.max(1, opts.page);
    const limit = Math.min(200, Math.max(1, opts.limit));
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, studentId, isDeleted: false };
    if (opts.dateFrom || opts.dateTo) {
      const dateRange: Record<string, string> = {};
      if (opts.dateFrom) dateRange.$gte = opts.dateFrom;
      if (opts.dateTo)   dateRange.$lte = opts.dateTo;
      query.date = dateRange;
    }

    const [records, total] = await Promise.all([
      BehaviorRecord.find(query).sort({ date: -1, markedAt: -1 }).skip(skip).limit(limit).lean<IBehaviorRecord[]>(),
      BehaviorRecord.countDocuments(query),
    ]);

    return { records, total, page, limit };
  },

  async softDelete(id: string, schoolId: string, deletedBy: string): Promise<boolean> {
    const result = await BehaviorRecord.updateOne(
      { _id: id, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } },
    );
    return result.modifiedCount > 0;
  },

  /** Today's date in YYYY-MM-DD, in IST — same convention as attendanceRepository.todayString. */
  todayString(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  },
};
