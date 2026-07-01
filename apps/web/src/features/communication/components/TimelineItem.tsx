import { Phone, MessageCircle, FileText, Lightbulb, Calendar, Mail, Megaphone, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CommStatusBadge } from './CommStatusBadge';
import { CallTranscriptViewer } from './CallTranscriptViewer';
import type { Communication, CommunicationType } from '@schoolos/types';

const TYPE_CONFIG: Record<
  CommunicationType,
  { icon: LucideIcon; iconBg: string; iconColor: string; showStatus: boolean }
> = {
  call: {
    icon: Phone,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
    showStatus: true,
  },
  whatsapp: {
    icon: MessageCircle,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    showStatus: true,
  },
  note: {
    icon: FileText,
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    showStatus: false,
  },
  email: {
    icon: Mail,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    showStatus: true,
  },
  sms: {
    icon: MessageCircle,
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600',
    showStatus: true,
  },
  broadcast: {
    icon: Megaphone,
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    showStatus: true,
  },
};

interface TimelineItemProps {
  communication: Communication;
  isLast: boolean;
}

export const TimelineItem = ({ communication, isLast }: TimelineItemProps) => {
  const config = TYPE_CONFIG[communication.type] ?? TYPE_CONFIG.note;
  const Icon = config.icon;

  const displayText = communication.summary || communication.message || '';

  const time = new Date(communication.createdAt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="flex gap-4">
      {/* Left: icon + connector line */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', config.iconBg)}>
          <Icon className={cn('w-5 h-5', config.iconColor)} strokeWidth={1.75} />
        </div>
        {!isLast && <div className="w-px flex-1 bg-gray-100 mt-2 mb-1 min-h-[20px]" />}
      </div>

      {/* Right: content card */}
      <div className={cn('flex-1 min-w-0 pb-5', isLast && 'pb-0')}>
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm flex flex-col gap-2">

          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-bold text-gray-900 leading-snug">{communication.title}</p>
            <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
              {config.showStatus && (
                <CommStatusBadge status={communication.status} />
              )}
              <span className="text-xs font-medium text-gray-400">{time}</span>
            </div>
          </div>

          {/* Summary / message body */}
          {displayText && (
            <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">
              {displayText}
            </p>
          )}

          {/* AI Recommendation */}
          {communication.recommendation && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 flex gap-2 mt-1">
              <Lightbulb className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" strokeWidth={2} />
              <p className="text-xs font-semibold text-gray-800 leading-snug">
                {communication.recommendation}
              </p>
            </div>
          )}

          {/* Next follow-up */}
          {communication.nextFollowUp && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-400 font-medium">Follow-up: </span>
              <span className="text-xs font-semibold text-gray-700">{communication.nextFollowUp}</span>
            </div>
          )}

          {/* Live call progress indicator */}
          {communication.type === 'call' && communication.status === 'RUNNING' && (
            <div className="flex items-center gap-2 mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-xs font-semibold text-green-600">Call in progress…</span>
            </div>
          )}

          {/* Transcript viewer — lazy loads on user interaction */}
          <CallTranscriptViewer communication={communication} />

          {/* Created by */}
          <p className="text-[11px] text-gray-300">{communication.createdBy}</p>
        </div>
      </div>
    </div>
  );
};
