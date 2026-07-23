import { Loader2, Check } from 'lucide-react';
import type { DraftStatus } from '@/lib/drafts/types';

function formatRelative(timestamp: number): string {
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

export function DraftStatusIndicator({
  status,
  lastSavedAt,
}: {
  status: DraftStatus;
  lastSavedAt: number | null;
}) {
  if (status === 'idle') return null;

  if (status === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-gray-400 dark:text-white/40">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Saving…
      </span>
    );
  }

  if (status === 'saved' && lastSavedAt) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-gray-400 dark:text-white/40">
        <Check className="w-3.5 h-3.5" />
        Saved {formatRelative(lastSavedAt)}
      </span>
    );
  }

  if (status === 'error') {
    return <span className="text-xs font-medium text-red-500 dark:text-red-400">Draft save error</span>;
  }

  return null;
}
