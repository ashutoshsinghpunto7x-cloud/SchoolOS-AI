import mongoose from 'mongoose';
import os from 'os';
import { SchoolSettings } from '../school-settings/school-settings.model';
import { Student } from '../students/student.model';
import { Teacher } from '../teachers/teacher.model';
import { Attendance } from '../attendance/attendance.model';
import { FeePayment } from '../fees/fee.payment.model';
import { User } from '../users/user.model';
import { OPS_ROLES } from '@schoolos/types';
import { attendanceRepository } from '../attendance/attendance.repository';
import { getMetricsSnapshot } from '../../middlewares/metrics';

const ACTIVE_WINDOW_MS = 15 * 60 * 1000;

export interface OpsSchoolRow {
  schoolId: string;
  schoolName: string;
  studentCount: number;
  teacherCount: number;
  activeUsers15m: number;
  attendanceRatePercent: number;
  feeCollectedTodayRupees: number;
  lastActivityAt: Date | null;
}

function startOfTodayIST(): Date {
  return new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) + 'T00:00:00+05:30');
}

async function getSchoolRow(schoolId: string, schoolName: string): Promise<OpsSchoolRow> {
  const today = attendanceRepository.todayString();
  const startOfDay = startOfTodayIST();
  const activeSince = new Date(Date.now() - ACTIVE_WINDOW_MS);

  const [studentCount, teacherCount, attendanceCounts, feeAgg, activeUsers15m, lastUser] = await Promise.all([
    Student.countDocuments({ schoolId, isDeleted: false }),
    Teacher.countDocuments({ schoolId, isDeleted: false }),
    Attendance.aggregate([
      { $match: { schoolId, date: today, isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    FeePayment.aggregate([
      { $match: { schoolId, isDeleted: false, paymentDate: { $gte: startOfDay } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    User.countDocuments({ schoolId, lastLoginAt: { $gte: activeSince } }),
    User.findOne({ schoolId }).sort({ lastLoginAt: -1 }).select('lastLoginAt').lean(),
  ]);

  const byStatus: Record<string, number> = {};
  for (const row of attendanceCounts as { _id: string; count: number }[]) byStatus[row._id] = row.count;
  const present = (byStatus.present ?? 0) + (byStatus.late ?? 0) + (byStatus.half_day ?? 0);
  const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0);
  const attendanceRatePercent = total > 0 ? Math.round((present / total) * 100) : 0;

  return {
    schoolId,
    schoolName,
    studentCount,
    teacherCount,
    activeUsers15m,
    attendanceRatePercent,
    feeCollectedTodayRupees: (feeAgg[0]?.total as number | undefined) ?? 0,
    lastActivityAt: lastUser?.lastLoginAt ?? null,
  };
}

export interface OpsDayTrend {
  date: string;
  attendanceRatePercent: number;
  feeCollectedRupees: number;
}

async function getSchoolTrend(schoolId: string, days: number): Promise<OpsDayTrend[]> {
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    dates.push(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  }

  const rangeStart = new Date(dates[0] + 'T00:00:00+05:30');

  const [attendanceByDate, feeByDate] = await Promise.all([
    Attendance.aggregate([
      { $match: { schoolId, isDeleted: false, date: { $in: dates } } },
      { $group: { _id: { date: '$date', status: '$status' }, count: { $sum: 1 } } },
    ]),
    FeePayment.aggregate([
      { $match: { schoolId, isDeleted: false, paymentDate: { $gte: rangeStart } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$paymentDate', timezone: 'Asia/Kolkata' } },
          total: { $sum: '$amount' },
        },
      },
    ]),
  ]);

  const attendanceByDay = new Map<string, Record<string, number>>();
  for (const row of attendanceByDate as { _id: { date: string; status: string }; count: number }[]) {
    const day = attendanceByDay.get(row._id.date) ?? {};
    day[row._id.status] = row.count;
    attendanceByDay.set(row._id.date, day);
  }

  const feeByDay = new Map<string, number>();
  for (const row of feeByDate as { _id: string; total: number }[]) {
    feeByDay.set(row._id, row.total);
  }

  return dates.map((date) => {
    const byStatus = attendanceByDay.get(date) ?? {};
    const present = (byStatus.present ?? 0) + (byStatus.late ?? 0) + (byStatus.half_day ?? 0);
    const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0);
    return {
      date,
      attendanceRatePercent: total > 0 ? Math.round((present / total) * 100) : 0,
      feeCollectedRupees: feeByDay.get(date) ?? 0,
    };
  });
}

export const opsRepository = {
  async listSchools(): Promise<OpsSchoolRow[]> {
    const settings = await SchoolSettings.find().lean();
    return Promise.all(settings.map((s) => getSchoolRow(s.schoolId, s.schoolName)));
  },

  async getSchoolDetail(schoolId: string) {
    const settings = await SchoolSettings.findOne({ schoolId }).lean();
    if (!settings) return null;

    const [row, trend] = await Promise.all([
      getSchoolRow(schoolId, settings.schoolName),
      getSchoolTrend(schoolId, 7),
    ]);

    return { ...row, trend };
  },

  async getInfrastructure() {
    const mem = process.memoryUsage();
    const dbState = mongoose.connection.readyState; // 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
    const dbStateLabels: Record<number, string> = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    const dbStateLabel = dbStateLabels[dbState] ?? 'unknown';

    return {
      uptimeSeconds: Math.round(process.uptime()),
      memory: {
        rssBytes: mem.rss,
        heapUsedBytes: mem.heapUsed,
        heapTotalBytes: mem.heapTotal,
      },
      loadAverage: os.loadavg(),
      cpuCount: os.cpus().length,
      database: {
        status: dbStateLabel,
        healthy: dbState === 1,
      },
      ...getMetricsSnapshot(),
    };
  },

  async getDashboardTotals() {
    const [studentTotal, teacherTotal, schoolCount, internalActiveUsers] = await Promise.all([
      Student.countDocuments({ isDeleted: false }),
      Teacher.countDocuments({ isDeleted: false }),
      SchoolSettings.countDocuments(),
      User.countDocuments({ role: { $in: OPS_ROLES }, lastLoginAt: { $gte: new Date(Date.now() - ACTIVE_WINDOW_MS) } }),
    ]);

    return { studentTotal, teacherTotal, schoolCount, internalActiveUsers };
  },
};
