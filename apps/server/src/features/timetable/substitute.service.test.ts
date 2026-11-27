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
import { teacherRepository } from '../teachers/teacher.repository';
import { userRepository } from '../users/user.repository';
import { notificationRepository } from '../notifications/notification.repository';
import { internalMessageRepository } from '../internal-messages/internal-message.repository';
import { staffAttendanceRepository } from '../staff-attendance/staff-attendance.repository';

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

  it('puts a period back on the list when its substitute is cancelled', async () => {
    stubSchool([sub('s1', { status: 'cancelled', substituteTeacherId: 'mate' })]);
    const needed = await timetableService.getNeedsSubstitute('S', FRIDAY);
    expect(needed.map((n) => n.slotId)).toEqual(['p1']);
  });

  it('leaves out a period with an active substitute', async () => {
    stubSchool([sub('s1', { substituteTeacherId: 'mate' })]);
    await expect(timetableService.getNeedsSubstitute('S', FRIDAY)).resolves.toEqual([]);
  });

  it('suggests free teachers only, class teachers first, counting assigned substitutions', async () => {
    stubSchool([sub('s1', { class: '8', slotId: 'p2', substituteTeacherId: 'onSub' })]);
    const result = await timetableService.suggestSubstituteTeachers('S', '6', 'A', { date: FRIDAY, slotId: 'p1' });
    // 'away' is absent, 'freeOne' teaches 7-A in p1.
    expect(result.map((r) => [r.teacherId, r.teachesThisClass, r.freePeriodsToday]))
      .toEqual([['mate', true, 2], ['onSub', false, 2]]);
  });
});

describe('notifySubstituteTeacher', () => {
  const ctx = { schoolId: 'S', userId: 'u', displayName: 'Principal', role: 'principal' } as never;
  const data = {
    substituteTeacherId: 't1', class: '6', section: 'A', date: FRIDAY, slotId: 'p1', subjectName: 'Maths',
  };
  const stubAccount = (accountEmail: string) => {
    vi.spyOn(teacherRepository, 'findById')
      .mockResolvedValue({ email: 'home@x.com', loginEmail: 'login@school.com' } as never);
    vi.spyOn(userRepository, 'findByEmail').mockImplementation((async (email: string) =>
      email === accountEmail ? { _id: 'user1', schoolId: 'S', role: 'teacher' } : null) as never);
    vi.spyOn(periodSlotRepository, 'findById')
      .mockResolvedValue({ name: 'Period 1', startTime: '08:30', endTime: '09:15' } as never);
    return {
      bell: vi.spyOn(notificationRepository, 'create').mockResolvedValue({} as never),
      message: vi.spyOn(internalMessageRepository, 'create').mockResolvedValue({} as never),
    };
  };

  it.each(['login@school.com', 'home@x.com'])('sends a high priority alert to the account under %s', async (email) => {
    const { bell, message } = stubAccount(email);
    await expect(timetableService.notifySubstituteTeacher(data, ctx)).resolves.toBe(true);
    for (const spy of [bell, message]) {
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ recipientUserId: 'user1', priority: 'high' }));
    }
  });

  it.each([
    ['cancelled', /^Substitution cancelled:/, /has been cancelled/],
    ['reassigned', /^Substitution reassigned:/, /given to another teacher/],
  ] as const)('says the duty is off when it is %s', async (change, subject, body) => {
    const { message } = stubAccount('login@school.com');
    await timetableService.notifySubstituteTeacher(data, ctx, change);
    expect(message).toHaveBeenCalledWith(expect.objectContaining({
      priority: 'high', subject: expect.stringMatching(subject), body: expect.stringMatching(body),
    }));
  });

  it('reports that nothing was sent when the teacher has no login', async () => {
    const { message } = stubAccount('nobody@x.com');
    await expect(timetableService.notifySubstituteTeacher(data, ctx)).resolves.toBe(false);
    expect(message).not.toHaveBeenCalled();
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
    return {
      notify: vi.spyOn(timetableService, 'notifySubstituteTeacher').mockResolvedValue(true),
      update: vi.spyOn(substituteRepository, 'update').mockResolvedValue(null),
      create: vi.spyOn(substituteRepository, 'create').mockResolvedValue({ _id: 'new' } as never),
      remove: vi.spyOn(substituteRepository, 'softDelete').mockResolvedValue(true),
    };
  };

  it('records whether the substitute was alerted', async () => {
    stubSchool();
    const { update } = stubWrites();
    await timetableService.createSubstitute(input, ctx);
    expect(update).toHaveBeenCalledWith('new', 'S', { teacherNotified: true });
  });

  it('keeps the assignment when the alert fails', async () => {
    stubSchool();
    const { notify, update } = stubWrites();
    notify.mockRejectedValue(new Error('down'));
    await expect(timetableService.createSubstitute(input, ctx)).resolves.toMatchObject({ _id: 'new' });
    expect(update).toHaveBeenCalledWith('new', 'S', { teacherNotified: false });
  });

  it('replaces the earlier substitute when a period is reassigned, and tells them', async () => {
    stubSchool([sub('old', { substituteTeacherId: 'onSub', date: new Date(FRIDAY) })]);
    vi.spyOn(staffAttendanceRepository, 'todayString').mockReturnValue(FRIDAY);
    const { remove, notify } = stubWrites();
    await timetableService.createSubstitute(input, ctx);
    expect(remove).toHaveBeenCalledWith('old', 'S', 'Principal');
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ substituteTeacherId: 'onSub' }), ctx, 'reassigned');
  });

  it.each([
    ['the same teacher is picked again', { substituteTeacherId: 'mate' }],
    ['the earlier record was already cancelled', { substituteTeacherId: 'onSub', status: 'cancelled' }],
  ])('sends no removal alert when %s', async (_name, earlier) => {
    stubSchool([sub('old', { date: new Date(FRIDAY), ...earlier })]);
    vi.spyOn(staffAttendanceRepository, 'todayString').mockReturnValue(FRIDAY);
    const { notify } = stubWrites();
    await timetableService.createSubstitute(input, ctx);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ substituteTeacherId: 'mate' }), ctx);
  });

  it('refuses a teacher already covering another class in that period', async () => {
    stubSchool([sub('other', { class: '8', substituteTeacherId: 'mate' })]);
    const { create } = stubWrites();
    await expect(timetableService.createSubstitute(input, ctx)).rejects.toThrow(/already covering/);
    expect(create).not.toHaveBeenCalled();
  });
});

