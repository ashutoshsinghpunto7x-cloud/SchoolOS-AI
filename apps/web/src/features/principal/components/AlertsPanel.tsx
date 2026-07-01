import { AlertTriangle, Info, XCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { PrincipalAlert } from '@schoolos/types';

const SEVERITY_CONFIG = {
  info:     { icon: Info,          bg: 'bg-blue-50',   border: 'border-blue-100',   text: 'text-blue-700',   icon_color: 'text-blue-500' },
  warning:  { icon: AlertTriangle, bg: 'bg-amber-50',  border: 'border-amber-100',  text: 'text-amber-700',  icon_color: 'text-amber-500' },
  critical: { icon: XCircle,       bg: 'bg-red-50',    border: 'border-red-100',    text: 'text-red-700',    icon_color: 'text-red-500' },
} as const;

interface AlertRowProps {
  alert: PrincipalAlert;
}

const AlertRow = ({ alert }: AlertRowProps) => {
  const navigate = useNavigate();
  const cfg = SEVERITY_CONFIG[alert.severity];
  const Icon = cfg.icon;

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-xl border',
        cfg.bg, cfg.border,
        alert.actionUrl && 'cursor-pointer hover:opacity-90 transition-opacity',
      )}
      onClick={() => alert.actionUrl && navigate(alert.actionUrl)}
    >
      <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', cfg.icon_color)} strokeWidth={2} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold leading-tight', cfg.text)}>{alert.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{alert.message}</p>
      </div>
      {alert.actionUrl && (
        <ExternalLink className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" strokeWidth={2} />
      )}
    </div>
  );
};

interface AlertsPanelProps {
  alerts: PrincipalAlert[];
  isLoading?: boolean;
}

export const AlertsPanel = ({ alerts, isLoading }: AlertsPanelProps) => {
  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl" />
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-3 px-4 py-4 rounded-xl bg-green-50 border border-green-100">
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <Info className="w-4 h-4 text-green-600" strokeWidth={2} />
        </div>
        <div>
          <p className="text-sm font-semibold text-green-700">All Clear</p>
          <p className="text-xs text-gray-500 mt-0.5">No alerts at this time.</p>
        </div>
      </div>
    );
  }

  // Sort: critical first, then warning, then info
  const sorted = [...alerts].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="space-y-2">
      {sorted.map((alert) => (
        <AlertRow key={alert.id} alert={alert} />
      ))}
    </div>
  );
};
