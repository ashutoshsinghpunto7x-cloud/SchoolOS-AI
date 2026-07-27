import { z } from 'zod';

export const generateReportCardSchema = z.object({
  examId:    z.string({ required_error: 'examId is required' }).min(1),
  studentId: z.string({ required_error: 'studentId is required' }).min(1),
});

const coScholasticEntrySchema = z.object({
  activity: z.string().min(1).trim(),
  grade:    z.string().trim().max(5),
});

export const updateReportCardSchema = z.object({
  aiRemarkText:    z.string().trim().max(1000).optional(),
  teacherRemark:   z.string().trim().max(1000).optional(),
  principalRemark: z.string().trim().max(1000).optional(),
  parentFeedback:  z.string().trim().max(1000).optional(),
  coScholastic:    z.array(coScholasticEntrySchema).optional(),
});

export const rosterQuerySchema = z.object({
  examId:  z.string({ required_error: 'examId is required' }).min(1),
  class:   z.string({ required_error: 'class is required' }).min(1),
  section: z.string({ required_error: 'section is required' }).min(1),
});

export type GenerateReportCardInput = z.infer<typeof generateReportCardSchema>;
export type UpdateReportCardInput   = z.infer<typeof updateReportCardSchema>;
export type RosterQueryInput        = z.infer<typeof rosterQuerySchema>;
