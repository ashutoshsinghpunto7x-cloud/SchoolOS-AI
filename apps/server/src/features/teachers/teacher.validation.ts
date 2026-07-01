import { z } from 'zod';

// ── Shared rules ──────────────────────────────────────────────────────────────

const phoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number');

export const EMPLOYMENT_STATUSES = [
  'applicant', 'active', 'on_leave', 'suspended', 'resigned', 'retired', 'inactive',
] as const;

// ── Create ────────────────────────────────────────────────────────────────────

export const createTeacherSchema = z.object({
  fullName:        z.string({ required_error: 'Full name is required' }).min(2).max(100).trim(),
  gender:          z.enum(['male', 'female', 'other'], { required_error: 'Gender is required' }),
  dateOfBirth:     z.string().optional(),
  phone:           phoneSchema,
  alternatePhone:  phoneSchema.optional().or(z.literal('')),
  email:           z.string().email('Invalid email').optional().or(z.literal('')),
  address:         z.string().optional(),
  department:      z.string().max(100).trim().optional(),
  subjects:        z.array(z.string().max(50).trim()).max(20).default([]),
  assignedClasses: z.array(z.string().max(20).trim()).max(30).default([]),
  qualification:   z.object({
    degree:        z.string().min(1).trim(),
    institution:   z.string().min(1).trim(),
    yearOfPassing: z.number().int().min(1950).max(new Date().getFullYear()).optional(),
  }).optional(),
  experienceYears: z.number().int().min(0).max(60).optional(),
  joiningDate:     z.string().optional(),
  employmentStatus:z.enum(EMPLOYMENT_STATUSES).default('applicant'),
  tags:            z.array(z.string().max(30).trim()).max(20).default([]),
  remarks:         z.string().max(500).optional(),
  emergencyContact:z.object({
    name:     z.string().min(2).trim(),
    phone:    phoneSchema,
    relation: z.string().min(1).trim(),
  }).optional(),
});

export const updateTeacherSchema = createTeacherSchema.partial();

// ── Status change ─────────────────────────────────────────────────────────────

export const changeStatusSchema = z.object({
  status: z.enum(EMPLOYMENT_STATUSES, { required_error: 'Status is required' }),
  reason: z.string().max(200).optional(),
});

// ── List query ────────────────────────────────────────────────────────────────

export const listTeachersSchema = z.object({
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
  search:     z.string().optional(),
  department: z.string().optional(),
  status:     z.enum(EMPLOYMENT_STATUSES).optional(),
  subject:    z.string().optional(),
  class:      z.string().optional(),
  sortBy:     z.enum(['fullName', 'createdAt', 'joiningDate']).default('createdAt'),
  sortOrder:  z.enum(['asc', 'desc']).default('desc'),
});

// ── Notes ─────────────────────────────────────────────────────────────────────

export const createNoteSchema = z.object({
  content: z.string({ required_error: 'Note content is required' }).min(1).max(2000).trim(),
  type:    z.enum(['general', 'pinned', 'private']).default('general'),
});

export const updateNoteSchema = z.object({
  content: z.string().min(1).max(2000).trim().optional(),
  type:    z.enum(['general', 'pinned', 'private']).optional(),
});

// ── Inferred Types ────────────────────────────────────────────────────────────

export type CreateTeacherInput  = z.infer<typeof createTeacherSchema>;
export type UpdateTeacherInput  = z.infer<typeof updateTeacherSchema>;
export type ChangeStatusInput   = z.infer<typeof changeStatusSchema>;
export type ListTeachersInput   = z.infer<typeof listTeachersSchema>;
export type CreateNoteInput     = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput     = z.infer<typeof updateNoteSchema>;
