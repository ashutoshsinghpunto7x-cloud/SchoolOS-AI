import { z } from 'zod';

export const generateReportCardSchema = z.object({
  examId:    z.string({ required_error: 'examId is required' }).min(1),
  studentId: z.string({ required_error: 'studentId is required' }).min(1),
});

const coScholasticEntrySchema = z.object({
  activity: z.string().min(1).trim(),
  grade:    z.string().trim().max(5),
});

// A direct correction to one subject's marks on an already-generated card — lets a teacher fix a
// typo'd score without re-running the whole marks-entry flow. `grade` only applies to grade/both
// subjects; `marksObtained` only to marks/both subjects, but both are optional so either can be
// corrected independently.
const subjectMarkCorrectionSchema = z.object({
  subjectName:   z.string().min(1),
  marksObtained: z.number().min(0).optional(),
  grade:         z.string().trim().max(10).optional(),
});

export const updateReportCardSchema = z.object({
  aiRemarkText:    z.string().trim().max(1000).optional(),
  teacherRemark:   z.string().trim().max(1000).optional(),
  principalRemark: z.string().trim().max(1000).optional(),
  parentFeedback:  z.string().trim().max(1000).optional(),
  coScholastic:    z.array(coScholasticEntrySchema).optional(),
  subjectMarks:    z.array(subjectMarkCorrectionSchema).optional(),
});

export const rosterQuerySchema = z.object({
  examId:  z.string({ required_error: 'examId is required' }).min(1),
  class:   z.string({ required_error: 'class is required' }).min(1),
  section: z.string({ required_error: 'section is required' }).min(1),
});

export type GenerateReportCardInput = z.infer<typeof generateReportCardSchema>;
export type UpdateReportCardInput   = z.infer<typeof updateReportCardSchema>;
export type RosterQueryInput        = z.infer<typeof rosterQuerySchema>;
