import { notificationLogRepository } from './notification-log.repository';
import { communicationEngineService } from './communication-engine.service';
import { AuthContext } from '../../lib/auth-context';

export interface DashboardSummary {
  today: { total: number; sent: number; delivered: number; read: number; failed: number; skipped: number };
  monthly: { total: number; sent: number; delivered: number; read: number; failed: number; skipped: number };
  successRate: number;   // % of monthly total that ended SENT/DELIVERED/READ
  failureRate: number;   // % of monthly total that ended FAILED
  deliveryRate: number;  // % of successfully-sent monthly messages that were confirmed DELIVERED/READ
}

function summarize(counts: Record<string, number>) {
  const sent = counts.SENT ?? 0;
  const delivered = counts.DELIVERED ?? 0;
  const read = counts.READ ?? 0;
  const failed = counts.FAILED ?? 0;
  const skipped = counts.SKIPPED ?? 0;
  const total = sent + delivered + read + failed + skipped + (counts.QUEUED ?? 0);
  return { total, sent, delivered, read, failed, skipped };
}

export const dashboardService = {
  async getSummary(ctx: AuthContext): Promise<DashboardSummary> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

    const [todayCounts, monthlyCounts] = await Promise.all([
      notificationLogRepository.countByStatusSince(ctx.schoolId, todayStart),
      notificationLogRepository.countByStatusSince(ctx.schoolId, monthStart),
    ]);

    const today = summarize(todayCounts);
    const monthly = summarize(monthlyCounts);

    const successful = monthly.sent + monthly.delivered + monthly.read;
    const successRate = monthly.total > 0 ? Math.round((successful / monthly.total) * 100) : 0;
    const failureRate = monthly.total > 0 ? Math.round((monthly.failed / monthly.total) * 100) : 0;
    const deliveryRate = successful > 0 ? Math.round(((monthly.delivered + monthly.read) / successful) * 100) : 0;

    return { today, monthly, successRate, failureRate, deliveryRate };
  },

  async getRecentActivity(ctx: AuthContext, limit = 20) {
    return notificationLogRepository.recent(ctx.schoolId, limit);
  },

  async getFailed(ctx: AuthContext, limit = 100) {
    return notificationLogRepository.findFailed(ctx.schoolId, limit);
  },

  async retryAllFailed(ctx: AuthContext): Promise<{ retried: number; nowSent: number; stillFailed: number }> {
    const failed = await notificationLogRepository.findFailed(ctx.schoolId, 500);
    let nowSent = 0;
    let stillFailed = 0;

    for (const log of failed) {
      const result = await communicationEngineService.retry(log._id.toString(), ctx);
      if (result.status === 'SENT') nowSent++;
      else stillFailed++;
    }

    return { retried: failed.length, nowSent, stillFailed };
  },
};
