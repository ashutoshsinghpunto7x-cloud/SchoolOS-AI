import { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Optional secondary action rendered to the left of Confirm/Cancel —
   *  e.g. a shortcut that does a bit more than the plain confirm (used by
   *  attendance save to also fill in unmarked students as present). */
  extraActionLabel?: string;
  onExtraAction?: () => void;
}

export const ConfirmDialog = ({
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
  extraActionLabel,
  onExtraAction,
}: ConfirmDialogProps) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const confirmCls =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white dark:bg-red-500 dark:hover:bg-red-600 dark:active:bg-red-700'
      : 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white dark:bg-amber-400 dark:hover:bg-amber-500 dark:active:bg-amber-600 dark:text-[#1A0F33]';

  const iconCls = variant === 'danger' ? 'text-red-500' : 'text-amber-500';
  const iconClsDark = variant === 'danger' ? 'dark:text-red-400' : 'dark:text-amber-300';
  const iconBg = variant === 'danger' ? 'bg-red-50' : 'bg-amber-50';
  const iconBgDark = variant === 'danger' ? 'dark:bg-red-500/10' : 'dark:bg-amber-400/10';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative bg-white dark:bg-[#150C29] rounded-2xl shadow-2xl w-full max-w-md p-6 dark:border dark:border-white/10">
        {/* Close */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/70 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          aria-label="Close"
          type="button"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className={`w-12 h-12 rounded-xl ${iconBg} ${iconBgDark} flex items-center justify-center mb-4`}>
          <AlertTriangle className={`w-6 h-6 ${iconCls} ${iconClsDark}`} />
        </div>

        {/* Content */}
        <h2 id="confirm-title" className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          {title}
        </h2>
        <p className="text-base text-gray-500 dark:text-white/50 mb-6">{description}</p>

        {/* Extra action — a full-width shortcut sitting above the main row so it
            doesn't compete for space on narrow screens. */}
        {extraActionLabel && onExtraAction && (
          <button
            onClick={onExtraAction}
            disabled={isLoading}
            className="mb-3 h-11 w-full rounded-xl bg-violet-600 hover:bg-violet-700 active:bg-violet-800
                       dark:bg-violet-500 dark:hover:bg-violet-600 dark:active:bg-violet-700
                       text-sm font-bold text-white transition-colors disabled:opacity-50"
            type="button"
          >
            {isLoading ? 'Please wait…' : extraActionLabel}
          </button>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end">
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={isLoading}
            className="h-11 px-5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-semibold text-gray-700 dark:text-white/70
                       hover:bg-gray-50 dark:hover:bg-white/10 active:bg-gray-100 dark:active:bg-white/15 transition-colors disabled:opacity-50"
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`h-11 px-5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 ${confirmCls}`}
            type="button"
          >
            {isLoading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
