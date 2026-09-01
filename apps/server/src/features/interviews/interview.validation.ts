import { z } from 'zod';

const MODES = ['in_person', 'phone', 'video'] as const;
const STATUSES = ['scheduled', 'completed', 'no_show', 'cancelled', 'rescheduled'] as const;
const RECOMMENDATIONS = ['strong_yes', 'yes', 'hold', 'no'] as const;

export const scheduleInterviewSchema = z.object({
  candidateId: z.string().trim().min(1, 'Interview must be linked to a candidate'),
  scheduledAt: z.string().min(1, 'Date/time is required'),
  mode:        z.enum(MODES),
  interviewerIds: z.array(z.string().trim().min(1)).min(1, 'Assign at least one interviewer'),
});

export const rescheduleInterviewSchema = z.object({
  scheduledAt: z.string().min(1, 'New date/time is required'),
});

export const setInterviewStatusSchema = z.object({
  status: z.enum(STATUSES),
});

export const submitFeedbackSchema = z.object({
  score:          z.coerce.number().min(1).max(10),
  criteriaScores: z.record(z.string(), z.coerce.number()).optional(),
  comments:       z.string().trim().max(2000).optional(),
  recommendation: z.enum(RECOMMENDATIONS),
});

export const listInterviewsSchema = z.object({
  page:        z.coerce.number().int().min(1).default(1),
  limit:       z.coerce.number().int().min(1).max(200).default(50),
  candidateId: z.string().trim().optional(),
  status:      z.enum(STATUSES).optional(),
  dateFrom:    z.string().optional(),
  dateTo:      z.string().optional(),
});
