import { z } from 'zod';

const SOURCES = ['walk_in', 'email', 'referral', 'job_portal', 'other'] as const;
const STATUSES = [
  'new', 'forwarded_to_hr', 'forwarded_to_principal', 'under_review',
  'interview_scheduled', 'interview_completed', 'selected', 'hold', 'rejected',
] as const;

const phoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number');

export const createCandidateSchema = z.object({
  name:             z.string().trim().min(2, 'Candidate name is required').max(100),
  mobile:           phoneSchema,
  email:            z.string().trim().email().optional().or(z.literal('')),
  positionApplied:  z.string().trim().min(1, 'Position applied for is required').max(150),
  department:       z.string().trim().max(100).optional(),
  qualification:    z.string().trim().max(200).optional(),
  experienceYears:  z.coerce.number().min(0).max(60).optional(),
  source:           z.enum(SOURCES),
  dateReceived:     z.string().optional(), // defaults to now if omitted
});

export const forwardCandidateSchema = z.object({
  to: z.enum(['hr', 'principal']),
});

export const rejectCandidateSchema = z.object({
  rejectionReason: z.string().trim().min(1, 'A rejection reason is required').max(1000),
});

export const listCandidatesSchema = z.object({
  page:            z.coerce.number().int().min(1).default(1),
  limit:           z.coerce.number().int().min(1).max(200).default(50),
  search:          z.string().trim().optional(),
  status:          z.enum(STATUSES).optional(),
  positionApplied: z.string().trim().optional(),
  department:      z.string().trim().optional(),
});

// Module 6 — the Principal's final call after interviews. Salary/joining
// fields only make sense (and are only accepted) when selecting.
export const setFinalDecisionSchema = z.object({
  decision:              z.enum(['selected', 'hold', 'rejected']),
  salaryDiscussionNotes: z.string().trim().max(1000).optional(),
  offeredSalary:         z.coerce.number().min(0).optional(),
  joiningDate:           z.string().optional(),
  rejectionReason:       z.string().trim().max(1000).optional(),
}).refine((data) => data.decision !== 'rejected' || !!data.rejectionReason?.trim(), {
  message: 'A rejection reason is required',
  path: ['rejectionReason'],
});

export const checkDuplicateSchema = z.object({
  mobile: phoneSchema.optional(),
  email:  z.string().trim().email().optional(),
}).refine((data) => data.mobile || data.email, { message: 'Provide a mobile number or email to check' });
