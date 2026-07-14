import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { loadReminders, saveReminders, acknowledgeReminder, Reminder } from '../reminders.storage';
import { ReminderDueModal } from './ReminderDueModal';

const CHECK_INTERVAL_MS = 15_000;

function nowHM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Renders the due-reminders modal — mounted once (in AppLayout) so reminders
// keep firing regardless of whether the clock's reminder panel is open or
// closed. A reminder stays in `dueReminders` (and the modal stays visible)
// until the user explicitly dismisses it — it does not auto-clear.
export function ReminderWatcher() {
  const [dueReminders, setDueReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    const check = () => {
      const reminders = loadReminders();
      const currentHM = nowHM();
      let changed = false;

      const due = reminders.filter((r) => !r.acknowledged && r.time <= currentHM);

      for (const r of due) {
        if (!r.firedAt) {
          r.firedAt = new Date().toISOString();
          changed = true;

          toast(r.title, { description: 'Reminder', duration: 8000 });

          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try {
              new Notification(r.title, { body: 'SchoolOS reminder' });
            } catch {
              // Notification API can throw in some contexts (e.g. insecure origin) — the toast above already covers it.
            }
          }
        }
      }

      if (changed) saveReminders(reminders);
      setDueReminders(due);
    };

    check();
    const id = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const handleDismiss = (id: string) => {
    acknowledgeReminder(id);
    setDueReminders((prev) => prev.filter((r) => r.id !== id));
  };

  return <ReminderDueModal reminders={dueReminders} onDismiss={handleDismiss} />;
}
