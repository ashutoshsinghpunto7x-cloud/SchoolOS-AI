import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Receipt, MessageSquare, CalendarClock, Repeat, Loader2 } from 'lucide-react';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '../hooks/useNotifications';
import { LeaveRequestReviewModal } from '@/features/leave-requests/components/LeaveRequestReviewModal';
import { cn } from '@/lib/utils';
import type { AppNotification } from '@schoolos/types';
import { useAuth } from '@/features/auth/hooks/useAuth';

const relativeTime = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const NotificationIcon = ({ type }: { type: AppNotification['type'] }) =>
  type === 'defaulters_list' ? (
    <Receipt className="w-4 h-4 text-amber-600" strokeWidth={2} />
  ) : type === 'leave_request' ? (
    <CalendarClock className="w-4 h-4 text-purple-600" strokeWidth={2} />
  ) : type === 'substitution' ? (
    <Repeat className="w-4 h-4 text-red-600" strokeWidth={2} />
  ) : (
    <MessageSquare className="w-4 h-4 text-blue-600" strokeWidth={2} />
  );

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [openLeaveRequestId, setOpenLeaveRequestId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const { user } = useAuth();
  const navigate = useNavigate();
  const usePillStyle = user?.role === 'accountant' || user?.role === 'teacher' || user?.role === 'principal';

  function handleNotificationClick(n: AppNotification) {
    if (!n.isRead) markRead.mutate(n._id);
    const leaveRequestId = n.type === 'leave_request' ? (n.payload?.leaveRequestId as string | undefined) : undefined;
    if (leaveRequestId) {
      setOpenLeaveRequestId(leaveRequestId);
      setIsOpen(false);
      return;
    }
    // Every other type (defaulters_list, substitution, message, change_request)
    // opens the shared full-page notification detail view.
    navigate(`/notifications/${n._id}`);
    setIsOpen(false);
  }

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  useEffect(() => {
    if (!isOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "relative p-2 rounded-xl transition-all duration-200",
          usePillStyle
            ? "bg-white dark:bg-white/5 border border-[#E8E8E8] dark:border-white/10 text-gray-500 dark:text-white/60 hover:bg-[#A855F7]/5 hover:border-[#A855F7]/20 hover:text-[#5B21B6] shadow-sm"
            : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        )}
        aria-label="Notifications"
        type="button"
      >
        <Bell className="w-[18px] h-[18px]" strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[15px] h-[15px] px-[3px] rounded-full bg-red-500 ring-[1.5px] ring-white text-[9px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-x-4 top-[68px] z-30 mx-auto flex max-h-[70vh] max-w-sm flex-col overflow-hidden rounded-2xl border border-[#E8E8E8] dark:border-white/10 bg-white dark:bg-[#150C29] shadow-[0_10px_30px_rgba(0,0,0,0.12)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:max-h-[28rem] sm:w-80 sm:max-w-none sm:shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/10">
            <p className="text-sm font-bold text-gray-900 dark:text-white">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50"
                type="button"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400 dark:text-white/30" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center px-4">
                <Bell className="w-8 h-8 text-gray-200 dark:text-white/15 mx-auto mb-2" />
                <p className="text-sm text-gray-400 dark:text-white/40">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n._id}
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b border-gray-50 dark:border-white/5 last:border-0 flex gap-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/5',
                    !n.isRead && 'bg-blue-50/40 dark:bg-blue-400/10',
                  )}
                  type="button"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <NotificationIcon type={n.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">{n.title}</p>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
                    </div>
                    {n.priority === 'high' && (
                      <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-red-400/10 text-red-600 dark:text-red-300 text-[10px] font-bold uppercase tracking-wide">
                        Urgent
                      </span>
                    )}
                    <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[11px] text-gray-400 dark:text-white/30 mt-1">
                      {n.senderName} · {relativeTime(n.createdAt)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {openLeaveRequestId && (
        <LeaveRequestReviewModal
          leaveRequestId={openLeaveRequestId}
          // Reopen the notification panel on close instead of dropping the
          // teacher back on the bare page — closing this detail view should
          // feel like going "back" to the list it was opened from.
          onClose={() => { setOpenLeaveRequestId(null); setIsOpen(true); }}
        />
      )}
    </div>
  );
};
