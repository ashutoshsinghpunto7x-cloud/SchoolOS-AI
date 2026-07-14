import { useNavigate } from 'react-router-dom';
import {
  Phone, MessageCircle, Mail, MessageSquare, BellRing, Users, Zap, ChevronRight,
} from 'lucide-react';
import { AutomationStatusBadge } from './AutomationStatusBadge';
import type { AutomationJob, AutomationJobType } from '@schoolos/types';

const TYPE_CONFIG: Record<AutomationJobType, { label: string; icon: React.ElementType; iconBg: string; iconColor: string }> = {
  VOICE_CALL:       { label: 'Voice Call',       icon: Phone,          iconBg: 'bg-green-50',  iconColor: 'text-green-600' },
  WHATSAPP:         { label: 'WhatsApp',          icon: MessageCircle,  iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  EMAIL:            { label: 'Email',             icon: Mail,           iconBg: 'bg-blue-50',   iconColor: 'text-[#5B21B6]' },
  SMS:              { label: 'SMS',               icon: MessageSquare,  iconBg: 'bg-orange-50', iconColor: 'text-orange-600' },
  FEE_REMINDER:     { label: 'Fee Reminder',      icon: BellRing,       iconBg: 'bg-amber-50',  iconColor: 'text-amber-600' },
  PTM_REMINDER:     { label: 'PTM Reminder',      icon: BellRing,       iconBg: 'bg-purple-50', iconColor: 'text-purple-600' },
  GENERAL_BROADCAST:{ label: 'Broadcast',         icon: Users,          iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600' },
  CUSTOM:           { label: 'Custom',            icon: Zap,            iconBg: 'bg-gray-50',   iconColor: 'text-gray-600' },
};

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const durationMs = (start?: string, end?: string): string => {
  if (!start || !end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60_000)}m`;
};

interface AutomationJobCardProps {
  job: AutomationJob;
}

export const AutomationJobCard = ({ job }: AutomationJobCardProps) => {
  const navigate = useNavigate();
  const cfg = TYPE_CONFIG[job.type] ?? TYPE_CONFIG.CUSTOM;
  const Icon = cfg.icon;

  return (
    <button
      onClick={() => navigate(`/administration/automation/${job._id}`)}
      className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4
                 hover:border-gray-200 hover:shadow-md transition-all text-left"
      type="button"
    >
      {/* Type icon */}
      <div className={`w-11 h-11 rounded-xl ${cfg.iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${cfg.iconColor}`} strokeWidth={1.75} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-gray-900">{cfg.label}</span>
          <AutomationStatusBadge status={job.status} />
          {job.retryCount > 0 && (
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
              Retry #{job.retryCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 mt-1.5 flex-wrap">
          <span className="text-xs text-gray-400">Provider: <span className="font-medium text-gray-600 uppercase">{job.provider}</span></span>
          <span className="text-xs text-gray-400">By: <span className="font-medium text-gray-600">{job.triggeredBy}</span></span>
          <span className="text-xs text-gray-400">Started: <span className="font-medium text-gray-600">{formatDate(job.startedAt)}</span></span>
          {(job.status === 'COMPLETED' || job.status === 'FAILED') && (
            <span className="text-xs text-gray-400">
              Duration: <span className="font-medium text-gray-600">
                {durationMs(job.startedAt, job.completedAt ?? job.failedAt)}
              </span>
            </span>
          )}
        </div>
        {job.errorMessage && (
          <p className="text-xs text-red-500 mt-1 truncate">{job.errorMessage}</p>
        )}
      </div>

      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
    </button>
  );
};
