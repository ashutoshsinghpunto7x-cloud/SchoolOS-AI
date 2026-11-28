import { describe, it, expect } from 'vitest';
import {
  emptyState, resolveFollowUp, updateState, detectModule, ConversationState,
} from './conversation-state';
import { parseDateRange, defaultRange, shiftDays } from './date-range';
import { computeAttendanceStats, parseAttendanceClaim, checkAttendanceConsistency } from './attendance-math';
import { INTENT_ROLE_POLICY, isIntentAllowed, assertIntentAllowed } from './intent-access';
import { attendanceIntents } from './principal-assistant.intents';
import { feeIntents } from './fees.intents';
import { admissionsIntents } from './admissions.intents';
import { peopleIntents } from './people.intents';

const TODAY = '2026-11-28';

const aaravState = (): ConversationState =>
  updateState(emptyState(), {
    message: 'attendance of Aarav in last 30 days', reply: 'Aarav had 88% attendance.', intentId: 'STUDENT_LOOKUP',
    topicChanged: false, today: TODAY, params: { studentName: 'Aarav' },
    matchedStudent: { name: 'Aarav Sharma', className: '6', section: 'A' },
    dateRange: defaultRange(TODAY),
  });

describe('date ranges', () => {
  it('resolves last month across a year boundary', () => {
    expect(parseDateRange('what about last month?', '2026-01-10')).toMatchObject({ from: '2025-12-01', to: '2025-12-31' });
    expect(parseDateRange('last month', TODAY)).toMatchObject({ from: '2026-10-01', to: '2026-10-31' });
  });
  it('handles last N days and returns null when no period is named', () => {
    expect(parseDateRange('last 7 days', TODAY)).toMatchObject({ from: '2026-11-22', to: TODAY });
    expect(parseDateRange('show marks', TODAY)).toBeNull();
    expect(shiftDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('Test 1 — attendance follow-up "in days?"', () => {
  it('rewrites to a real day-count request for the same student and period', () => {
    const r = resolveFollowUp('In days?', aaravState(), TODAY);
    expect(r.deterministic).toBe(true);
    expect(r.message).toContain('Aarav Sharma');
    expect(r.message).toMatch(/present days and absent days/);
    expect(r.message).toContain('last 30 days');
  });
  it('counts days from records, never back-solved from a percentage', () => {
    const rows = [
      ...Array.from({ length: 22 }, (_, i) => ({ date: `2026-11-${String(i + 1).padStart(2, '0')}`, status: 'present' })),
      { date: '2026-11-23', status: 'absent' }, { date: '2026-11-24', status: 'absent' }, { date: '2026-11-25', status: 'absent' },
    ];
    const s = computeAttendanceStats(rows);
    expect(s).toMatchObject({ markedDays: 25, presentDays: 22, absentDays: 3, attendancePercent: 88 });
    expect(s.absentDates).toEqual(['2026-11-23', '2026-11-24', '2026-11-25']);
  });
});

describe('Test 2 — date modification keeps the class', () => {
  it('changes only the period', () => {
    const s = updateState(emptyState(), {
      message: 'attendance for class 6A', reply: 'ok', intentId: 'CLASS_ATTENDANCE_PERIOD', topicChanged: false, today: TODAY,
      params: { className: '6', section: 'A' },
    });
    const r = resolveFollowUp('Last month.', s, TODAY);
    expect(r.message).toBe('attendance of class 6A for last month');
    expect(r.carried).toContain('student/class');
  });
});

describe('Test 3 — pronoun resolves to the active student', () => {
  it('attaches Aarav to "his attendance"', () => {
    const marks = updateState(emptyState(), {
      message: "Aarav's marks", reply: 'ok', intentId: 'STUDENT_LOOKUP', topicChanged: false, today: TODAY,
      params: { studentName: 'Aarav' }, matchedStudent: { name: 'Aarav Sharma', className: '6', section: 'A' },
    });
    const r = resolveFollowUp('What about his attendance?', marks, TODAY);
    expect(r.message).toContain('Aarav Sharma');
    expect(r.message.toLowerCase()).toContain('attendance');
    expect(r.topicChanged).toBe(false);
  });
});

describe('Test 4 — "open it" navigates to the discussed module', () => {
  it('maps to the fee screen after a fee question', () => {
    const s = updateState(emptyState(), { message: 'pending fees', reply: 'x', intentId: 'FEE_SUMMARY', topicChanged: false, today: TODAY });
    expect(resolveFollowUp('open it', s, TODAY).message).toBe('open fee management');
  });
});

describe('Test 7 — inconsistent figures are reported, not "fixed"', () => {
  it('flags 88% vs 3 absent days in 30', () => {
    const issues = checkAttendanceConsistency(parseAttendanceClaim('Aarav had 88% attendance in 30 days and was absent for 3 days'));
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toMatch(/90%/);
  });
  it('stays silent when the numbers agree', () => {
    expect(checkAttendanceConsistency(parseAttendanceClaim('90% attendance in 30 days, absent for 3 days'))).toEqual([]);
  });
});

describe('Test 9 — topic change drops the old student', () => {
  it('does not mix Aarav into a fee-collection query', () => {
    const r = resolveFollowUp("Now show today's fee collection", aaravState(), TODAY);
    expect(r.topicChanged).toBe(true);
    expect(r.message).not.toContain('Aarav');
    const next = updateState(aaravState(), {
      message: r.message, reply: 'x', intentId: 'FEE_COLLECTION_PERIOD', topicChanged: true, today: TODAY,
    });
    expect(next.student).toBeNull();
    expect(next.module).toBe('fees');
  });
  it('a pronoun keeps the person even when the module changes', () => {
    const r = resolveFollowUp('and his fees?', aaravState(), TODAY);
    expect(r.topicChanged).toBe(false);
    expect(r.message).toContain('Aarav Sharma');
  });
  it('naming a new class replaces a remembered student', () => {
    const next = updateState(aaravState(), {
      message: 'attendance for class 8B', reply: 'x', intentId: 'CLASS_ATTENDANCE_PERIOD', topicChanged: false, today: TODAY,
      params: { className: '8', section: 'B' },
    });
    expect(next.student).toBeNull();
    expect(next.className).toBe('8');
  });
  it('detects modules', () => {
    expect(detectModule('pending fee collection')).toBe('fees');
    expect(detectModule('his attendance')).toBe('attendance');
  });
});

describe('Test 6 — role policy is default-deny', () => {
  const all = [...attendanceIntents, ...feeIntents, ...admissionsIntents, ...peopleIntents].map((i) => i.id);

  it('every registered intent has an explicit policy entry', () => {
    const missing = all.filter((id) => !(id in INTENT_ROLE_POLICY));
    expect(missing).toEqual([]);
  });
  it('teachers, parents, accountants, drivers and unknown roles can use nothing', () => {
    for (const role of ['teacher', 'parent', 'accountant', 'driver', 'reception', 'operations_manager', 'academic_coordinator', 'nobody']) {
      for (const id of all) expect(isIntentAllowed(id, role)).toBe(false);
    }
  });
  it('an unlisted intent is refused even for the principal', () => {
    expect(isIntentAllowed('SOME_NEW_INTENT', 'principal')).toBe(false);
    expect(() => assertIntentAllowed('SOME_NEW_INTENT', 'principal')).toThrow();
  });
  it('principal, admin and incharge keep access', () => {
    for (const role of ['principal', 'admin', 'incharge']) expect(isIntentAllowed('STUDENT_LOOKUP', role)).toBe(true);
  });
});
