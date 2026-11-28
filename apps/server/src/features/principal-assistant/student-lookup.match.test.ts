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
