/** Formatting helpers shared by the weekly/monthly planner views — plain date-fns-free
 * formatting (no dependency on the events/ calendar components) to keep this feature
 * self-contained. */

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function formatDayShort(iso: string): string {
  const d = new Date(iso);
  return `${WEEKDAY_SHORT[d.getDay()]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

export function formatWeekday(iso: string): string {
  const d = new Date(iso);
  return WEEKDAY_SHORT[d.getDay()];
}

/** "Mon 2 Sep – Fri 6 Sep" (drops the repeated month when both dates share one). */
export function formatWeekRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const startLabel = `${WEEKDAY_SHORT[start.getDay()]} ${start.getDate()} ${MONTH_SHORT[start.getMonth()]}`;
  const endLabel = `${WEEKDAY_SHORT[end.getDay()]} ${end.getDate()} ${MONTH_SHORT[end.getMonth()]}`;
  return `${startLabel} – ${endLabel}`;
}

export function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}
