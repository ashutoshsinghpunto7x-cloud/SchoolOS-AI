import { Student } from '../students/student.model';
import { Teacher } from '../teachers/teacher.model';
import { Enquiry } from '../enquiries/enquiry.model';
import { Timetable } from '../timetable/timetable.model';
import { SchoolEvent } from '../events/event.model';
import { StaffAttendanceRecord } from '../staff-attendance/staff-attendance.model';
import type {
  PrincipalStudentStats,
  PrincipalAdmissionStats,
  PrincipalTimetableStats,
  PrincipalUpcomingEvent,
} from '@schoolos/types';

export const principalRepository = {
  async getStudentStats(schoolId: string): Promise<PrincipalStudentStats> {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, active, newThisMonth] = await Promise.all([
      Student.countDocuments({ schoolId, isDeleted: false }),
      Student.countDocuments({ schoolId, isDeleted: false, admissionStatus: 'active' }),
      Student.countDocuments({
        schoolId,
        isDeleted: false,
        admissionStatus: 'active',
        createdAt: { $gte: firstOfMonth },
      }),
    ]);

    return { total, active, newThisMonth };
  },

  /** Staff-directory counts (Teacher model, not User login accounts) — the same source LeaveRequest.teacherId points at. */
  async countTeachersRoster(schoolId: string): Promise<{ total: number; active: number }> {
    const [total, active] = await Promise.all([
      Teacher.countDocuments({ schoolId, isDeleted: false }),
      Teacher.countDocuments({ schoolId, isDeleted: false, employmentStatus: 'active' }),
    ]);
    return { total, active };
  },

  /** Teachers actually checked in today via the Attendance Scanner — the
   *  StaffAttendanceRecord is keyed by Employee.employeeId, which Teacher
   *  docs also carry (they mirror one HR Employee record each), so we join
   *  on that shared string id. This is the single source of truth "teachers
   *  present" should mean everywhere (Daily Briefing, AI Assistant, School
   *  Health) — previously each of those derived a different number from
   *  Teacher.employmentStatus instead, which never reflected scanner data. */
  async countPresentTeachersToday(schoolId: string, date: string): Promise<number> {
    const teacherEmployeeIds = await Teacher.distinct('employeeId', { schoolId, isDeleted: false });
    if (teacherEmployeeIds.length === 0) return 0;

    return StaffAttendanceRecord.countDocuments({
      schoolId,
      date,
      employeeId: { $in: teacherEmployeeIds },
      status: { $in: ['present', 'late', 'half_day'] },
    });
  },

  async getAdmissionStats(schoolId: string): Promise<PrincipalAdmissionStats> {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [stageAgg, pendingFollowUp, newThisMonth, convertedThisMonth] = await Promise.all([
      Enquiry.aggregate<{ _id: string; count: number }>([
        { $match: { schoolId, isDeleted: false } },
        { $group: { _id: '$stage', count: { $sum: 1 } } },
      ]),
      Enquiry.countDocuments({
        schoolId,
        isDeleted: false,
        followUpDate: { $lte: now },
        stage: { $nin: ['converted', 'lost'] },
      }),
      Enquiry.countDocuments({
        schoolId,
        isDeleted: false,
        createdAt: { $gte: firstOfMonth },
      }),
      Enquiry.countDocuments({
        schoolId,
        isDeleted: false,
        stage: 'converted',
        'conversionData.convertedAt': { $gte: firstOfMonth },
      }),
    ]);

    const byStage: Record<string, number> = {};
    let total = 0;
    for (const row of stageAgg) {
      byStage[row._id] = row.count;
      total += row.count;
    }

    return { total, byStage, pendingFollowUp, newThisMonth, convertedThisMonth };
  },

  async getTimetableStats(schoolId: string): Promise<PrincipalTimetableStats> {
    const [published, draft] = await Promise.all([
      Timetable.countDocuments({ schoolId, status: 'published', isDeleted: false }),
      Timetable.countDocuments({ schoolId, status: 'draft', isDeleted: false }),
    ]);
    return { published, draft };
  },

  async getUpcomingEvents(schoolId: string): Promise<PrincipalUpcomingEvent[]> {
    // Rolling window from today forward (not "current calendar month") — a
    // month-bounded query went silent for the rest of the month once fewer
    // than 10 events remained between today and month-end, e.g. an event on
    // the 11th of next month wouldn't show as "Next Event" on the 31st.
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const events = await SchoolEvent.find({
      schoolId,
      isDeleted: false,
      status: { $in: ['published', 'scheduled'] },
      // startDate is a Mongoose Date field — must compare against Date
      // instances, not strings, or MongoDB's cross-BSON-type ordering makes
      // this range silently match nothing (Date always sorts after String).
      startDate: { $gte: startOfToday },
    })
      .sort({ startDate: 1 })
      .limit(10)
      .select('_id title eventType startDate isAllDay startTime')
      .lean();

    return events.map((e) => ({
      id: (e._id as { toString(): string }).toString(),
      title: e.title,
      eventType: e.eventType,
      startDate: (e.startDate as Date).toISOString(),
      isAllDay: e.isAllDay,
      startTime: e.startTime,
    }));
  },
};
