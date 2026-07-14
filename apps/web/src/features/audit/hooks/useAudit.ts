import { useQuery } from '@tanstack/react-query';
import { auditApi, AuditListOptions } from '../api/audit.api';

export const auditKeys = {
  all: ['audit'] as const,
  list: (o: AuditListOptions) => [...auditKeys.all, 'list', o] as const,
};

export const useAuditLog = (opts: AuditListOptions, enabled = true) =>
  useQuery({
    queryKey: auditKeys.list(opts),
    queryFn: () => auditApi.list(opts),
    enabled,
  });
