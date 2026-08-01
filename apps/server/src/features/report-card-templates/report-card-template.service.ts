import mongoose from 'mongoose';
import { reportCardTemplateRepository } from './report-card-template.repository';
import {
  IReportCardTemplate,
  ITemplateSubjectRow,
  ITemplateSkillSection,
  ITemplateGradingKeyEntry,
  ITemplateExamSlots,
} from './report-card-template.model';
import {
  createReportCardTemplateSchema,
  updateReportCardTemplateSchema,
  cloneReportCardTemplateSchema,
  listReportCardTemplateSchema,
  CreateReportCardTemplateInput,
} from './report-card-template.validation';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Reuses a client-supplied id as the subdocument's Mongo _id when present (so
 *  renaming a subject/skill row keeps the same id, which is how a student's
 *  already-entered skill grades or a term report card's subjectId stay attached
 *  across template edits) — otherwise lets Mongoose mint a fresh one. */
function withStableId<T extends { _id?: string }>(row: T): Omit<T, '_id'> & { _id?: mongoose.Types.ObjectId } {
  const { _id, ...rest } = row;
  const hasValidId = _id && mongoose.Types.ObjectId.isValid(_id);
  return { ...rest, ...(hasValidId ? { _id: new mongoose.Types.ObjectId(_id) } : {}) };
}

function mapSubjects(input: CreateReportCardTemplateInput['subjects']): ITemplateSubjectRow[] {
  return input.map((s) => withStableId(s)) as unknown as ITemplateSubjectRow[];
}

function mapSkillSections(input: CreateReportCardTemplateInput['skillSections']): ITemplateSkillSection[] {
  return input.map((section) => ({
    ...withStableId(section),
    rows: section.rows.map((r) => withStableId(r)),
  })) as unknown as ITemplateSkillSection[];
}

function mapGradingKey(input: CreateReportCardTemplateInput['gradingKey']): ITemplateGradingKeyEntry[] {
  return input as ITemplateGradingKeyEntry[];
}

