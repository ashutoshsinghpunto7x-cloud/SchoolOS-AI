import type { OpsSecurityEvent, SecuritySeverity } from '../api/opsApi';
import type { OpsStatus } from '../theme';

export const SEVERITY_TO_STATUS: Record<SecuritySeverity, OpsStatus> = {
  critical: 'critical',
  high: 'critical',
  medium: 'warning',
  low: 'info',
};

export const SECURITY_TYPE_LABEL: Record<OpsSecurityEvent['type'], string> = {
  failed_login: 'Failed Login',
  invalid_token: 'Invalid Token',
  permission_denied: 'Permission Denied',
  rate_limited: 'Rate Limited',
};
