import { StaffAttendanceRecord, IStaffAttendanceRecord } from './staff-attendance.model';

export const staffAttendanceRepository = {
  /** Today's date in YYYY-MM-DD, in IST — matches the student attendance
   *  feature's convention (attendance.repository.ts:todayString). */
  todayString(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  },

  async findForEmployeeOnDate(
    schoolId: string,
    employeeId: string,
    date: string,
  ): Promise<IStaffAttendanceRecord | null> {
    return StaffAttendanceRecord.findOne({ schoolId, employeeId, date });
  },

  async create(data: {
    employeeId: string;
    employeeObjectId: string;
    schoolId: string;
    date: string;
  }): Promise<IStaffAttendanceRecord> {
    return StaffAttendanceRecord.create(data);
  },

  async listByDate(schoolId: string, date: string): Promise<IStaffAttendanceRecord[]> {
    return StaffAttendanceRecord.find({ schoolId, date }).sort({ 'checkIn.time': 1 }).lean<IStaffAttendanceRecord[]>();
  },

  async listForEmployee(
    schoolId: string,
    employeeId: string,
    opts: { from?: string; to?: string } = {},
  ): Promise<IStaffAttendanceRecord[]> {
    const query: Record<string, unknown> = { schoolId, employeeId };
    if (opts.from || opts.to) {
      const range: Record<string, string> = {};
      if (opts.from) range.$gte = opts.from;
      if (opts.to) range.$lte = opts.to;
      query.date = range;
    }
    return StaffAttendanceRecord.find(query).sort({ date: -1 }).lean<IStaffAttendanceRecord[]>();
  },
};
