// Ops Center design tokens — a self-contained dark SOC theme, independent of
// the school-facing app's light/dark toggle. Applied via Tailwind arbitrary
// values so this feature never has to touch the shared tailwind.config.

export const opsColors = {
  background: '#0B0F14',
  sidebar: '#0F141B',
  card: '#121922',
  border: '#232D38',
  textPrimary: '#F4F6F8',
  textSecondary: '#98A2B3',
  healthy: '#22C55E',
  warning: '#F59E0B',
  critical: '#EF4444',
  info: '#3B82F6',
  muted: '#64748B',
} as const;

export type OpsStatus = 'healthy' | 'warning' | 'critical' | 'info' | 'muted';

export const opsStatusColor: Record<OpsStatus, string> = {
  healthy: opsColors.healthy,
  warning: opsColors.warning,
  critical: opsColors.critical,
  info: opsColors.info,
  muted: opsColors.muted,
};
