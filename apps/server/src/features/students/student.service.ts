import { studentRepository, PaginatedStudents, FindStudentsOptions } from './student.repository';
import { studentNoteRepository } from './student.note.repository';
import {
  createStudentSchema, updateStudentSchema, changeStatusSchema,
  listStudentsSchema, createNoteSchema, updateNoteSchema,
} from './student.validation';
import { IStudent } from './student.model';
import { IStudentNote } from './student.note.model';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

const generateAdmissionNumber = async (schoolId: string, year: number, offset = 0): Promise<string> => {
  const count = await studentRepository.countByAdmissionYear(schoolId, year);
  return `ADM-${year}-${String(count + 1 + offset).padStart(4, '0')}`;
};

const isDuplicateKeyError = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;

// ── Service ───────────────────────────────────────────────────────────────────

export const studentService = {
  async createStudent(rawInput: unknown, ctx: AuthContext): Promise<IStudent> {
    const data = createStudentSchema.parse(rawInput);
    const admissionYear = new Date().getFullYear();

    // Admission numbers are counted, not atomically reserved — under concurrent
    // creates two requests can compute the same number. Retry with the next
    // number on a duplicate-key collision instead of failing the request.
    const MAX_ATTEMPTS = 5;
    let lastErr: unknown;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const admissionNumber = await generateAdmissionNumber(ctx.schoolId, admissionYear, attempt);
      try {
        const student = await studentRepository.create({
          ...data,
          admissionNumber,
          admissionYear,
          schoolId: ctx.schoolId,
          createdBy: ctx.displayName,
        });

        auditService.log({
          userId: ctx.userId,
          userDisplayName: ctx.displayName,
          action: 'student.created',
          resource: 'students',
          resourceId: student._id.toString(),
          details: { fullName: data.fullName, admissionNumber },
          ip: ctx.ip,
          schoolId: ctx.schoolId,
        });

        return student;
      } catch (err) {
        if (isDuplicateKeyError(err)) {
          lastErr = err;
          continue;
        }
        throw err;
      }
    }

    throw lastErr instanceof Error
      ? lastErr
      : new ValidationError('Could not generate a unique admission number. Please try again.');
  },

  async listStudents(rawQuery: unknown, ctx: AuthContext): Promise<PaginatedStudents> {
    const opts = listStudentsSchema.parse(rawQuery);
    const options: FindStudentsOptions = {
      page: opts.page,
      limit: opts.limit,
      search: opts.search,
      class: opts.class,
      section: opts.section,
      status: opts.status,
      gender: opts.gender,
      admissionYear: opts.admissionYear,
      tags: opts.tags,
    };
    return studentRepository.findAll(ctx.schoolId, options);
  },

  /** Simple list for autocomplete (StudentSearch in CommunicationWorkspace). */
  async searchStudents(ctx: AuthContext, search?: string): Promise<IStudent[]> {
    return studentRepository.findForSearch(ctx.schoolId, search);
  },

  async getStudent(id: string, ctx: AuthContext): Promise<IStudent> {
    const student = await studentRepository.findById(id, ctx.schoolId);
    if (!student) throw new NotFoundError('Student');
    return student;
  },

  async updateStudent(id: string, rawInput: unknown, ctx: AuthContext): Promise<IStudent> {
    const data = updateStudentSchema.parse(rawInput);
    if (!Object.keys(data).length) throw new ValidationError('No fields to update');

    const student = await studentRepository.update(id, ctx.schoolId, {
      ...data,
      updatedBy: ctx.displayName,
    });
    if (!student) throw new NotFoundError('Student');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'student.updated',
      resource: 'students',
      resourceId: id,
      details: { fields: Object.keys(data) },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return student;
  },

  async changeStatus(id: string, rawInput: unknown, ctx: AuthContext): Promise<IStudent> {
    const { status, reason } = changeStatusSchema.parse(rawInput);

    const existing = await studentRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Student');

    const student = await studentRepository.changeStatus(id, ctx.schoolId, status, ctx.displayName);
    if (!student) throw new NotFoundError('Student');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'student.status_changed',
      resource: 'students',
      resourceId: id,
      details: { from: existing.admissionStatus, to: status, reason },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return student;
  },

  async deleteStudent(id: string, ctx: AuthContext): Promise<void> {
    const student = await studentRepository.findById(id, ctx.schoolId);
    if (!student) throw new NotFoundError('Student');

    const deleted = await studentRepository.softDelete(id, ctx.schoolId, ctx.displayName);
    if (!deleted) throw new NotFoundError('Student');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'student.deleted',
      resource: 'students',
      resourceId: id,
      details: { fullName: student.fullName },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });
  },

  // ── Notes ──────────────────────────────────────────────────────────────────

  async createNote(studentId: string, rawInput: unknown, ctx: AuthContext): Promise<IStudentNote> {
    const student = await studentRepository.findById(studentId, ctx.schoolId);
    if (!student) throw new NotFoundError('Student');

    const { content, type } = createNoteSchema.parse(rawInput);

    const note = await studentNoteRepository.create({
      studentId,
      schoolId: ctx.schoolId,
      type,
      content,
      createdByName: ctx.displayName,
      createdById: ctx.userId,
    });

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'student.note_added',
      resource: 'student_notes',
      resourceId: note._id.toString(),
      details: { studentId, type },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return note;
  },

  async listNotes(studentId: string, ctx: AuthContext): Promise<IStudentNote[]> {
    const student = await studentRepository.findById(studentId, ctx.schoolId);
    if (!student) throw new NotFoundError('Student');
    return studentNoteRepository.findByStudent(studentId, ctx.schoolId);
  },

  async updateNote(studentId: string, noteId: string, rawInput: unknown, ctx: AuthContext): Promise<IStudentNote> {
    const data = updateNoteSchema.parse(rawInput);
    if (!data.content && !data.type) throw new ValidationError('No fields to update');

    const existing = await studentNoteRepository.findById(noteId, studentId, ctx.schoolId);
    if (!existing) throw new NotFoundError('Note');

    const note = await studentNoteRepository.update(noteId, studentId, data);
    if (!note) throw new NotFoundError('Note');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'student.note_updated',
      resource: 'student_notes',
      resourceId: noteId,
      details: { studentId, fields: Object.keys(data) },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return note;
  },

  async deleteNote(studentId: string, noteId: string, ctx: AuthContext): Promise<void> {
    const existing = await studentNoteRepository.findById(noteId, studentId, ctx.schoolId);
    if (!existing) throw new NotFoundError('Note');

    const deleted = await studentNoteRepository.softDelete(noteId, studentId, ctx.schoolId);
    if (!deleted) throw new NotFoundError('Note');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'student.note_deleted',
      resource: 'student_notes',
      resourceId: noteId,
      details: { studentId },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });
  },
};
