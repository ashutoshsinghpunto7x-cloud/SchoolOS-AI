import { describe, it, expect } from 'vitest';
import { idCandidates, looseNameRegex } from './people.data';

describe('student lookup matching', () => {
  it('finds spelling variants', () => {
    expect(looseNameRegex('Aarav').test('Arav Sharma')).toBe(true);
    expect(looseNameRegex('Muhammad').test('Mohammad Ali')).toBe(true);
    expect(looseNameRegex('Riya').test('Reeya Singh')).toBe(true);
    expect(looseNameRegex('Aman').test('Rohan Gupta')).toBe(false);
  });
  it('extracts admission / roll numbers but not class numbers', () => {
    expect(idCandidates('attendance of ADM-1023')).toContain('ADM-1023');
    expect(idCandidates('FNIC/2024/045 marks')).toContain('FNIC/2024/045');
    expect(idCandidates('top 5 students in class 6')).not.toContain('6');
    expect(idCandidates('roll no 45 details')).toContain('45');
  });
});

import { parseDateRange } from './date-range';
describe('"today" is a one-day window', () => {
  it('resolves today / aaj to a single day', () => {
    expect(parseDateRange('ansh singh present today', '2026-11-28')).toEqual({ from: '2026-11-28', to: '2026-11-28', label: 'today' });
    expect(parseDateRange('aaj hazir hai?', '2026-11-28')?.from).toBe('2026-11-28');
  });
});

describe('name-start matching', () => {
  it('word-start beats substring (Ansh must not match Reyansh as a whole word)', () => {
    const starts = (t: string, name: string) => new RegExp(String.raw`(^|\s)` + t, 'i').test(name);
    expect(starts('ansh', 'Ansh Chauhan')).toBe(true);
    expect(starts('ansh', 'Reyansh Chauhan')).toBe(false);
    expect(starts('chauhan', 'Reyansh Chauhan')).toBe(true);
  });
});
