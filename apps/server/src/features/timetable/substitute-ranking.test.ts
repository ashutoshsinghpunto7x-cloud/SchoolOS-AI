import { describe, expect, it } from 'vitest';
import { classKey, rankSubstitutes, RankingInput } from './substitute-ranking';

const teacher = (id: string) => ({ teacherId: id, teacherName: id });

function input(overrides: Partial<RankingInput> = {}): RankingInput {
  return {
    teachers: ['absent', 'classBusy', 'classFree', 'classFreer', 'otherFreest', 'otherBusy'].map(teacher),
    classTeacherIds: new Set(['absent', 'classBusy', 'classFree', 'classFreer']),
    busySlots: new Map([
      ['classBusy', new Set(['p1'])],
      ['classFree', new Set(['p2', 'p3'])],
      ['classFreer', new Set(['p2'])],
      ['otherBusy', new Set(['p2', 'p3', 'p4'])],
    ]),
    absentIds: new Set(['absent']),
    daySlotIds: ['p1', 'p2', 'p3', 'p4'],
    slotId: 'p1',
    ...overrides,
  };
}

describe('rankSubstitutes', () => {
  it('puts class teachers first, then orders each group by free periods', () => {
    expect(rankSubstitutes(input()).map((s) => [s.teacherId, s.freePeriodsToday])).toEqual([
      ['classFreer', 3],
      ['classFree', 2],
      ['otherFreest', 4],
      ['otherBusy', 1],
    ]);
  });

  it('never suggests someone who is absent or busy in that period', () => {
    const ids = rankSubstitutes(input()).map((s) => s.teacherId);
    expect(ids).not.toContain('absent');
    expect(ids).not.toContain('classBusy');
  });

  it('keeps busy teachers when no period is chosen yet', () => {
    expect(rankSubstitutes(input({ slotId: undefined })).map((s) => s.teacherId)).toContain('classBusy');
  });

  it('leaves out the excluded teacher', () => {
    const ids = rankSubstitutes(input({ excludeTeacherId: 'classFreer' })).map((s) => s.teacherId);
    expect(ids).not.toContain('classFreer');
  });
});

describe('classKey', () => {
  it('matches the different ways a class is written', () => {
    expect(classKey('Class 10', 'a')).toBe(classKey('10-A'));
  });
});
