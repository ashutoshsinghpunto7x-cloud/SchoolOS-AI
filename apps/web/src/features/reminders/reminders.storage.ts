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
  firedAt?: string; // ISO — set once triggered so it won't repeat
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
