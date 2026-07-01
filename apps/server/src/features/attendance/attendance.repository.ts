import { Attendance, IAttendance, AttendanceStatus } from './attendance.model';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UpsertAttendanceData {
  studentId: string;
  schoolId: string;
  class: string;
  section: string;
  date: string;
  status: AttendanceStatus;
  note?: string;
  markedById: string;
  markedByName: string;
  markedAt: Date;
}

export interface FindAttendanceOptions {
  page?: number;
  limit?: number;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  class?: string;
  section?: string;
  status?: AttendanceStatus;
  studentId?: string;
  search?: string;
}

export interface PaginatedAttendance {
  records: IAttendance[];
  total: number;
  page: number;
  limit: number;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  half_day: number;
  leave_approved: number;
  attendanceRate: number;   // 0–100
}

// ── Repository ────────────────────────────────────────────────────────────────

export const attendanceRepository = {
  /**
   * Upsert: if a record exists for (schoolId, studentId, date) update it;
   * otherwise create. This ensures idempotency for the bulk submit workflow.
   */
  async upsert(data: UpsertAttendanceData): Promise<IAttendance> {
    return Attendance.findOneAndUpdate(
      { schoolId: data.schoolId, studentId: data.studentId, date: data.date, isDeleted: false },
      {
        $set: {
          class:        data.class,
          section:      data.section,
          status:       data.status,
          note:         data.note,
          markedById:   data.markedById,
          markedByName: data.markedByName,
          markedAt:     data.markedAt,
        },
        $setOnInsert: {
          schoolId:  data.schoolId,
          studentId: data.studentId,
          date:      data.date,
          isDeleted: false,
        },
      },
      { new: true, upsert: true, runValidators: true }
    ).lean<IAttendance>() as unknown as IAttendance;
  },

  /** Bulk upsert — runs all upserts in parallel (Promise.all). */
  async bulkUpsert(records: UpsertAttendanceData[]): Promise<IAttendance[]> {
    return Promise.all(records.map((r) => this.upsert(r)));
  },

  async findById(id: string, schoolId: string): Promise<IAttendance | null> {
    return Attendance.findOne({ _id: id, schoolId, isDeleted: false }).lean<IAttendance>();
  },

  async update(
    id: string,
    schoolId: string,
    data: { status?: AttendanceStatus; note?: string },
  ): Promise<IAttendance | null> {
    return Attendance.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: data },
      { new: true, runValidators: true }
    ).lean<IAttendance>();
  },

  async softDelete(id: string, schoolId: string, deletedBy: string): Promise<boolean> {
    const result = await Attendance.updateOne(
      { _id: id, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } }
    );
    return result.modifiedCount > 0;
  },

  /** All records for a class+section on a specific date. */
  async findByClassDate(
    schoolId: string,
    cls: string,
    section: string,
    date: string,
  ): Promise<IAttendance[]> {
    return Attendance.find({ schoolId, class: cls, section, date, isDeleted: false })
      .sort({ markedAt: 1 })
      .lean<IAttendance[]>();
  },

  /** Full attendance history for one student with pagination. */
  async findByStudent(
    schoolId: string,
    studentId: string,
    opts: { page: number; limit: number; dateFrom?: string; dateTo?: string; status?: AttendanceStatus },
  ): Promise<PaginatedAttendance> {
    const page  = Math.max(1, opts.page);
    const limit = Math.min(400, Math.max(1, opts.limit));
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, studentId, isDeleted: false };
    if (opts.dateFrom || opts.dateTo) {
      const dateRange: Record<string, string> = {};
      if (opts.dateFrom) dateRange.$gte = opts.dateFrom;
      if (opts.dateTo)   dateRange.$lte = opts.dateTo;
      query.date = dateRange;
    }
    if (opts.status) query.status = opts.status;

    const [records, total] = await Promise.all([
      Attendance.find(query).sort({ date: -1 }).skip(skip).limit(limit).lean<IAttendance[]>(),
      Attendance.countDocuments(query),
    ]);

    return { records, total, page, limit };
  },

  /** Paginated list with full filter support. */
  async findAll(
    schoolId: string,
    opts: FindAttendanceOptions,
  ): Promise<PaginatedAttendance> {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(500, Math.max(1, opts.limit ?? 50));
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, isDeleted: false };

    if (opts.date) {
      query.date = opts.date;
    } else if (opts.dateFrom || opts.dateTo) {
      const dateRange: Record<string, string> = {};
      if (opts.dateFrom) dateRange.$gte = opts.dateFrom;
      if (opts.dateTo)   dateRange.$lte = opts.dateTo;
      query.date = dateRange;
    }
    if (opts.class)     query.class   = opts.class;
    if (opts.section)   query.section = opts.section;
    if (opts.status)    query.status  = opts.status;
    if (opts.studentId) query.studentId = opts.studentId;

    const [records, total] = await Promise.all([
      Attendance.find(query).sort({ date: -1, class: 1, section: 1 }).skip(skip).limit(limit).lean<IAttendance[]>(),
      Attendance.countDocuments(query),
    ]);

    return { records, total, page, limit };
  },

  /** Aggregate counts for summary stats. */
  async getSummary(
    schoolId: string,
    opts: { studentId?: string; class?: string; section?: string; dateFrom?: string; dateTo?: string },
  ): Promise<AttendanceSummary> {
    const match: Record<string, unknown> = { schoolId, isDeleted: false };

    if (opts.studentId) match.studentId = opts.studentId;
    if (opts.class)     match.class     = opts.class;
    if (opts.section)   match.section   = opts.section;
    if (opts.dateFrom || opts.dateTo) {
      const dateRange: Record<string, string> = {};
      if (opts.dateFrom) dateRange.$gte = opts.dateFrom;
      if (opts.dateTo)   dateRange.$lte = opts.dateTo;
      match.date = dateRange;
    }

    const agg = await Attendance.aggregate<{ _id: string; count: number }>([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const counts: Record<string, number> = {};
    for (const row of agg) counts[row._id] = row.count;

    const present       = counts.present        ?? 0;
    const absent        = counts.absent          ?? 0;
    const late          = counts.late            ?? 0;
    const half_day      = counts.half_day        ?? 0;
    const leave_approved= counts.leave_approved  ?? 0;
    const total         = present + absent + late + half_day + leave_approved;
    const attendanceRate= total > 0 ? Math.round(((present + late + half_day) / total) * 100) : 0;

    return { total, present, absent, late, half_day, leave_approved, attendanceRate };
  },

  /** Today's date in YYYY-MM-DD, in IST — independent of the server host's timezone. */
  todayString(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  },
};
