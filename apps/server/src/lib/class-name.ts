const ROMAN_TO_DIGIT: Record<string, string> = {
  I: '1', II: '2', III: '3', IV: '4', V: '5', VI: '6',
  VII: '7', VIII: '8', IX: '9', X: '10', XI: '11', XII: '12',
};

const DIGIT_TO_ROMAN: Record<string, string> = Object.fromEntries(
  Object.entries(ROMAN_TO_DIGIT).map(([roman, digit]) => [digit, roman]),
);

/** Canonical key for matching class names regardless of numeral format, so
 * "9" and "IX" (or "ix", " IX ") resolve to the same class instead of the
 * import engine creating a duplicate class/section catalog entry. */
export function classNameKey(raw: string): string {
  const trimmed = raw.trim().toUpperCase();
  return ROMAN_TO_DIGIT[trimmed] ?? trimmed;
}

/** Every spelling a stored `class` field might actually use for the same
 * grade — the raw value as typed, its digit form, and its Roman-numeral form
 * (each in original, upper, and lower case). Non-numeral names (Montessori,
 * Nursery, LKG, UKG…) just come back as their own case variants, since there's
 * no numeral to swap. Meant for `class: { $in: classNameVariants(cls) }`
 * queries so a Mongo lookup matches regardless of which spelling a given
 * record happened to be saved with — Student.class, SchoolClass.name, and
 * FeeRecord.class aren't guaranteed to agree on digit vs Roman numeral for
 * the same grade. See [[project_planner_chapter_403_bug]]. */
export function classNameVariants(raw: string): string[] {
  const trimmed = raw.trim();
  const upper = trimmed.toUpperCase();
  const forms = new Set([trimmed, upper, upper.toLowerCase()]);
  const alt = ROMAN_TO_DIGIT[upper] ?? DIGIT_TO_ROMAN[upper];
  if (alt) forms.add(alt).add(alt.toUpperCase()).add(alt.toLowerCase());
  return [...forms];
}
