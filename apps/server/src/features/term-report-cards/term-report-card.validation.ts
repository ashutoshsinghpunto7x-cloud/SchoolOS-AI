import { z } from 'zod';

export const generateTermReportCardSchema = z.object({
  studentId:    z.string({ required_error: 'studentId is required' }).min(1),
  academicYear: z.string({ required_error: 'academicYear is required' }).min(1),
});

export const updateTermReportCardSchema = z.object({
  teacherRemark:   z.string().trim().max(1000).optional(),
  principalRemark: z.string().trim().max(1000).optional(),
  parentFeedback:  z.string().trim().max(1000).optional(),
});

const skillGradeSchema = z.enum(['A', 'B', 'C', 'D']);

const skillUpdateEntrySchema = z.object({
  rowId:          z.string({ required_error: 'rowId is required' }).min(1),
  firstTermGrade: skillGradeSchema.optional(),
  finalTermGrade: skillGradeSchema.optional(),
});

export const updateTermReportCardSkillsSchema = z.object({
  skills: z.array(skillUpdateEntrySchema).min(1, 'At least one skill grade is required'),
});

export const rosterQuerySchema = z.object({
  class:        z.string({ required_error: 'class is required' }).min(1),
  section:      z.string({ required_error: 'section is required' }).min(1),
  academicYear: z.string({ required_error: 'academicYear is required' }).min(1),
});

export type GenerateTermReportCardInput    = z.infer<typeof generateTermReportCardSchema>;
export type UpdateTermReportCardInput      = z.infer<typeof updateTermReportCardSchema>;
export type UpdateTermReportCardSkillsInput = z.infer<typeof updateTermReportCardSkillsSchema>;
export type RosterQueryInput               = z.infer<typeof rosterQuerySchema>;
