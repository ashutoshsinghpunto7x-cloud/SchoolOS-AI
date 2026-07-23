import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  return (
    <div className="mx-4 mt-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-2xl px-4 py-3 flex items-center gap-3">
      <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
      <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
        You're offline — changes are saved on this device and will sync once you're back online.
      </p>
    </div>
  );
}
