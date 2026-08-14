import mongoose from 'mongoose';
import os from 'os';
import { SchoolSettings } from '../school-settings/school-settings.model';
import { Student } from '../students/student.model';
import { Teacher } from '../teachers/teacher.model';
import { Attendance } from '../attendance/attendance.model';
import { FeePayment } from '../fees/fee.payment.model';
import { User } from '../users/user.model';
import { Communication } from '../communications/communication.model';
import { Notification } from '../notifications/notification.model';
import { NotificationLog } from '../communication/notification-log.model';
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
    const settings = await SchoolSettings.find({ isTestTenant: { $ne: true } }).lean();
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
    const realSchoolIds = (await SchoolSettings.find({ isTestTenant: { $ne: true } }).select('schoolId').lean())
      .map((s) => s.schoolId);

    const [studentTotal, teacherTotal, internalActiveUsers] = await Promise.all([
      Student.countDocuments({ schoolId: { $in: realSchoolIds }, isDeleted: false }),
      Teacher.countDocuments({ schoolId: { $in: realSchoolIds }, isDeleted: false }),
      User.countDocuments({ role: { $in: OPS_ROLES }, lastLoginAt: { $gte: new Date(Date.now() - ACTIVE_WINDOW_MS) } }),
    ]);

    return { studentTotal, teacherTotal, schoolCount: realSchoolIds.length, internalActiveUsers };
  },

  /** Live-probes what the current Atlas tier actually allows, rather than
   * trusting a hardcoded tier name — so this automatically reports more once
   * the cluster is upgraded, with no code change needed. */
  async getDatabaseStats() {
    const db = mongoose.connection.db;
    if (!db) {
      return { connected: false as const };
    }

    const [serverStatus, dbStats, collections] = await Promise.all([
      db.admin().serverStatus().catch(() => null),
      db.stats().catch(() => null),
      db.listCollections().toArray().catch(() => []),
    ]);

    const topCollections = await Promise.all(
      collections.slice(0, 15).map(async (c) => {
        try {
          const stats = await db.command({ collStats: c.name });
          return {
            name: c.name,
            count: stats.count as number,
            storageSizeBytes: stats.storageSize as number,
            totalIndexSizeBytes: stats.totalIndexSize as number,
            avgObjSizeBytes: (stats.avgObjSize as number) ?? 0,
          };
        } catch {
          return { name: c.name, count: 0, storageSizeBytes: 0, totalIndexSizeBytes: 0, avgObjSizeBytes: 0 };
        }
      }),
    );
    topCollections.sort((a, b) => b.storageSizeBytes - a.storageSizeBytes);

    let profilerStatus: { available: boolean; reason?: string } = { available: false };
    try {
      await db.command({ profile: -1 });
      profilerStatus = { available: true };
    } catch (err) {
      profilerStatus = { available: false, reason: (err as Error).message };
    }

    return {
      connected: true as const,
      version: (serverStatus?.version as string) ?? null,
      uptimeSeconds: (serverStatus?.uptime as number) ?? null,
      connections: (serverStatus?.connections as { current: number; available: number; totalCreated: number }) ?? null,
      opcounters: (serverStatus?.opcounters as Record<string, number>) ?? null,
      network: (serverStatus?.network as { bytesIn: number; bytesOut: number; numRequests: number }) ?? null,
      storage: dbStats
        ? {
            dataSizeBytes: dbStats.dataSize as number,
            storageSizeBytes: dbStats.storageSize as number,
            indexSizeBytes: dbStats.indexSize as number,
            collectionCount: dbStats.collections as number,
            indexCount: dbStats.indexes as number,
          }
        : null,
      topCollections: topCollections.slice(0, 10),
      profiler: profilerStatus,
    };
  },

  async getCommunicationsStats() {
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [whatsappByStatus, whatsappRecent, notificationTotal30d, notificationReadTotal30d] = await Promise.all([
      Communication.aggregate([
        { $match: { type: 'whatsapp', createdAt: { $gte: since30d } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Communication.find({ type: 'whatsapp' })
        .sort({ createdAt: -1 })
        .limit(30)
        .select('title status provider schoolId createdAt')
        .lean(),
      Notification.countDocuments({ createdAt: { $gte: since30d } }),
      Notification.countDocuments({ createdAt: { $gte: since30d }, isRead: true }),
    ]);

    const whatsappStatusCounts: Record<string, number> = {};
    for (const row of whatsappByStatus as { _id: string; count: number }[]) {
      whatsappStatusCounts[row._id] = row.count;
    }

    return {
      whatsapp: {
        last30dByStatus: whatsappStatusCounts,
        recent: whatsappRecent,
      },
      pushNotifications: {
        last30dSent: notificationTotal30d,
        last30dRead: notificationReadTotal30d,
        readRatePercent: notificationTotal30d > 0 ? Math.round((notificationReadTotal30d / notificationTotal30d) * 100) : 0,
        note: 'Read rate reflects in-app read state — there is no device delivery-confirmation webhook wired up yet, so this is not the same as "delivered".',
      },
    };
  },

  /** Fee Receipt WhatsApp Analytics (Ops Centre) — aggregates NotificationLog
   *  rows for the FEE_PAYMENT_RECEIPT type, filterable by school/date range/
   *  accountant/student/status. */
  async getFeeReceiptWhatsappAnalytics(filters: {
    schoolId?: string; studentId?: string; createdBy?: string; status?: string; from?: string; to?: string;
  }) {
    const match: Record<string, unknown> = { notificationType: 'FEE_PAYMENT_RECEIPT' };
    if (filters.schoolId) match.schoolId = filters.schoolId;
    if (filters.studentId) match.studentId = filters.studentId;
    if (filters.createdBy) match.createdBy = filters.createdBy;
    if (filters.status) match.status = filters.status;
    if (filters.from || filters.to) {
      const range: Record<string, Date> = {};
      if (filters.from) range.$gte = new Date(filters.from);
      if (filters.to) range.$lte = new Date(filters.to);
      match.createdAt = range;
    }

    const [byStatus, bySchool, byDate, retrySum, total] = await Promise.all([
      NotificationLog.aggregate<{ _id: string; count: number }>([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      NotificationLog.aggregate<{ _id: string; count: number }>([
        { $match: match },
        { $group: { _id: '$schoolId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 50 },
      ]),
      NotificationLog.aggregate<{ _id: string; count: number }>([
        { $match: match },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } }, count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
        { $limit: 60 },
      ]),
      NotificationLog.aggregate<{ _id: null; totalRetries: number }>([
        { $match: match },
        { $group: { _id: null, totalRetries: { $sum: '$retryCount' } } },
      ]),
      NotificationLog.countDocuments(match),
    ]);

    const statusCounts: Record<string, number> = { QUEUED: 0, SENT: 0, DELIVERED: 0, READ: 0, FAILED: 0, SKIPPED: 0 };
    for (const row of byStatus) statusCounts[row._id] = row.count;

    const delivered = statusCounts.DELIVERED + statusCounts.READ;
    const attempted = total - statusCounts.SKIPPED;
    const successRatePercent = attempted > 0
      ? Math.round(((statusCounts.SENT + statusCounts.DELIVERED + statusCounts.READ) / attempted) * 100)
      : 0;

    return {
      totalGenerated: total,
      totalSent: statusCounts.SENT + statusCounts.DELIVERED + statusCounts.READ,
      delivered,
      read: statusCounts.READ,
      failed: statusCounts.FAILED,
      pending: statusCounts.QUEUED,
      skipped: statusCounts.SKIPPED,
      totalRetries: retrySum[0]?.totalRetries ?? 0,
      successRatePercent,
      bySchool: bySchool.map((r) => ({ schoolId: r._id, count: r.count })),
      byDate: byDate.map((r) => ({ date: r._id, count: r.count })),
    };
  },

  async listUsers() {
    const users = await User.find({ deletedAt: { $exists: false } })
      .select('firstName lastName email role schoolId status lastLoginAt createdAt')
      .sort({ lastLoginAt: -1 })
      .limit(500)
      .lean();

    return users.map((u) => ({
      id: String(u._id),
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      schoolId: u.schoolId,
      status: u.status,
      lastLoginAt: u.lastLoginAt ?? null,
      createdAt: u.createdAt,
    }));
  },
};
