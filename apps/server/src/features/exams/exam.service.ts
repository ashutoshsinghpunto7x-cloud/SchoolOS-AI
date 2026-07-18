import { examRepository, PaginatedExams } from './exam.repository';
import { IExam, ExamStatus } from './exam.model';
import { createExamSchema, updateExamSchema, updateExamStatusSchema, listExamSchema } from './exam.validation';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';

// Only forward transitions are allowed — an exam moves from draft (still being
// set up) to configured (ready for marks entry) to locked (no further config
// changes, even by an admin, without explicitly reopening it first).
const ALLOWED_STATUS_TRANSITIONS: Record<ExamStatus, ExamStatus[]> = {
  draft: ['configured'],
  configured: ['locked', 'draft'],
  locked: ['configured'],
};

export const examService = {
  async create(rawInput: unknown, ctx: AuthContext): Promise<IExam> {
    const data = createExamSchema.parse(rawInput);

    const exam = await examRepository.create({
      ...data,
      schoolId: ctx.schoolId,
      createdBy: ctx.displayName,
    });

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'exam.created',
      resource: 'exam',
      resourceId: exam._id.toString(),
      details: { name: data.name, examType: data.examType, classesApplicable: data.classesApplicable },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return exam;
  },

  async getById(id: string, ctx: AuthContext): Promise<IExam> {
    const exam = await examRepository.findById(id, ctx.schoolId);
    if (!exam) throw new NotFoundError('Exam');
    return exam;
  },

  async update(id: string, rawInput: unknown, ctx: AuthContext): Promise<IExam> {
    const existing = await examRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Exam');
    if (existing.status === 'locked') {
      throw new ValidationError('This exam is locked — reopen it before changing its configuration');
    }

    const data = updateExamSchema.parse(rawInput);
    const exam = await examRepository.update(id, ctx.schoolId, { ...data, updatedBy: ctx.displayName });
    if (!exam) throw new NotFoundError('Exam');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'exam.updated',
      resource: 'exam',
      resourceId: id,
      details: { changed: Object.keys(data) },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return exam;
  },

  async updateStatus(id: string, rawInput: unknown, ctx: AuthContext): Promise<IExam> {
    const { status } = updateExamStatusSchema.parse(rawInput);
    const existing = await examRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Exam');

    if (!ALLOWED_STATUS_TRANSITIONS[existing.status].includes(status)) {
      throw new ValidationError(`Cannot move exam from "${existing.status}" to "${status}"`);
    }
    if (status === 'configured' && existing.status === 'draft' && existing.components.length === 0) {
      throw new ValidationError('Add at least one assessment component before marking this exam configured');
    }

    const exam = await examRepository.updateStatus(id, ctx.schoolId, status, ctx.displayName);
    if (!exam) throw new NotFoundError('Exam');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'exam.status_changed',
      resource: 'exam',
      resourceId: id,
      details: { from: existing.status, to: status },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return exam;
  },

  async deleteExam(id: string, ctx: AuthContext): Promise<void> {
    const existing = await examRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Exam');

    const deleted = await examRepository.softDelete(id, ctx.schoolId, ctx.displayName);
    if (!deleted) throw new NotFoundError('Exam');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'exam.deleted',
      resource: 'exam',
      resourceId: id,
      details: { name: existing.name },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });
  },

  async listAll(rawQuery: unknown, ctx: AuthContext): Promise<PaginatedExams> {
    const opts = listExamSchema.parse(rawQuery);
    return examRepository.findAll(ctx.schoolId, opts);
  },

  async listForClass(cls: string, ctx: AuthContext): Promise<IExam[]> {
    return examRepository.findForClass(ctx.schoolId, cls);
  },
};
