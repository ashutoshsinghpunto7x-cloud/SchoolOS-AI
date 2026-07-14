// In-app reminders — persisted client-side (localStorage), same-day only (v1).
// No backend/push infrastructure: this fires while the tab is open (even in a
// background tab), via an in-app toast plus a native browser Notification if
// permission was granted. It will NOT fire if the browser itself is fully
// closed or the device is off — that requires a service worker + push server,
// which was explicitly out of scope for this pass.

export interface Reminder {
  id: string;
  title: string;
  time: string; // "HH:MM", 24h, today
  firedAt?: string; // ISO — set once first detected due (fires the toast/notification once)
  /** Set only when the user explicitly dismisses the due-reminder popup — until
   *  then, the popup keeps reappearing so a forgotten reminder can't be missed. */
  acknowledged?: boolean;
}

const KEY = 'schoolos.reminders';

export function loadReminders(): Reminder[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Reminder[]) : [];
  } catch {
    return [];
  }
}

export function saveReminders(reminders: Reminder[]): void {
  localStorage.setItem(KEY, JSON.stringify(reminders));
}

export function acknowledgeReminder(id: string): void {
  const reminders = loadReminders();
  const target = reminders.find((r) => r.id === id);
  if (target) {
    target.acknowledged = true;
    saveReminders(reminders);
  }
}
