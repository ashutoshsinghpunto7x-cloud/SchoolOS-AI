import { useEffect, useRef, useState } from 'react';
import { Bell, Plus, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { loadReminders, saveReminders, type Reminder } from '../reminders.storage';

export function ReminderPanel({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [reminders, setReminders] = useState<Reminder[]>(() => loadReminders());
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  function addReminder() {
    if (!title.trim() || !time) return;
    // Ask for system-notification permission on first use, so the reminder
    // can pop up even if this tab isn't focused (still requires the browser
    // process itself to be running — see the note below).
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    const next = [...reminders, { id: crypto.randomUUID(), title: title.trim(), time }];
    setReminders(next);
    saveReminders(next);
    setTitle('');
    setTime('');
  }

  function removeReminder(id: string) {
    const next = reminders.filter((r) => r.id !== id);
    setReminders(next);
    saveReminders(next);
  }

  const sorted = [...reminders].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div
      ref={ref}
      className="absolute right-0 top-[calc(100%+8px)] z-50 w-80 bg-white rounded-2xl border border-[#E8E8E8] shadow-[0_16px_48px_rgba(0,0,0,0.14)] p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-semibold text-gray-900 flex items-center gap-1.5">
          <Bell className="w-4 h-4 text-[#0B3D2E]" /> Reminders
        </p>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-1.5 mb-3 max-h-48 overflow-y-auto">
        {sorted.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No reminders set for today.</p>
        ) : (
          sorted.map((r) => (
            <div
              key={r.id}
              className={cn(
                'flex items-center gap-2 px-2.5 py-2 rounded-xl',
                r.firedAt ? 'bg-gray-50 opacity-50' : 'bg-[#10B981]/5',
              )}
            >
              <span className="text-xs font-bold text-gray-700 font-mono shrink-0">{r.time}</span>
              <span className="flex-1 min-w-0 text-xs text-gray-700 truncate">{r.title}</span>
              <button
                type="button"
                onClick={() => removeReminder(r.id)}
                className="text-gray-300 hover:text-red-500 shrink-0"
                aria-label="Remove reminder"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="h-9 px-2 rounded-lg border border-gray-200 text-xs w-24 focus:outline-none focus:border-[#10B981]/40"
        />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Reminder..."
          onKeyDown={(e) => e.key === 'Enter' && addReminder()}
          className="flex-1 h-9 px-2.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-[#10B981]/40"
        />
        <button
          type="button"
          onClick={addReminder}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#0B3D2E] hover:bg-[#08251B] text-white shrink-0 transition-colors"
          aria-label="Add reminder"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <p className="text-[10px] text-gray-400 mt-2">
        Fires while this tab is open, even in the background — won't fire if the browser is fully closed.
      </p>
    </div>
  );
}
