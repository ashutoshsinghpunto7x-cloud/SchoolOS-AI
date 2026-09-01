import { z } from 'zod';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
const STATUSES = ['open', 'in_progress', 'completed', 'snoozed', 'cancelled'] as const;

export const createReceptionTaskSchema = z.object({
  title:        z.string().trim().min(2, 'Task title is required').max(200),
  description:  z.string().trim().max(1000).optional(),
  priority:     z.enum(PRIORITIES).default('medium'),
  dueDate:      z.string().min(1, 'Due date is required'),
  assignedToId: z.string().trim().min(1, 'Assign this task to someone'),
});

export const updateReceptionTaskSchema = z.object({
  title:        z.string().trim().min(2).max(200).optional(),
  description:  z.string().trim().max(1000).optional(),
  priority:     z.enum(PRIORITIES).optional(),
  dueDate:      z.string().optional(),
  assignedToId: z.string().trim().min(1).optional(),
});

export const completeReceptionTaskSchema = z.object({
  completionNotes: z.string().trim().max(1000).optional(),
});

export const snoozeReceptionTaskSchema = z.object({
  dueDate: z.string().min(1, 'Pick a new due date'),
});

export const listReceptionTasksSchema = z.object({
  page:         z.coerce.number().int().min(1).default(1),
  limit:        z.coerce.number().int().min(1).max(200).default(50),
  status:       z.enum(STATUSES).optional(),
  priority:     z.enum(PRIORITIES).optional(),
  assignedToId: z.string().trim().optional(),
  // Reception's own "My Tasks" view vs. principal/admin's "everyone" view —
  // service layer decides which is allowed based on the caller's role.
  mine:         z.coerce.boolean().optional(),
});
