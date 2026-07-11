import { teacherRepository, PaginatedTeachers, FindTeachersOptions } from './teacher.repository';
import { teacherNoteRepository } from './teacher.note.repository';
import {
  createTeacherSchema, updateTeacherSchema, changeStatusSchema,
  listTeachersSchema, createNoteSchema, updateNoteSchema,
} from './teacher.validation';
import { ITeacher } from './teacher.model';
import { ITeacherNote } from './teacher.note.model';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { User, IUser } from '../users/user.model';
import { nextSequence } from '../../lib/counter.model';

// ── Helpers ───────────────────────────────────────────────────────────────────

// Atomically incremented per school+year, so concurrent creates (e.g. every
// row of a bulk import batch processed in parallel) each get a distinct
// number in one DB round trip — no read-then-write race, no retries needed.
// `seedFrom` continues from the existing teacher count the first time this
// key is ever used, so schools with pre-existing teachers don't restart at 1.
const generateEmployeeId = async (schoolId: string): Promise<string> => {
  const year = new Date().getFullYear();
  const seq = await nextSequence(
    `teacher-employeeId:${schoolId}:${year}`,
    () => teacherRepository.countAll(schoolId)
  );
  return `EMP-${year}-${String(seq).padStart(4, '0')}`;
};

// ── Service ───────────────────────────────────────────────────────────────────

