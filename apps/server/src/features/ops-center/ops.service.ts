import { opsRepository } from './ops.repository';
import { auditRepository } from '../audit/audit.repository';
import { getSecurityEvents, getSecuritySummary } from '../../lib/security-events';
import { getLogs, GetLogsOptions } from '../../lib/log-buffer';
import { getFeatureHealth } from '../../middlewares/metrics';
import { getErrorEvents, getErrorSummary } from '../../lib/error-events';
import { ErrorEventModel } from '../../lib/error-event.model';
import { getRenderDeploys } from '../../lib/render-client';
import { PERMISSIONS, ROLE_PERMISSIONS, ROLE_META, PERMISSION_META } from '../../lib/permissions';
import { AlertState, AlertStatus } from './alert-state.model';
import { runConsistencyChecks } from './consistency-checks';
import { usageEventRepository } from '../../lib/usage-event.repository';
import { env } from '../../config/env';
import type { AuditTrailQuery, ChapterCaptureUsageQuery, FeeReceiptWhatsappQuery } from './ops.validation';
import type { UserRole } from '../users/user.model';

export const opsService = {
  async getDashboard() {
    const [totals, infrastructure, activity] = await Promise.all([
      opsRepository.getDashboardTotals(),
      opsRepository.getInfrastructure(),
      auditRepository.findAllAcrossSchools({ page: 1, limit: 20 }),
    ]);

    return {
      totals,
      infrastructure,
      recentActivity: activity.logs,
    };
  },

  async getSchools() {
    return opsRepository.listSchools();
  },

  async getInfrastructure() {
    return opsRepository.getInfrastructure();
  },

  async getSecurity() {
    return {
      summary: getSecuritySummary(),
      events: getSecurityEvents(100),
    };
  },

  async getLogs(opts: GetLogsOptions) {
    return getLogs(opts);
  },

  async getAuditTrail(opts: AuditTrailQuery) {
    return auditRepository.findAllAcrossSchools(opts);
  },

  async getApplicationHealth() {
    return getFeatureHealth();
  },

  /**
   * Chapter Capture feature-usage screen — server-authoritative accounting (see usage-event.model.ts,
   * never computed from frontend state). Overview totals + per-user breakdown, filterable by school/
   * teacher/date, same shape/pattern as getErrorsByModule above.
   */
  async getChapterCaptureUsage(query: ChapterCaptureUsageQuery) {
    const filter = {
      schoolId: query.schoolId,
      userId: query.userId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    };

    const [overview, byUser] = await Promise.all([
      usageEventRepository.getChapterCaptureOverview(filter),
      usageEventRepository.getChapterCaptureByUser(filter),
    ]);

    return { overview, byUser };
  },

  async getSchoolDetail(schoolId: string) {
    const detail = await opsRepository.getSchoolDetail(schoolId);
    if (!detail) return null;

    const [auditResult, securityEvents] = await Promise.all([
      auditRepository.findAllAcrossSchools({ schoolId, page: 1, limit: 20 }),
      Promise.resolve(getSecurityEvents(20, schoolId)),
    ]);

    return {
      ...detail,
      recentActivity: auditResult.logs,
      recentSecurityEvents: securityEvents,
    };
  },

  async getErrors() {
    return {
      summary: getErrorSummary(),
      events: getErrorEvents(100),
    };
  },

  // Per-module breakdown for the redesigned Error Dashboard: request/success/
  // failure counts + status-code histogram + latency percentiles (from the
  // live in-process feature stats) joined with the most recent persisted
  // error per module (root cause, confidence, fix recommendation, affected
  // role, last seen) — so a module tile never needs a second click to
  // explain why it's failing.
  async getErrorsByModule() {
    const featureHealth = getFeatureHealth();

    const latestByModule = await ErrorEventModel.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$module',
          statusCode: { $first: '$statusCode' },
          code: { $first: '$code' },
          message: { $first: '$message' },
          category: { $first: '$category' },
          confidencePercent: { $first: '$confidencePercent' },
          probableCause: { $first: '$probableCause' },
          recommendedFix: { $first: '$recommendedFix' },
          role: { $first: '$role' },
          createdAt: { $first: '$createdAt' },
        },
      },
    ]);
    const latestMap = new Map(latestByModule.map((d) => [d._id as string, d]));

    return featureHealth.map((fh) => {
      const latest = latestMap.get(fh.feature);
      return {
        ...fh,
        successCount: fh.requests - fh.errors,
        lastError: latest
          ? {
              statusCode: latest.statusCode,
              code: latest.code,
              message: latest.message,
              category: latest.category,
              confidencePercent: latest.confidencePercent,
              probableCause: latest.probableCause,
              recommendedFix: latest.recommendedFix,
              affectedRole: latest.role ?? null,
              lastSeenAt: latest.createdAt,
            }
          : null,
      };
    });
  },

  async getDatabase() {
    return opsRepository.getDatabaseStats();
  },

  async getDeployments() {
    try {
      const deploys = await getRenderDeploys(20);
      return { available: true as const, deploys };
    } catch (err) {
      return { available: false as const, reason: (err as Error).message, deploys: [] };
    }
  },

  async getCommunications() {
    return opsRepository.getCommunicationsStats();
  },

  async getFeeReceiptWhatsappAnalytics(query: FeeReceiptWhatsappQuery) {
    return opsRepository.getFeeReceiptWhatsappAnalytics(query);
  },

  async getUsersScreen() {
    const users = await opsRepository.listUsers();
    const roles = Object.keys(ROLE_META) as UserRole[];

    return {
      users,
      roles: roles.map((role) => ({ role, ...ROLE_META[role] })),
      permissions: Object.values(PERMISSIONS).map((key) => ({ key, ...PERMISSION_META[key] })),
      matrix: Object.fromEntries(roles.map((role) => [role, ROLE_PERMISSIONS[role]])),
    };
  },

  async evaluateAlerts() {
    interface Candidate {
      alertKey: string;
      severity: 'critical' | 'warning';
      title: string;
      message: string;
      schoolId?: string;
    }

    const [errorSummary, securitySummary, infrastructure, schools] = await Promise.all([
      Promise.resolve(getErrorSummary()),
      Promise.resolve(getSecuritySummary()),
      opsRepository.getInfrastructure(),
      opsRepository.listSchools(),
    ]);

    const candidates: Candidate[] = [];

    if (!infrastructure.database.healthy) {
      candidates.push({
        alertKey: 'db.disconnected',
        severity: 'critical',
        title: 'Database disconnected',
        message: `MongoDB connection state: ${infrastructure.database.status}`,
      });
    }
    if (errorSummary.serverErrors > 0) {
      candidates.push({
        alertKey: 'errors.server_errors',
        severity: 'critical',
        title: 'Server errors detected',
        message: `${errorSummary.serverErrors} server error(s) (5xx) in the last 24h`,
      });
    }
    if (securitySummary.failedLogins > 10) {
      candidates.push({
        alertKey: 'security.failed_logins_spike',
        severity: 'warning',
        title: 'Failed login spike',
        message: `${securitySummary.failedLogins} failed logins in the last 24h`,
      });
    }
    if (securitySummary.invalidTokens > 10) {
      candidates.push({
        alertKey: 'security.invalid_tokens_spike',
        severity: 'warning',
        title: 'Invalid token spike',
        message: `${securitySummary.invalidTokens} invalid/expired token attempts in the last 24h`,
      });
    }

    const hourIST = Number(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }));
    for (const s of schools) {
      if (s.studentCount > 0 && hourIST >= 12 && s.attendanceRatePercent < 50) {
        candidates.push({
          alertKey: `attendance.low.${s.schoolId}`,
          severity: 'warning',
          title: `Low attendance — ${s.schoolName}`,
          message: `Attendance today is ${s.attendanceRatePercent}% (${s.schoolId})`,
          schoolId: s.schoolId,
        });
      }
    }

    // Cross-checks two independent computations of the same real-world
    // number and flags a school when they've silently drifted apart — see
    // consistency-checks.ts for why this exists.
    candidates.push(...(await runConsistencyChecks(schools)));

    const states = await AlertState.find({ alertKey: { $in: candidates.map((c) => c.alertKey) } }).lean();
    const stateByKey = new Map(states.map((s) => [s.alertKey, s]));

    return candidates.map((c) => {
      const state = stateByKey.get(c.alertKey);
      return {
        ...c,
        status: state?.status ?? 'open',
        assignedToName: state?.assignedToName ?? null,
        note: state?.note ?? null,
        updatedAt: state?.updatedAt ?? null,
      };
    });
  },

  async updateAlert(
    alertKey: string,
    updates: { status?: AlertStatus; assignedToUserId?: string; assignedToName?: string; note?: string },
    actor: { userId: string; name: string },
  ) {
    return AlertState.findOneAndUpdate(
      { alertKey },
      { $set: { ...updates, updatedByUserId: actor.userId, updatedByName: actor.name } },
      { upsert: true, new: true },
    ).lean();
  },

  getSettings() {
    return {
      environment: env.NODE_ENV,
      frontendUrl: env.FRONTEND_URL,
      nodeVersion: process.version,
      rateLimiting: {
        windowMs: env.RATE_LIMIT_WINDOW_MS,
        maxRequests: env.RATE_LIMIT_MAX,
      },
      authTokens: {
        accessTokenExpiresIn: env.JWT_ACCESS_EXPIRES,
        refreshTokenExpiresIn: env.JWT_REFRESH_EXPIRES,
      },
      integrations: {
        openai: Boolean(env.OPENAI_API_KEY),
        twilioWhatsapp: Boolean(env.TWILIO_ACCOUNT_SID),
        firebasePush: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON),
        renderDeployments: Boolean(process.env.RENDER_API_KEY && process.env.RENDER_SERVICE_ID),
      },
    };
  },
};
