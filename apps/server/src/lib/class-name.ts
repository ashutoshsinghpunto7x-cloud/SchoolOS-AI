const ROMAN_TO_DIGIT: Record<string, string> = {
  I: '1', II: '2', III: '3', IV: '4', V: '5', VI: '6',
  VII: '7', VIII: '8', IX: '9', X: '10', XI: '11', XII: '12',
};

/** Canonical key for matching class names regardless of numeral format, so
 * "9" and "IX" (or "ix", " IX ") resolve to the same class instead of the
 * import engine creating a duplicate class/section catalog entry. */
export function classNameKey(raw: string): string {
  const trimmed = raw.trim().toUpperCase();
  return ROMAN_TO_DIGIT[trimmed] ?? trimmed;
}
