/** Parses YYYY-MM-DD as a local day (`new Date('2026-11-27')` would be UTC midnight). */
function localDay(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDay(iso: string): string {
  return localDay(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function dueStatus(dueDate: string): { label: string; tone: 'soon' | 'later' | 'past' } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((localDay(dueDate).getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return { label: `Was due ${formatDay(dueDate)}`, tone: 'past' };
  if (days === 0) return { label: 'Due today', tone: 'soon' };
  if (days === 1) return { label: 'Due tomorrow', tone: 'soon' };
  return { label: `Due ${formatDay(dueDate)}`, tone: 'later' };
}
