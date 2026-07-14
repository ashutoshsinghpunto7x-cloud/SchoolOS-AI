import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Bell } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

const SEEN_KEY = 'schoolos.notifNudge.lastSeenUnreadCount';
const RE_ALERT_MS = 20 * 60 * 1000; // 20 minutes

function showNudge(unreadCount: number) {
  toast(
    `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`,
    {
      icon: <Bell className="w-4 h-4" />,
      description: 'Tap the bell icon to view them.',
      duration: 5000,
      action: {
        label: 'View',
        onClick: () => {
          document
            .querySelector<HTMLButtonElement>('button[aria-label="Notifications"]')
            ?.click();
        },
      },
    },
  );
}

// Shows a toast when there are unread notifications:
// • Once on page load / when count grows.
// • Again every 20 minutes while notifications remain unread,
//   so the principal doesn't accidentally miss a message.
export function NotificationNudge() {
  const { data } = useNotifications();
  const hasShownThisMount = useRef(false);
  const reAlertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unreadCount = data?.unreadCount ?? 0;

    // Clear any pending re-alert whenever the count changes.
    if (reAlertTimerRef.current) {
      clearTimeout(reAlertTimerRef.current);
      reAlertTimerRef.current = null;
    }

    if (unreadCount === 0) {
      hasShownThisMount.current = false;
      return;
    }

    const lastSeen = Number(sessionStorage.getItem(SEEN_KEY) ?? '0');

    if (!hasShownThisMount.current || unreadCount > lastSeen) {
      hasShownThisMount.current = true;
      sessionStorage.setItem(SEEN_KEY, String(unreadCount));
      showNudge(unreadCount);
    }

    // Schedule a re-alert after 20 minutes if still unread.
    reAlertTimerRef.current = setTimeout(() => {
      const currentCount = data?.unreadCount ?? 0;
      if (currentCount > 0) showNudge(currentCount);
    }, RE_ALERT_MS);

    return () => {
      if (reAlertTimerRef.current) clearTimeout(reAlertTimerRef.current);
    };
  }, [data?.unreadCount]);

  return null;
}
