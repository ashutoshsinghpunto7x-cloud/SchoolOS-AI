import { Bell, BellOff, Loader2 } from 'lucide-react';
import { useEnablePushNotifications } from './useEnablePushNotifications';

// Sits in the notification dropdown header — only renders when there's
// something actionable for the user to do (not configured yet, or already
// granted, both stay silent so this never clutters the panel).
export const EnableNotificationsButton = () => {
  const { state, isEnabling, error, enable, isConfigured } = useEnablePushNotifications();

  if (!isConfigured || state === 'unsupported' || state === 'granted') return null;

  if (state === 'denied') {
    return (
      <span className="flex items-center gap-1 text-[11px] text-gray-400" title="Blocked in browser settings">
        <BellOff className="w-3.5 h-3.5" /> Blocked
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void enable()}
      disabled={isEnabling}
      className="flex items-center gap-1 text-xs font-semibold text-[#F97316] hover:text-[#C2410C] disabled:opacity-50"
      title={error ?? 'Get alerts on your phone, even with the app closed'}
    >
      {isEnabling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
      Enable push
    </button>
  );
};
