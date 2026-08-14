import { X, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { NotificationItem } from '../types';

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
}

const CATEGORY_LABEL: Record<NotificationItem['category'], string> = {
  important: 'Important',
  school: 'School',
  academic: 'Academic',
  fees: 'Fees',
  events: 'Events',
};

export function NotificationDrawer({ open, onClose, notifications }: NotificationDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 z-40"
            aria-hidden="true"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E7E4DE]">
              <h2 className="text-base font-medium text-[#0D0D0D]">Notifications</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close notifications"
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F1EB] transition-colors"
              >
                <X className="w-4 h-4 text-[#1A1A1A]" strokeWidth={1.75} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20 px-6">
                  <Bell className="w-6 h-6 text-[#6B6B6B] mb-3" strokeWidth={1.5} />
                  <p className="text-sm text-[#6B6B6B]">You're all caught up.</p>
                </div>
              ) : (
                <ul className="divide-y divide-[#E7E4DE]">
                  {notifications.map((n) => (
                    <li key={n._id} className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[#A6752F] shrink-0" aria-hidden="true" />}
                        <span className="text-xs uppercase tracking-wide text-[#6B6B6B]">
                          {CATEGORY_LABEL[n.category]}
                        </span>
                      </div>
                      <p className="text-base text-[#0D0D0D] mt-1.5">{n.title}</p>
                      {n.detail && <p className="text-sm text-[#6B6B6B] mt-0.5">{n.detail}</p>}
                      <p className="text-xs text-[#6B6B6B] mt-1.5">{n.when}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
