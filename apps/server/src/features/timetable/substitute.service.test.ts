import { afterEach, describe, expect, it, vi } from 'vitest';
import { timetableService } from './timetable.service';
import { timetableRepository } from './timetable.repository';
import { periodSlotRepository } from './timetable.period.repository';
import { substituteRepository } from './timetable.substitute.repository';
import { Timetable } from './timetable.model';
import { TeacherTimetable } from '../teacher-timetable/teacher-timetable.model';
import { leaveRequestRepository } from '../leave-requests/leave-request.repository';
import { StaffAttendanceRecord } from '../staff-attendance/staff-attendance.model';
import { Teacher } from '../teachers/teacher.model';
import { classTeacherRepository } from '../classes/class-teacher.repository';
import { auditService } from '../audit/audit.service';

// Database reads are stubbed; the service logic runs for real.
const FRIDAY = '2026-11-27';
const query = (result: unknown) => {
  const q = { select: () => q, sort: () => q, lean: () => Promise.resolve(result) };
  return q as never;
};
const entry = (slotId: string, teacherId: string) => ({ dayOfWeek: 5, slotId, teacherId, subjectName: 'Maths' });
const sub = (id: string, over: Record<string, unknown>) =>
  ({ _id: id, class: '6', section: 'A', slotId: 'p1', status: 'active', ...over }) as never;

function stubSchool(substitutes: never[] = []) {
  const teachers = ['away', 'mate', 'freeOne', 'onSub'].map((id) => ({
    _id: id, fullName: id, employeeId: `EMP-${id}`, assignedClasses: [],
  }));
  vi.spyOn(leaveRequestRepository, 'findApprovedForDate').mockResolvedValue([]);
  vi.spyOn(StaffAttendanceRecord, 'find').mockReturnValue(query([{ employeeId: 'EMP-away' }]));
  vi.spyOn(Teacher, 'find').mockImplementation(((filter: { employeeId?: unknown }) =>
    query(filter.employeeId ? [teachers[0]] : teachers)) as never);
  const timetables = [
    { _id: 'tt6a', class: '6', section: 'A', entries: [entry('p1', 'away'), entry('p2', 'mate')] },
    { _id: 'tt7a', class: '7', section: 'A', entries: [entry('p1', 'freeOne')] },
  ];
  vi.spyOn(Timetable, 'find').mockReturnValue(query(timetables));
  vi.spyOn(TeacherTimetable, 'find').mockReturnValue(query([]));
  vi.spyOn(substituteRepository, 'findAll').mockResolvedValue({ substitutes, total: substitutes.length, page: 1, limit: 100 });
  vi.spyOn(timetableRepository, 'findByClassSectionAnyYear').mockResolvedValue(timetables[0] as never);
  vi.spyOn(classTeacherRepository, 'findAll').mockResolvedValue([]);
  vi.spyOn(periodSlotRepository, 'findAll').mockResolvedValue(
    ['p1', 'p2', 'p3'].map((id) => ({ _id: id, isBreak: false, daysApplicable: [5] })) as never,
  );
}

afterEach(() => vi.restoreAllMocks());

describe('substitution for a teacher marked absent', () => {
  it('lists the periods of a teacher marked absent in staff attendance', async () => {
    stubSchool();
    const needed = await timetableService.getNeedsSubstitute('S', FRIDAY);
    expect(needed.map((n) => [n.class, n.slotId, n.originalTeacherId, n.absenceReason, n.timetableId]))
      .toEqual([['6', 'p1', 'away', 'absent', 'tt6a']]);
  });

  it('suggests free teachers only, class teachers first, counting assigned substitutions', async () => {
    stubSchool([sub('s1', { class: '8', slotId: 'p2', substituteTeacherId: 'onSub' })]);
    const result = await timetableService.suggestSubstituteTeachers('S', '6', 'A', { date: FRIDAY, slotId: 'p1' });
    // 'away' is absent, 'freeOne' teaches 7-A in p1.
    expect(result.map((r) => [r.teacherId, r.teachesThisClass, r.freePeriodsToday]))
      .toEqual([['mate', true, 2], ['onSub', false, 2]]);
  });
});

describe('createSubstitute', () => {
  const ctx = { schoolId: 'S', userId: 'u', displayName: 'Principal', role: 'principal' } as never;
  const input = {
    timetableId: 'tt6a', class: '6', section: 'A', date: FRIDAY, dayOfWeek: 5, slotId: 'p1',
    subjectName: 'Maths', substituteTeacherId: 'mate', substituteTeacherName: 'mate',
  };
  const stubWrites = () => {
    vi.spyOn(timetableRepository, 'findById').mockResolvedValue({ _id: 'tt6a' } as never);
    vi.spyOn(auditService, 'log').mockImplementation(() => undefined as never);
    vi.spyOn(timetableService, 'notifySubstituteTeacher').mockResolvedValue();
    return {
      create: vi.spyOn(substituteRepository, 'create').mockResolvedValue({ _id: 'new' } as never),
      remove: vi.spyOn(substituteRepository, 'softDelete').mockResolvedValue(true),
    };
  };

  it('replaces the earlier substitute when a period is reassigned', async () => {
    stubSchool([sub('old', { substituteTeacherId: 'onSub' })]);
    const { remove } = stubWrites();
    await timetableService.createSubstitute(input, ctx);
    expect(remove).toHaveBeenCalledWith('old', 'S', 'Principal');
  });

  it('refuses a teacher already covering another class in that period', async () => {
    stubSchool([sub('other', { class: '8', substituteTeacherId: 'mate' })]);
    const { create } = stubWrites();
    await expect(timetableService.createSubstitute(input, ctx)).rejects.toThrow(/already covering/);
    expect(create).not.toHaveBeenCalled();
  });
});