function mapExamSlots(input: CreateReportCardTemplateInput['examSlots']): ITemplateExamSlots {
  return input as ITemplateExamSlots;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const reportCardTemplateService = {
  async create(rawInput: unknown, ctx: AuthContext): Promise<IReportCardTemplate> {
    const data = createReportCardTemplateSchema.parse(rawInput);

    const existing = await reportCardTemplateRepository.findByClassYear(ctx.schoolId, data.class, data.academicYear);
    if (existing) {
      throw new ValidationError(`A report card template already exists for class "${data.class}" in ${data.academicYear}`);
    }

    const template = await reportCardTemplateRepository.create({
      schoolId: ctx.schoolId,
      class: data.class,
      academicYear: data.academicYear,
      subjects: mapSubjects(data.subjects),
      skillSections: mapSkillSections(data.skillSections),
      gradingKey: mapGradingKey(data.gradingKey),
      examSlots: mapExamSlots(data.examSlots),
      createdBy: ctx.displayName,
    });

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'report_card_template.created',
      resource: 'report_card_template', resourceId: template._id.toString(),
      details: { class: data.class, academicYear: data.academicYear }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return template;
  },

  async getById(id: string, ctx: AuthContext): Promise<IReportCardTemplate> {
    const template = await reportCardTemplateRepository.findById(id, ctx.schoolId);
    if (!template) throw new NotFoundError('Report card template');
    return template;
  },

  async getByClassYear(cls: string, academicYear: string, ctx: AuthContext): Promise<IReportCardTemplate> {
    const template = await reportCardTemplateRepository.findByClassYear(ctx.schoolId, cls, academicYear);
    if (!template) throw new NotFoundError('Report card template');
    return template;
  },

  async listAll(rawQuery: unknown, ctx: AuthContext): Promise<IReportCardTemplate[]> {
    const opts = listReportCardTemplateSchema.parse(rawQuery);
    return reportCardTemplateRepository.findAll(ctx.schoolId, opts);
  },

  async update(id: string, rawInput: unknown, ctx: AuthContext): Promise<IReportCardTemplate> {
    const existing = await reportCardTemplateRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Report card template');
    if (existing.status === 'published') {
      throw new ValidationError('This template is published — a principal can still edit it, but any change immediately affects future report-card generation for this class');
    }

    const data = updateReportCardTemplateSchema.parse(rawInput);
    const update: Record<string, unknown> = { updatedBy: ctx.displayName };
    if (data.subjects) update.subjects = mapSubjects(data.subjects);
    if (data.skillSections) update.skillSections = mapSkillSections(data.skillSections);
    if (data.gradingKey) update.gradingKey = mapGradingKey(data.gradingKey);
    if (data.examSlots) update.examSlots = mapExamSlots(data.examSlots);

    const template = await reportCardTemplateRepository.update(id, ctx.schoolId, update);
    if (!template) throw new NotFoundError('Report card template');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'report_card_template.updated',
      resource: 'report_card_template', resourceId: id, details: { changed: Object.keys(data) }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return template;
  },

  async publish(id: string, ctx: AuthContext): Promise<IReportCardTemplate> {
    const existing = await reportCardTemplateRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Report card template');
    if (existing.subjects.length === 0) {
      throw new ValidationError('Add at least one subject before publishing this template');
    }

    const template = await reportCardTemplateRepository.updateStatus(id, ctx.schoolId, 'published', ctx.displayName);
    if (!template) throw new NotFoundError('Report card template');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'report_card_template.published',
      resource: 'report_card_template', resourceId: id, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return template;
  },

  async unpublish(id: string, ctx: AuthContext): Promise<IReportCardTemplate> {
    const template = await reportCardTemplateRepository.updateStatus(id, ctx.schoolId, 'draft', ctx.displayName);
    if (!template) throw new NotFoundError('Report card template');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'report_card_template.unpublished',
      resource: 'report_card_template', resourceId: id, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return template;
  },

  async deleteTemplate(id: string, ctx: AuthContext): Promise<void> {
    const existing = await reportCardTemplateRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Report card template');

    const deleted = await reportCardTemplateRepository.deleteById(id, ctx.schoolId);
    if (!deleted) throw new NotFoundError('Report card template');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'report_card_template.deleted',
      resource: 'report_card_template', resourceId: id,
      details: { class: existing.class, academicYear: existing.academicYear }, ip: ctx.ip, schoolId: ctx.schoolId,
    });
  },

  /** Copies subjects/skillSections/gradingKey into a new academic year for the
   *  same class. examSlots is deliberately left empty — the exams for the new
   *  year don't exist yet, so the principal maps them fresh once they're created. */
  async cloneFromPreviousYear(rawInput: unknown, ctx: AuthContext): Promise<IReportCardTemplate> {
    const { fromAcademicYear, toAcademicYear } = cloneReportCardTemplateSchema.parse(rawInput);
    const cls = (rawInput as { class?: string })?.class;
    if (!cls) throw new ValidationError('class is required');

    const source = await reportCardTemplateRepository.findByClassYear(ctx.schoolId, cls, fromAcademicYear);
    if (!source) throw new NotFoundError('Source report card template');

    const existingTarget = await reportCardTemplateRepository.findByClassYear(ctx.schoolId, cls, toAcademicYear);
    if (existingTarget) {
      throw new ValidationError(`A report card template already exists for class "${cls}" in ${toAcademicYear}`);
    }

    const template = await reportCardTemplateRepository.create({
      schoolId: ctx.schoolId,
      class: cls,
      academicYear: toAcademicYear,
      subjects: source.subjects.map((s) => ({
        _id: new mongoose.Types.ObjectId(),
        name: s.name, evaluationType: s.evaluationType, order: s.order,
        unitTestMaxMarks: s.unitTestMaxMarks, mainExamMaxMarks: s.mainExamMaxMarks,
      })),
      skillSections: source.skillSections.map((sec) => ({
        _id: new mongoose.Types.ObjectId(),
        name: sec.name, order: sec.order,
        rows: sec.rows.map((r) => ({ _id: new mongoose.Types.ObjectId(), label: r.label, order: r.order })),
      })),
      gradingKey: source.gradingKey.map((g) => ({ label: g.label, description: g.description, order: g.order })),
      examSlots: { firstTerm: {}, finalTerm: {} },
      createdBy: ctx.displayName,
    });

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'report_card_template.cloned',
      resource: 'report_card_template', resourceId: template._id.toString(),
      details: { class: cls, fromAcademicYear, toAcademicYear }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return template;
  },
};
