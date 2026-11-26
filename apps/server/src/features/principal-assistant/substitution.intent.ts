// Matches substitution requests by keyword (English, Hinglish and Hindi voice
// input) and works out which day is meant. No LLM call is needed.

const SUBSTITUTION = /substitu|\bproxy\b|सब्स्टि|सब्स्टी|सबस्टि|सबस्टी|सब्सटि|सब्सटी|प्रॉक्सी|स्थानापन्न/i;
const TOMORROW = /\btomorrow\b|\bkal\b|कल/i;

export interface SubstitutionRequest {
  date: string;
  dayLabel: 'today' | 'tomorrow';
}

export function parseSubstitutionRequest(message: string, now = new Date()): SubstitutionRequest | null {
  if (!SUBSTITUTION.test(message)) return null;
  const tomorrow = TOMORROW.test(message);
  const target = new Date(now.getTime() + (tomorrow ? 86_400_000 : 0));
  return {
    date: target.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
    dayLabel: tomorrow ? 'tomorrow' : 'today',
  };
}
