/** Canonicalizes an academic-year string to the "YYYY-YY" short form the rest of the
 *  app derives from School Settings (e.g. the report card roster hub) — so a template
 *  saved as "2026-2027" still matches a roster/generate lookup for "2026-27". */
export function normalizeAcademicYear(raw: string): string {
  const trimmed = raw.trim();
  const full = trimmed.match(/^(\d{4})\s*-\s*(\d{4})$/);
  if (full) return `${full[1]}-${full[2].slice(-2)}`;
  return trimmed;
}
