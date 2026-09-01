import { z } from 'zod';

// All three reports share the same date-range shape — defaults to the
// current month if omitted, since "show me everything ever" is rarely what
// a Principal actually wants from a reports screen.
export const reportDateRangeSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo:   z.string().optional(),
});

export function resolveDateRange(dateFrom?: string, dateTo?: string): { start: Date; end: Date } {
  const end = dateTo ? new Date(dateTo) : new Date();
  const start = dateFrom ? new Date(dateFrom) : new Date(end.getFullYear(), end.getMonth(), 1);
  // Whole-day bounds — a `dateTo` of today shouldn't cut off today's own records.
  end.setHours(23, 59, 59, 999);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}
