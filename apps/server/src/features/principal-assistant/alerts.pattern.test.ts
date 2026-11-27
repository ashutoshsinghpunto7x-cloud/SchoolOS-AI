import { describe, it, expect } from 'vitest';
import { ALERTS_PATTERN } from './alerts.data';

describe('ALERTS_PATTERN', () => {
  it.each(['alerts', 'what needs my attention', 'kuch urgent hai kya', 'show me alerts'])('matches %s', (m) => {
    expect(ALERTS_PATTERN.test(m)).toBe(true);
  });
  it.each(['top 5 students in class 8', 'urgent maintenance requests', 'daily briefing'])('ignores %s', (m) => {
    expect(ALERTS_PATTERN.test(m)).toBe(false);
  });
});
