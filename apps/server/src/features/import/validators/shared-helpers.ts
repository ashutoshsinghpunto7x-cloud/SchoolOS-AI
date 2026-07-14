/**
 * Helpers shared across import validators that need to accept the same real-
 * world data in more than one shape — a combined "Class" column like "NUR-A"
 * / "10-A" / "9B", or already-separate Class + Section columns — without
 * forcing the source file into one specific layout.
 */

/** Strips a leading "Class "/"Grade "/"Std " word some exports prefix onto
 *  the value itself (e.g. "Class 8-C" → "8-C") before attempting to split. */
function stripClassPrefix(raw: string): string {
  return raw.replace(/^(class|grade|std\.?|standard)\s+/i, '').trim();
}

/** Splits a combined "NUR-A" / "10-A" / "9B" / "Class 8-C" style value into
 *  its class and section parts. Returns null if the value doesn't look like
 *  it has a trailing section at all (e.g. a bare "NUR" or "10"). */
export function splitClassSection(classRaw: string): { klass: string; section: string } | null {
  const trimmed = stripClassPrefix(classRaw.trim());
  const withSeparator = trimmed.match(/^(.+?)[\s\-_/]+([A-Za-z]{1,3})$/);
  if (withSeparator) return { klass: withSeparator[1].trim(), section: withSeparator[2].trim() };
  const tight = trimmed.match(/^(\d+)([A-Za-z]{1,3})$/);
  if (tight) return { klass: tight[1], section: tight[2] };
  return null;
}

export interface ResolvedClassSection {
  class: string;
  section: string;
  /** True if the section came from splitting the class value rather than
   *  its own column — surfaced as a warning so the user can double check it. */
  inferred: boolean;
}

/**
 * Accepts a school's data in either shape:
 *  - Separate Class + Section columns ("NUR" / "A") — used as-is.
 *  - One combined Class column ("NUR-A") with no Section column — split.
 *  - Both, redundantly ("NUR-A" and "A") — the combined value's suffix is
 *    stripped from Class once it's confirmed to match the given Section, so
 *    "NUR-A" doesn't end up stored as the class name.
 * Returns null if there isn't enough information to resolve both fields —
 * left to the caller's own required-field validation to report clearly.
 */
export function resolveClassSection(rawClass: unknown, rawSection: unknown): ResolvedClassSection | null {
  const classStr = typeof rawClass === 'string' ? rawClass.trim() : '';
  const sectionStr = typeof rawSection === 'string' ? rawSection.trim() : '';

  if (classStr && sectionStr) {
    const split = splitClassSection(classStr);
    // Combined value's suffix agrees with the explicit section — use the
    // clean class part instead of storing "NUR-A" verbatim.
    if (split && split.section.toLowerCase() === sectionStr.toLowerCase()) {
      return { class: split.klass, section: sectionStr, inferred: false };
    }
    return { class: classStr, section: sectionStr, inferred: false };
  }

  if (classStr && !sectionStr) {
    const split = splitClassSection(classStr);
    if (split) return { class: split.klass, section: split.section, inferred: true };
    return null; // class given but no section anywhere to be found
  }

  return null; // no usable class value at all
}

/** Expands common single-letter/abbreviated gender values ("M", "F", "O")
 *  to the schema's full enum — real-world sheets almost always use these
 *  instead of spelling "male"/"female" out. */
export function normalizeGenderAbbrev(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (key === 'm') return 'male';
  if (key === 'f') return 'female';
  if (key === 'o') return 'other';
  return key;
}
