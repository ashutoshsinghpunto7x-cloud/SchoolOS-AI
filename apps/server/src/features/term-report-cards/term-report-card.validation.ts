import { z } from 'zod';

export const generateTermReportCardSchema = z.object({
  studentId:    z.string({ required_error: 'studentId is required' }).min(1),
  academicYear: z.string({ required_error: 'academicYear is required' }).min(1),
});

// A direct correction to one subject's scores on an already-generated term card — lets a teacher
// fix a typo'd score for a given term without re-running marks entry. All score fields optional
// so any subset (e.g. just the main exam score) can be corrected independently.
const termSubjectMarkCorrectionSchema = z.object({
  term:           z.enum(['firstTerm', 'finalTerm']),
  subjectName:    z.string().min(1),
  unitTest1Score: z.number().min(0).optional(),
  unitTest2Score: z.number().min(0).optional(),
  mainExamScore:  z.number().min(0).optional(),
  grade:          z.string().trim().max(10).optional(),
  // Per-student override of the template's evaluation type for this one subject/card.
  evaluationType: z.enum(['marks', 'grade', 'both']).optional(),
});

export const updateTermReportCardSchema = z.object({
  teacherRemark:   z.string().trim().max(1000).optional(),
  principalRemark: z.string().trim().max(1000).optional(),
  parentFeedback:  z.string().trim().max(1000).optional(),
  subjectMarks:    z.array(termSubjectMarkCorrectionSchema).optional(),
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
