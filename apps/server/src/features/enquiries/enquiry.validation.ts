import { z } from 'zod';

const STAGES = [
  'new_enquiry', 'contacted', 'follow_up_scheduled', 'campus_visit',
  'application_submitted', 'documents_pending', 'admission_approved',
  'converted', 'lost',
] as const;

const SOURCES = [
  'walk_in', 'website', 'referral', 'social_media', 'phone', 'email', 'other',
] as const;

const phoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number');

export const createEnquirySchema = z.object({
  studentName:        z.string().trim().min(2, 'Student name is required').max(100),
  studentDateOfBirth: z.string().optional(),
  interestedClass:    z.string().trim().min(1, 'Interested class is required').max(20),
  gender:             z.enum(['male', 'female', 'other']).optional(),
  currentSchool:      z.string().trim().max(200).optional(),
  currentClass:       z.string().trim().max(20).optional(),
  parentName:         z.string().trim().min(2, 'Parent name is required').max(100),
  parentPhone:        phoneSchema,
  alternatePhone:     phoneSchema.optional().or(z.literal('')),
  parentEmail:        z.string().email('Invalid email').optional().or(z.literal('')),
  stage:              z.enum(STAGES).default('new_enquiry'),
  source:             z.enum(SOURCES),
  referredBy:         z.string().trim().max(100).optional(),
  assignedCounsellor: z.string().trim().max(100).optional(),
  followUpDate:       z.string().optional(),
  tags:               z.array(z.string().trim().max(30)).max(20).default([]),
  remarks:            z.string().max(2000).optional(),
  metadata:           z.record(z.unknown()).optional(),
});

export const updateEnquirySchema = createEnquirySchema.omit({ stage: true }).partial();

export const updateStageSchema = z.object({
  stage:   z.enum(STAGES),
  remarks: z.string().max(500).optional(),
});

export const listEnquiriesSchema = z.object({
  page:               z.coerce.number().int().min(1).default(1),
  limit:              z.coerce.number().int().min(1).max(100).default(20),
  search:             z.string().trim().optional(),
  stage:              z.enum(STAGES).optional(),
  source:             z.enum(SOURCES).optional(),
  interestedClass:    z.string().optional(),
  assignedCounsellor: z.string().optional(),
  followUpBefore:     z.string().optional(),
  followUpAfter:      z.string().optional(),
  sortBy:             z.enum(['createdAt', 'followUpDate', 'studentName']).default('createdAt'),
  sortOrder:          z.enum(['asc', 'desc']).default('desc'),
});

export const convertToStudentSchema = z.object({
  class:       z.string().trim().min(1, 'Class is required'),
  section:     z.string().trim().min(1, 'Section is required'),
  gender:      z.enum(['male', 'female', 'other']),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  fatherName:  z.string().trim().min(2, "Father's name is required"),
  motherName:  z.string().trim().min(2, "Mother's name is required"),
  address:     z.string().optional(),
  admissionStatus: z.enum([
    'enquiry', 'application', 'admission_pending', 'active',
    'transferred', 'graduated', 'inactive',
  ]).default('active'),
});

export const createEnquiryNoteSchema = z.object({
  content: z.string().trim().min(1, 'Note content is required').max(2000),
  type:    z.enum(['general', 'pinned', 'private']).default('general'),
});

export const updateEnquiryNoteSchema = z.object({
  content: z.string().trim().min(1).max(2000).optional(),
  type:    z.enum(['general', 'pinned', 'private']).optional(),
});
