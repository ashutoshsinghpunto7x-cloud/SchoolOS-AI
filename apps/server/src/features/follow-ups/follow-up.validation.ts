import { z } from 'zod';

const CHANNELS = ['call', 'whatsapp', 'email', 'in_person'] as const;
const STATUSES = ['pending', 'completed', 'missed', 'rescheduled'] as const;

export const createFollowUpSchema = z.object({
  enquiryId:    z.string().trim().min(1, 'Follow-up must be linked to an enquiry'),
  dueDate:      z.string().min(1, 'Due date is required'),
  channel:      z.enum(CHANNELS),
  assignedToId: z.string().trim().optional(), // defaults to caller
});

export const completeFollowUpSchema = z.object({
  outcome:          z.string().trim().max(1000).optional(),
  nextFollowUpDate: z.string().optional(), // schedules the next attempt in one step
});

export const rescheduleFollowUpSchema = z.object({
  nextFollowUpDate: z.string().min(1, 'Pick the new follow-up date'),
  outcome:          z.string().trim().max(1000).optional(),
});

export const listFollowUpsSchema = z.object({
  page:         z.coerce.number().int().min(1).default(1),
  limit:        z.coerce.number().int().min(1).max(200).default(50),
  enquiryId:    z.string().trim().optional(),
  status:       z.enum(STATUSES).optional(),
  assignedToId: z.string().trim().optional(),
  // Dashboard shortcuts (Module 4: "Due Today" / "Overdue")
  dueBy:        z.string().optional(),   // ISO date — dueDate <= this
  mine:         z.coerce.boolean().optional(),
});
