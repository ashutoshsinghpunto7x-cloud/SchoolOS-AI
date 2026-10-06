const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

/** "VI", "vi" and "6" all give 6; anything that isn't a class numeral gives null. */
export function classNumber(raw: string): number | null {
  const v = raw.trim().toUpperCase();
  const roman = ROMAN.indexOf(v);
  if (roman >= 0) return roman + 1;
  return /^\d{1,2}$/.test(v) ? parseInt(v, 10) : null;
}

/** Lowercases and drops punctuation so "evs" finds "E.V.S." */
export function stripPunctuation(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

/** True when every whitespace-separated term in `query` matches: a class numeral (6 / vi / VI) matches
 *  `cls` by number, anything else matches as punctuation-insensitive text inside `text`. */
export function matchesClassQuery(query: string, cls: string, text: string): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const classNo = classNumber(cls);
  const haystack = stripPunctuation(`${classNo == null ? cls : ''} ${text}`);
  return terms.every((t) => {
    const n = classNumber(t);
    return (n != null && n === classNo) || haystack.includes(stripPunctuation(t));
  });
}
