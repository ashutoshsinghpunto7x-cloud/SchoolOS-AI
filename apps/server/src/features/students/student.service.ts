import { studentRepository, PaginatedStudents, FindStudentsOptions } from './student.repository';
import { studentNoteRepository } from './student.note.repository';
import {
  createStudentSchema, updateStudentSchema, changeStatusSchema,
  listStudentsSchema, createNoteSchema, updateNoteSchema, updateRollNumberSchema,
  updateFeeProfileSchema,
} from './student.validation';
import { IStudent } from './student.model';
import { IStudentNote } from './student.note.model';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

const isDuplicateKeyError = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;

// ── Service ───────────────────────────────────────────────────────────────────

export const studentService = {
  async createStudent(rawInput: unknown, ctx: AuthContext): Promise<IStudent> {
    const data = createStudentSchema.parse(rawInput);
    const admissionYear = new Date().getFullYear();

    // The import pipeline supplies an existing admission number from the source
    // file — honor it directly (single attempt, no auto-generation/retry).
    if (data.admissionNumber) {
      const student = await studentRepository.create({
        ...data,
        admissionNumber: data.admissionNumber,
        admissionYear,
        schoolId: ctx.schoolId,
        createdBy: ctx.displayName,
      });

      auditService.log({
        userId: ctx.userId, userDisplayName: ctx.displayName,
        action: 'student.created', resource: 'students', resourceId: student._id.toString(),
        details: { fullName: data.fullName, admissionNumber: data.admissionNumber },
        ip: ctx.ip, schoolId: ctx.schoolId,
      });

      return student;
    }

    // Admission numbers aren't atomically reserved, so a bulk import (rows run
    // concurrently) or two simultaneous admissions can compute the same next
    // number. Start from the true max sequence, then walk forward on each
    // duplicate-key collision. The retry ceiling is comfortably above the
    // import batch size so a whole batch of new students can settle even when
    // every row starts from the same base.
    const MAX_ATTEMPTS = 60;
    const baseSeq = await studentRepository.maxAdmissionSequence(ctx.schoolId, admissionYear);
    let lastErr: unknown;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const admissionNumber = `ADM-${admissionYear}-${String(baseSeq + 1 + attempt).padStart(4, '0')}`;
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

  /** Low-risk quick-edit field, exempt from the change-request approval flow. */
  async updateRollNumber(id: string, rawInput: unknown, ctx: AuthContext): Promise<IStudent> {
    const { rollNumber } = updateRollNumberSchema.parse(rawInput);

    const student = await studentRepository.update(id, ctx.schoolId, {
      rollNumber: rollNumber || undefined,
      updatedBy: ctx.displayName,
    });
    if (!student) throw new NotFoundError('Student');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'student.updated',
      resource: 'students',
      resourceId: id,
      details: { fields: ['rollNumber'] },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return student;
  },

  /**
   * Roll No./Class/Section/Monthly Tuition Fee — managed directly from the accountant
   * workspace's Collect Fee card, exempt from the teacher change-request approval flow
   * (route-gated to admin/reception/accountant, not teacher).
   */
  async updateFeeProfile(id: string, rawInput: unknown, ctx: AuthContext): Promise<IStudent> {
    const data = updateFeeProfileSchema.parse(rawInput);
    if (!Object.keys(data).length) throw new ValidationError('No fields to update');

    const student = await studentRepository.update(id, ctx.schoolId, {
      ...data,
      rollNumber: data.rollNumber || undefined,
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

  async updatePhoto(id: string, dataUri: string, ctx: AuthContext): Promise<IStudent> {
    const student = await studentRepository.updatePhoto(id, ctx.schoolId, dataUri, ctx.displayName);
    if (!student) throw new NotFoundError('Student');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'student.updated', resource: 'students', resourceId: id,
      details: { fields: ['photoUrl'] }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return student;
  },

  async removePhoto(id: string, ctx: AuthContext): Promise<IStudent> {
    const student = await studentRepository.updatePhoto(id, ctx.schoolId, undefined, ctx.displayName);
    if (!student) throw new NotFoundError('Student');
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