export const teacherService = {
  async createTeacher(rawInput: unknown, ctx: AuthContext): Promise<ITeacher> {
    const data = createTeacherSchema.parse(rawInput);
    const employeeId = await generateEmployeeId(ctx.schoolId);

    const teacher = await teacherRepository.create({
      ...data,
      employeeId,
      schoolId: ctx.schoolId,
      createdBy: ctx.displayName,
    });

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'teacher.created',
      resource: 'teachers',
      resourceId: teacher._id.toString(),
      details: { fullName: data.fullName, employeeId },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return teacher;
  },

  async listTeachers(rawQuery: unknown, ctx: AuthContext): Promise<PaginatedTeachers> {
    const opts = listTeachersSchema.parse(rawQuery);
    const options: FindTeachersOptions = {
      page:       opts.page,
      limit:      opts.limit,
      search:     opts.search,
      department: opts.department,
      status:     opts.status,
      subject:    opts.subject,
      class:      opts.class,
      sortBy:     opts.sortBy,
      sortOrder:  opts.sortOrder,
    };
    return teacherRepository.findAll(ctx.schoolId, options);
  },

  async searchTeachers(ctx: AuthContext, search?: string): Promise<ITeacher[]> {
    return teacherRepository.findForSearch(ctx.schoolId, search);
  },

  async getTeacher(id: string, ctx: AuthContext): Promise<ITeacher> {
    const teacher = await teacherRepository.findById(id, ctx.schoolId);
    if (!teacher) throw new NotFoundError('Teacher');
    return teacher;
  },

  async updateTeacher(id: string, rawInput: unknown, ctx: AuthContext): Promise<ITeacher> {
    const data = updateTeacherSchema.parse(rawInput);
    if (!Object.keys(data).length) throw new ValidationError('No fields to update');

    const teacher = await teacherRepository.update(id, ctx.schoolId, {
      ...data,
      updatedBy: ctx.displayName,
    });
    if (!teacher) throw new NotFoundError('Teacher');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'teacher.updated',
      resource: 'teachers',
      resourceId: id,
      details: { fields: Object.keys(data) },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return teacher;
  },

  async updatePhoto(id: string, dataUri: string, ctx: AuthContext): Promise<ITeacher> {
    const teacher = await teacherRepository.updatePhoto(id, ctx.schoolId, dataUri, ctx.displayName);
    if (!teacher) throw new NotFoundError('Teacher');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'teacher.updated', resource: 'teachers', resourceId: id,
      details: { fields: ['photoUrl'] }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return teacher;
  },

  async removePhoto(id: string, ctx: AuthContext): Promise<ITeacher> {
    const teacher = await teacherRepository.updatePhoto(id, ctx.schoolId, undefined, ctx.displayName);
    if (!teacher) throw new NotFoundError('Teacher');
    return teacher;
  },

  async changeStatus(id: string, rawInput: unknown, ctx: AuthContext): Promise<ITeacher> {
    const { status, reason } = changeStatusSchema.parse(rawInput);

    const existing = await teacherRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Teacher');

    const teacher = await teacherRepository.changeStatus(id, ctx.schoolId, status, ctx.displayName);
    if (!teacher) throw new NotFoundError('Teacher');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'teacher.status_changed',
      resource: 'teachers',
      resourceId: id,
      details: { from: existing.employmentStatus, to: status, reason },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return teacher;
  },

  async deleteTeacher(id: string, ctx: AuthContext): Promise<void> {
    const teacher = await teacherRepository.findById(id, ctx.schoolId);
    if (!teacher) throw new NotFoundError('Teacher');

    const deleted = await teacherRepository.softDelete(id, ctx.schoolId, ctx.displayName);
    if (!deleted) throw new NotFoundError('Teacher');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'teacher.deleted',
      resource: 'teachers',
      resourceId: id,
      details: { fullName: teacher.fullName },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });
  },

  // ── Link to User Account ───────────────────────────────────────────────────

  async linkUserAccount(teacherId: string, rawInput: unknown, ctx: AuthContext): Promise<ITeacher> {
    const { userId } = (rawInput as { userId?: unknown });
    if (!userId || typeof userId !== 'string') throw new ValidationError('userId is required');

    // Verify user exists and has teacher role
    const user = await User.findOne({ _id: userId, schoolId: ctx.schoolId })
      .select('email role firstName lastName')
      .lean() as Pick<IUser, 'email' | 'role' | 'firstName' | 'lastName'> | null;

    if (!user) throw new NotFoundError('User');
    if (user.role !== 'teacher') throw new ValidationError('Selected user does not have the Teacher role');
    if (!user.email) throw new ValidationError('Selected user has no email address');

    const teacher = await teacherRepository.findById(teacherId, ctx.schoolId);
    if (!teacher) throw new NotFoundError('Teacher');

    const updated = await teacherRepository.update(teacherId, ctx.schoolId, {
      email: user.email,
      updatedBy: ctx.displayName,
    });
    if (!updated) throw new NotFoundError('Teacher');

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'teacher.linked_user',
      resource:        'teachers',
      resourceId:      teacherId,
      details:         { linkedUserId: userId, linkedEmail: user.email },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });

    return updated;
  },

  // ── Notes ──────────────────────────────────────────────────────────────────

  async createNote(teacherId: string, rawInput: unknown, ctx: AuthContext): Promise<ITeacherNote> {
    const teacher = await teacherRepository.findById(teacherId, ctx.schoolId);
    if (!teacher) throw new NotFoundError('Teacher');

    const { content, type } = createNoteSchema.parse(rawInput);

    const note = await teacherNoteRepository.create({
      teacherId,
      schoolId: ctx.schoolId,
      type,
      content,
      createdByName: ctx.displayName,
      createdById: ctx.userId,
    });

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'teacher.note_added',
      resource: 'teacher_notes',
      resourceId: note._id.toString(),
      details: { teacherId, type },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return note;
  },

  async listNotes(teacherId: string, ctx: AuthContext): Promise<ITeacherNote[]> {
    const teacher = await teacherRepository.findById(teacherId, ctx.schoolId);
    if (!teacher) throw new NotFoundError('Teacher');
    return teacherNoteRepository.findByTeacher(teacherId, ctx.schoolId);
  },

  async updateNote(teacherId: string, noteId: string, rawInput: unknown, ctx: AuthContext): Promise<ITeacherNote> {
    const data = updateNoteSchema.parse(rawInput);
    if (!data.content && !data.type) throw new ValidationError('No fields to update');

    const existing = await teacherNoteRepository.findById(noteId, teacherId, ctx.schoolId);
    if (!existing) throw new NotFoundError('Note');

    const note = await teacherNoteRepository.update(noteId, teacherId, data);
    if (!note) throw new NotFoundError('Note');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'teacher.note_updated',
      resource: 'teacher_notes',
      resourceId: noteId,
      details: { teacherId, fields: Object.keys(data) },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return note;
  },

  async deleteNote(teacherId: string, noteId: string, ctx: AuthContext): Promise<void> {
    const existing = await teacherNoteRepository.findById(noteId, teacherId, ctx.schoolId);
    if (!existing) throw new NotFoundError('Note');

    const deleted = await teacherNoteRepository.softDelete(noteId, teacherId, ctx.schoolId);
    if (!deleted) throw new NotFoundError('Note');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'teacher.note_deleted',
      resource: 'teacher_notes',
      resourceId: noteId,
      details: { teacherId },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });
  },
};
