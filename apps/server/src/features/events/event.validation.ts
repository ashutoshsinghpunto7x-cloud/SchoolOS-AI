import { z } from 'zod';

const EVENT_TYPES = [
  'holiday', 'ptm', 'examination', 'school_event',
  'staff_meeting', 'fee_due_date', 'admission_event', 'general',
] as const;

const EVENT_STATUSES = ['draft', 'scheduled', 'published', 'completed', 'cancelled'] as const;
const AUDIENCES      = ['all', 'students', 'teachers', 'parents', 'staff'] as const;
const TIME_REGEX     = /^\d{2}:\d{2}$/;

const createEventBaseSchema = z.object({
  title:       z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(2000).optional(),
  eventType:   z.enum(EVENT_TYPES),
  // The create form has no draft/publish toggle — whatever the principal
  // submits is meant to show up immediately on every dashboard, so default
  // to 'published' rather than 'draft' (was silently hiding new events from
  // upcoming-events widgets on every dashboard until someone manually
  // changed status via the event detail page).
  status:      z.enum(EVENT_STATUSES).default('published'),
  startDate:   z.string().min(1, 'Start date is required'),
  endDate:     z.string().min(1, 'End date is required'),
  startTime:   z.string().regex(TIME_REGEX, 'Expected HH:MM').optional(),
  endTime:     z.string().regex(TIME_REGEX, 'Expected HH:MM').optional(),
  isAllDay:    z.boolean().default(true),
  location:    z.string().trim().max(500).optional(),
  audience:    z.array(z.enum(AUDIENCES)).min(1).default(['all']),
  organizer:   z.string().trim().max(200).optional(),
  notes:       z.string().max(5000).optional(),
  tags:        z.array(z.string().trim().max(50)).default([]),
  metadata:    z.record(z.unknown()).optional(),
});

export const createEventSchema = createEventBaseSchema.refine(
  (d) => new Date(d.startDate) <= new Date(d.endDate),
  { message: 'startDate must be before or equal to endDate', path: ['endDate'] },
);

export const updateEventSchema = createEventBaseSchema
  .omit({ status: true })
  .partial()
  .refine(
    (d) => {
      if (d.startDate && d.endDate) return new Date(d.startDate) <= new Date(d.endDate);
      return true;
    },
    { message: 'startDate must be before or equal to endDate', path: ['endDate'] },
  );

export const updateStatusSchema = z.object({
  status: z.enum(EVENT_STATUSES),
});

export const listEventsSchema = z.object({
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(500).default(20),
  search:    z.string().trim().optional(),
  eventType: z.enum(EVENT_TYPES).optional(),
  status:    z.enum(EVENT_STATUSES).optional(),
  audience:  z.enum(AUDIENCES).optional(),
  startFrom: z.string().optional(),
  startTo:   z.string().optional(),
  month:     z.coerce.number().int().min(1).max(12).optional(),
  year:      z.coerce.number().int().min(2000).max(2100).optional(),
  sortBy:    z.enum(['startDate', 'createdAt', 'title']).default('startDate'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const upcomingEventsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  days:  z.coerce.number().int().min(1).max(365).default(30),
});
