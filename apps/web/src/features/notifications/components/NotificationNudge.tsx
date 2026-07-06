import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Bell } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

const SEEN_KEY = 'schoolos.notifNudge.lastSeenUnreadCount';

// Renders nothing — just watches unread notification count and nudges once per
// browser session (or when the count *grows*, e.g. a new message arrives).
// Deliberately small, auto-dismissing, and silent otherwise: the point raised
// was that big or frequent popups become annoying fast, so this only ever
// shows a single small corner toast, never a modal, never repeats for the same
// unread count.
export function NotificationNudge() {
  const { data } = useNotifications();
  const hasShownThisMount = useRef(false);

  useEffect(() => {
    const unreadCount = data?.unreadCount ?? 0;
    if (unreadCount === 0) return;
    if (hasShownThisMount.current) return;

    const lastSeen = Number(sessionStorage.getItem(SEEN_KEY) ?? '0');
    if (unreadCount <= lastSeen) return; // already nudged for this count (or fewer) this session

    hasShownThisMount.current = true;
    sessionStorage.setItem(SEEN_KEY, String(unreadCount));

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
  }, [data?.unreadCount]);

  return null;
}