describe('cancelling a substitution', () => {
  const ctx = { schoolId: 'S', userId: 'u', displayName: 'Principal', role: 'principal' } as never;
  const stubRecord = (over: Record<string, unknown> = {}) => {
    const record = sub('s1', {
      substituteTeacherId: 'mate', subjectName: 'Maths', date: new Date(FRIDAY), ...over,
    });
    vi.spyOn(staffAttendanceRepository, 'todayString').mockReturnValue(FRIDAY);
    vi.spyOn(substituteRepository, 'findById').mockResolvedValue(record);
    vi.spyOn(substituteRepository, 'update').mockResolvedValue(record);
    vi.spyOn(substituteRepository, 'softDelete').mockResolvedValue(true);
    return vi.spyOn(timetableService, 'notifySubstituteTeacher').mockResolvedValue(true);
  };

  it('alerts the substitute', async () => {
    const notify = stubRecord();
    await timetableService.updateSubstitute('s1', { status: 'cancelled' }, ctx);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ substituteTeacherId: 'mate', date: FRIDAY, slotId: 'p1' }), ctx, 'cancelled',
    );
  });

  it('alerts the substitute when the record is deleted', async () => {
    const notify = stubRecord();
    await timetableService.deleteSubstitute('s1', ctx);
    expect(notify).toHaveBeenCalledWith(expect.anything(), ctx, 'cancelled');
  });

  it('alerts the earlier substitute when the record is handed to someone else', async () => {
    const notify = stubRecord();
    await timetableService.updateSubstitute('s1', { substituteTeacherId: 'onSub' }, ctx);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ substituteTeacherId: 'mate' }), ctx, 'reassigned',
    );
  });

  it.each([
    ['it was already cancelled', { status: 'cancelled' }],
    ['the date has passed', { date: new Date('2026-11-20') }],
  ])('stays quiet when %s', async (_name, over) => {
    const notify = stubRecord(over);
    await timetableService.updateSubstitute('s1', { status: 'cancelled' }, ctx);
    expect(notify).not.toHaveBeenCalled();
  });

  it('still cancels when the alert fails', async () => {
    stubRecord().mockRejectedValue(new Error('down'));
    await expect(timetableService.updateSubstitute('s1', { status: 'cancelled' }, ctx)).resolves.toBeTruthy();
  });
});
