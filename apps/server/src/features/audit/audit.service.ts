import { AuditLog, AuditAction } from './audit.model';
import { logger } from '../../lib/logger';

interface AuditEvent {
  userId: string;
  userDisplayName: string;
  action: AuditAction;
  resource: string;
  resourceId: string;
  details?: Record<string, unknown>;
  ip?: string;
  schoolId: string;
}

// Fire-and-forget: audit failures never interrupt the main operation
export const auditService = {
  log(event: AuditEvent): void {
    AuditLog.create(event).catch((err: unknown) => {
      logger.error('Audit log write failed', { action: event.action, err });
    });
  },
};
