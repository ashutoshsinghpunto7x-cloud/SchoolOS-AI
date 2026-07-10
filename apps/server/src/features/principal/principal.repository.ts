import { Student } from '../students/student.model';
import { User } from '../users/user.model';
import { Teacher } from '../teachers/teacher.model';
import { Enquiry } from '../enquiries/enquiry.model';
import { Timetable } from '../timetable/timetable.model';
import { SchoolEvent } from '../events/event.model';
import type {
  PrincipalStudentStats,
  PrincipalTeacherStats,
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

  async getTeacherStats(schoolId: string): Promise<PrincipalTeacherStats> {
    const [total, active] = await Promise.all([
      User.countDocuments({ schoolId, role: 'teacher', deletedAt: { $exists: false } }),
      User.countDocuments({ schoolId, role: 'teacher', status: 'active', deletedAt: { $exists: false } }),
    ]);
    return { total, active };
  },

  /** Staff-directory counts (Teacher model, not User login accounts) — the same source LeaveRequest.teacherId points at. */
  async countTeachersRoster(schoolId: string): Promise<{ total: number; active: number }> {
    const [total, active] = await Promise.all([
      Teacher.countDocuments({ schoolId, isDeleted: false }),
      Teacher.countDocuments({ schoolId, isDeleted: false, employmentStatus: 'active' }),
    ]);
    return { total, active };
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

  async getUpcomingEvents(schoolId: string, days = 14): Promise<PrincipalUpcomingEvent[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const future = new Date(today);
    future.setDate(future.getDate() + days);

    const todayStr = today.toISOString().split('T')[0];
    const futureStr = future.toISOString().split('T')[0];

    const events = await SchoolEvent.find({
      schoolId,
      isDeleted: false,
      status: { $in: ['published', 'scheduled'] },
      startDate: { $gte: todayStr, $lte: futureStr },
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
