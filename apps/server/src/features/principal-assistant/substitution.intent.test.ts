import { describe, expect, it } from 'vitest';
import { parseSubstitutionRequest } from './substitution.intent';

// 11pm IST on 27 Nov — still the 27th in India.
const NOW = new Date('2026-11-27T17:30:00Z');

describe('parseSubstitutionRequest', () => {
  it('reads today and tomorrow from English, Hinglish and Hindi', () => {
    expect(parseSubstitutionRequest('Substitutes today', NOW)?.date).toBe('2026-11-27');
    expect(parseSubstitutionRequest('who can substitute tomorrow?', NOW)?.date).toBe('2026-11-28');
    expect(parseSubstitutionRequest('kal ka substitution dikhao', NOW)?.date).toBe('2026-11-28');
    expect(parseSubstitutionRequest('आज के सब्स्टीट्यूट', NOW)?.date).toBe('2026-11-27');
  });

  it('ignores unrelated questions', () => {
    expect(parseSubstitutionRequest("today's attendance", NOW)).toBeNull();
  });
});
