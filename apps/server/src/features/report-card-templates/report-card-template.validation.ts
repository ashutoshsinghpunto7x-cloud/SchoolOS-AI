import { z } from 'zod';
import { normalizeAcademicYear } from '../../lib/academic-year';

export const SUBJECT_EVALUATION_TYPES = ['marks', 'grade', 'both'] as const;

// ── Sub-schemas ────────────────────────────────────────────────────────────────

const templateSubjectRowSchema = z.object({
  _id:              z.string().optional(),
  name:             z.string({ required_error: 'subject name is required' }).min(1).trim(),
  marksSubjectName: z.string().trim().optional(),
  evaluationType:   z.enum(SUBJECT_EVALUATION_TYPES).default('marks'),
  order:            z.number().default(0),
  unitTestMaxMarks: z.number({ required_error: 'unitTestMaxMarks is required' }).min(0),
  mainExamMaxMarks: z.number({ required_error: 'mainExamMaxMarks is required' }).min(0),
});

const templateSkillRowSchema = z.object({
  _id:   z.string().optional(),
  label: z.string({ required_error: 'skill row label is required' }).min(1).trim(),
  order: z.number().default(0),
});

const templateSkillSectionSchema = z.object({
  _id:   z.string().optional(),
  name:  z.string({ required_error: 'skill section name is required' }).min(1).trim(),
  order: z.number().default(0),
  rows:  z.array(templateSkillRowSchema).default([]),
});

const templateGradingKeyEntrySchema = z.object({
  label:       z.string({ required_error: 'grading key label is required' }).min(1).trim(),
  description: z.string({ required_error: 'grading key description is required' }).min(1).trim(),
  order:       z.number().default(0),
  // Percentage band this grade covers — lets subject/skill grades be derived automatically
  // from marks instead of typed in by hand. Optional: a grading key with no bands set falls
  // back to manual entry everywhere it's used.
  minPercent:  z.number().min(0).max(100).optional(),
  maxPercent:  z.number().min(0).max(100).optional(),
});

const templateExamSlotSchema = z.object({
  unitTest1ExamId: z.string().trim().optional(),
  unitTest2ExamId: z.string().trim().optional(),
  mainExamId:      z.string().trim().optional(),
  startDate:       z.string().trim().optional(),
  endDate:         z.string().trim().optional(),
});

const templateExamSlotsSchema = z.object({
  firstTerm: templateExamSlotSchema.default({}),
  finalTerm: templateExamSlotSchema.default({}),
});

// ── Create / Update ───────────────────────────────────────────────────────────

export const createReportCardTemplateSchema = z.object({
  class:         z.string({ required_error: 'class is required' }).min(1).trim(),
  academicYear:  z.string({ required_error: 'academicYear is required' }).min(1).trim().transform(normalizeAcademicYear),
  subjects:      z.array(templateSubjectRowSchema).default([]),
  skillSections: z.array(templateSkillSectionSchema).default([]),
  gradingKey:    z.array(templateGradingKeyEntrySchema).default([]),
  examSlots:     templateExamSlotsSchema.default({ firstTerm: {}, finalTerm: {} }),
});

export const updateReportCardTemplateSchema = createReportCardTemplateSchema
  .omit({ class: true, academicYear: true })
  .partial();

export const cloneReportCardTemplateSchema = z.object({
  fromAcademicYear: z.string({ required_error: 'fromAcademicYear is required' }).min(1).trim().transform(normalizeAcademicYear),
  toAcademicYear:   z.string({ required_error: 'toAcademicYear is required' }).min(1).trim().transform(normalizeAcademicYear),
});

export const listReportCardTemplateSchema = z.object({
  class:        z.string().optional(),
  academicYear: z.string().optional().transform((v) => (v ? normalizeAcademicYear(v) : v)),
});

// ── Inferred types ────────────────────────────────────────────────────────────

export type CreateReportCardTemplateInput = z.infer<typeof createReportCardTemplateSchema>;
export type UpdateReportCardTemplateInput = z.infer<typeof updateReportCardTemplateSchema>;
export type CloneReportCardTemplateInput  = z.infer<typeof cloneReportCardTemplateSchema>;
export type ListReportCardTemplateInput   = z.infer<typeof listReportCardTemplateSchema>;
