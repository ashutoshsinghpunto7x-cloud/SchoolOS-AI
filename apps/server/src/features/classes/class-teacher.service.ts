import { Student } from '../students/student.model';
import { teacherRepository } from '../teachers/teacher.repository';
import { classTeacherRepository } from './class-teacher.repository';
import { upsertClassTeacherSchema, removeClassTeacherSchema } from './class-teacher.validation';
import { NotFoundError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import type { ClassSectionSummary } from '@schoolos/types';

export const classTeacherService = {
  /** Every class+section that has at least one active student, with its assigned class teacher (if any). */
  async listClassSections(ctx: AuthContext): Promise<ClassSectionSummary[]> {
    const [groups, assignments] = await Promise.all([
      Student.aggregate<{ _id: { class: string; section: string }; count: number }>([
        { $match: { schoolId: ctx.schoolId, isDeleted: false } },
        { $group: { _id: { class: '$class', section: '$section' }, count: { $sum: 1 } } },
      ]),
      classTeacherRepository.findAll(ctx.schoolId),
    ]);

    const assignmentMap = new Map(
      assignments.map((a) => [`${a.class}||${a.section}`, a]),
    );

    return groups
      .map((g) => {
        const key = `${g._id.class}||${g._id.section}`;
        const assignment = assignmentMap.get(key);
        return {
          class: g._id.class,
          section: g._id.section,
          studentCount: g.count,
          teacherId: assignment?.teacherId,
          teacherName: assignment?.teacherName,
        };
      })
      .sort((a, b) => `${a.class}${a.section}`.localeCompare(`${b.class}${b.section}`, undefined, { numeric: true }));
  },

  async upsertClassTeacher(rawInput: unknown, ctx: AuthContext) {
    const input = upsertClassTeacherSchema.parse(rawInput);

    const teacher = await teacherRepository.findById(input.teacherId, ctx.schoolId);
    if (!teacher) throw new NotFoundError('Teacher');

    const assignment = await classTeacherRepository.upsert(
      ctx.schoolId, input.class, input.section, input.teacherId, teacher.fullName, ctx.displayName,
    );

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'class_teacher.assigned', resource: 'classes', resourceId: `${input.class}-${input.section}`,
      details: { class: input.class, section: input.section, teacherId: input.teacherId, teacherName: teacher.fullName },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return assignment;
  },

  async removeClassTeacher(rawInput: unknown, ctx: AuthContext): Promise<void> {
    const input = removeClassTeacherSchema.parse(rawInput);
    const removed = await classTeacherRepository.remove(ctx.schoolId, input.class, input.section);
    if (!removed) throw new NotFoundError('Class teacher assignment');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'class_teacher.unassigned', resource: 'classes', resourceId: `${input.class}-${input.section}`,
      details: { class: input.class, section: input.section },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });
  },
};
