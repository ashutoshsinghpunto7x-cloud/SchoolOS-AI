import { AlarmClock, X } from 'lucide-react';
import type { Reminder } from '../reminders.storage';

interface ReminderDueModalProps {
  reminders: Reminder[];
  onDismiss: (id: string) => void;
}

// Stays on screen until each reminder is explicitly dismissed — deliberately
// not a toast, so a forgotten reminder can't be missed by a passing 8s popup.
export function ReminderDueModal({ reminders, onDismiss }: ReminderDueModalProps) {
  if (reminders.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-amber-50">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
            <AlarmClock className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900">
              {reminders.length > 1 ? `${reminders.length} reminders due` : 'Reminder'}
            </div>
            <div className="text-xs text-gray-500">Dismiss each one you've acted on</div>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
          {reminders.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{r.title}</p>
                <p className="text-xs text-gray-400">Set for {r.time}</p>
              </div>
              <button
                type="button"
                onClick={() => onDismiss(r.id)}
                className="flex-shrink-0 flex items-center gap-1 h-8 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Dismiss
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
