import { History } from 'lucide-react';

function formatRelative(timestamp: number): string {
  const minutes = Math.round((Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

export function RecoveryBanner({
  savedAt,
  onRestore,
  onDiscard,
}: {
  savedAt: number | null;
  onRestore: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="mx-4 mt-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-2xl px-4 py-3 flex items-center gap-3">
      <History className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
          Unsaved changes found from a previous session
        </p>
        {savedAt && (
          <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">Saved {formatRelative(savedAt)}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onDiscard}
          className="h-8 px-3 bg-white dark:bg-white/5 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-semibold hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={onRestore}
          className="h-8 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold transition-colors"
        >
          Restore
        </button>
      </div>
    </div>
  );
}
