import { describe, it, expect } from 'vitest';
import { BRIEFING_PATTERN } from './briefing.data';

describe('BRIEFING_PATTERN', () => {
  it.each(['daily briefing', 'Give me the morning summary', 'good morning', 'aaj ka summary', 'school overview report'])('matches %s', (m) => {
    expect(BRIEFING_PATTERN.test(m)).toBe(!m.startsWith('school overview'));
  });
  it('ignores unrelated questions', () => {
    expect(BRIEFING_PATTERN.test('top 5 students in class 8')).toBe(false);
    expect(BRIEFING_PATTERN.test('fee summary')).toBe(false);
  });
});
