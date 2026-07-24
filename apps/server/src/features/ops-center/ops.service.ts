import { opsRepository } from './ops.repository';
import { auditRepository } from '../audit/audit.repository';
import { getSecurityEvents, getSecuritySummary } from '../../lib/security-events';
import { getLogs, GetLogsOptions } from '../../lib/log-buffer';
import { getFeatureHealth } from '../../middlewares/metrics';
import type { AuditTrailQuery } from './ops.validation';

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
};
