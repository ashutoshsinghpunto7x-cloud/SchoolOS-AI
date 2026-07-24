import type { OpsStatus } from '../theme';
import { opsStatusColor } from '../theme';

const LABELS: Record<OpsStatus, string> = {
  healthy: 'Healthy',
  warning: 'Warning',
  critical: 'Critical',
  info: 'Info',
  muted: 'Unknown',
};

export function StatusBadge({ status, label }: { status: OpsStatus; label?: string }) {
  const color = opsStatusColor[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
      style={{ color, borderColor: `${color}40`, backgroundColor: `${color}1A` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label ?? LABELS[status]}
    </span>
  );
}
