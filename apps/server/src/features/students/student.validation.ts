import { z } from 'zod';

// ── Shared rules ──────────────────────────────────────────────────────────────

const phoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number');

const LIFECYCLE_STATUSES = [
  'enquiry', 'application', 'admission_pending', 'active',
  'transferred', 'graduated', 'inactive',
  'inquiry', 'enrolled', 'withdrawn', // legacy
] as const;

// ── Create / Update ───────────────────────────────────────────────────────────

export const createStudentSchema = z.object({
  fullName: z.string({ required_error: 'Full name is required' }).min(2).max(100).trim(),
  /** Only ever set by the import pipeline, which carries an existing admission number from the source file — the normal admission form never sends this, so auto-generation still applies. */
  admissionNumber: z.string().max(30).trim().optional(),
  rollNumber: z.string().max(20).trim().optional().or(z.literal('')),
  class: z.string({ required_error: 'Class is required' }).min(1).trim(),
  section: z.string({ required_error: 'Section is required' }).min(1).trim(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  dateOfBirth: z.string().optional().or(z.literal('')),
  fatherName: z.string().min(2).trim().optional().or(z.literal('')),
  motherName: z.string().min(2).trim().optional().or(z.literal('')),
  parentPhone: phoneSchema.optional().or(z.literal('')),
  alternatePhone: phoneSchema.optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  locality: z.string().max(200).trim().optional().or(z.literal('')),
  admissionStatus: z.enum(LIFECYCLE_STATUSES).default('active'),
  tags: z.array(z.string().max(30).trim()).max(20).default([]),
  remarks: z.string().max(500).optional(),
  monthlyTuitionFee: z.coerce.number().min(0).optional(),
  emergencyContact: z.object({
    name: z.string().min(2).trim(),
    phone: phoneSchema,
    relation: z.string().min(1).trim(),
  }).optional(),
  /** Ad-hoc columns added from the accountant's Student Directory. */
  customFields: z.record(z.string(), z.unknown()).optional(),
});

export const updateStudentSchema = createStudentSchema.partial();

export const updateRollNumberSchema = z.object({
  rollNumber: z.string().max(20).trim().optional().or(z.literal('')),
});

// Fields the accountant workspace's Collect Fee card manages directly — roll number,
// class/section placement, and the monthly tuition amount that drives fee generation.
export const updateFeeProfileSchema = z.object({
  rollNumber: z.string().max(20).trim().optional().or(z.literal('')),
  class: z.string().min(1).trim().optional(),
  section: z.string().min(1).trim().optional(),
  monthlyTuitionFee: z.coerce.number().min(0).optional(),
});

export const changeStatusSchema = z.object({
  status: z.enum(LIFECYCLE_STATUSES, { required_error: 'Status is required' }),
  reason: z.string().max(200).optional(),
});

// ── List query ────────────────────────────────────────────────────────────────

export const listStudentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
  search: z.string().optional(),
  class: z.string().optional(),
  section: z.string().optional(),
  status: z.enum(LIFECYCLE_STATUSES).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  admissionYear: z.coerce.number().int().optional(),
  tags: z.string().optional(),
});

// ── Notes ─────────────────────────────────────────────────────────────────────

export const createNoteSchema = z.object({
  content: z.string({ required_error: 'Note content is required' }).min(1).max(2000).trim(),
  type: z.enum(['general', 'pinned', 'private']).default('general'),
});

export const updateNoteSchema = z.object({
  content: z.string().min(1).max(2000).trim().optional(),
  type: z.enum(['general', 'pinned', 'private']).optional(),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
export type UpdateFeeProfileInput = z.infer<typeof updateFeeProfileSchema>;
export type ListStudentsInput = z.infer<typeof listStudentsSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
