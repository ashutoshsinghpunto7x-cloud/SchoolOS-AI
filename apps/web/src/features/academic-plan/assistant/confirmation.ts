// Spoken or typed approval of a proposed change. Deliberately strict: every word
// must be a yes (or a no) word, so "yes but make it Friday" is treated as a
// correction and never saves anything.

const YES = new Set([
  'yes', 'yeah', 'yep', 'yup', 'ok', 'okay', 'confirm', 'confirmed', 'apply', 'approve', 'sure', 'proceed',
  'haan', 'han', 'ha', 'haa', 'theek', 'thik', 'sahi',
  'हाँ', 'हां', 'हा', 'ठीक', 'सही',
]);

const NO = new Set([
  'no', 'nope', 'cancel', 'stop', 'discard', 'nahi', 'nahin', 'nai', 'mat', 'ruko', 'rehne',
  'नहीं', 'नही', 'मत', 'रद्द', 'रुको', 'रहने',
]);

/** Words that may accompany a yes or a no without changing its meaning. */
const FILLER = new Set([
  'please', 'it', 'that', 'this', 'do', 'go', 'ahead', 'now', 'the', 'change', 'changes', 'sir', 'maam',
  'ji', 'hai', 'kar', 'karo', 'kardo', 'karna', 'do', 'de', 'dijiye', 'kijiye',
  'जी', 'है', 'कर', 'करो', 'दो', 'दीजिए', 'कीजिए', 'दे',
]);

const YES_PHRASES = new Set(['do it', 'go ahead', 'kar do', 'kar dijiye', 'कर दो', 'कर दीजिए']);
const NEGATORS = new Set(['do not', 'dont', "don't"]);

export function parseConfirmation(text: string): 'yes' | 'no' | null {
  const cleaned = text.toLowerCase().replace(/[.,!?।]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  if (YES_PHRASES.has(cleaned.replace(/ (please|ji|now|जी)$/, ''))) return 'yes';

  const words = cleaned.split(' ');
  if (words.length > 5) return null;

  const negated = words.some((w) => NO.has(w) || NEGATORS.has(w)) || NEGATORS.has(words.slice(0, 2).join(' '));
  if (negated) {
    return words.every((w) => NO.has(w) || NEGATORS.has(w) || FILLER.has(w) || w === 'not') ? 'no' : null;
  }
  return words.some((w) => YES.has(w)) && words.every((w) => YES.has(w) || FILLER.has(w)) ? 'yes' : null;
}
