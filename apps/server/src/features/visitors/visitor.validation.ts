import { z } from 'zod';

const PURPOSES = [
  'meet_student', 'meet_staff', 'admission_enquiry', 'fee_payment',
  'delivery', 'vendor', 'interview', 'other',
] as const;

const phoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number');

export const createVisitorSchema = z.object({
  name:           z.string().trim().min(2, 'Visitor name is required').max(100),
  contactNumber:  phoneSchema,
  purpose:        z.enum(PURPOSES),
  purposeNote:    z.string().trim().max(500).optional(),
  personToVisit:  z.string().trim().min(1, 'Please specify whom the visitor is here to see').max(100),
  checkInTime:    z.string().optional(), // defaults to now if omitted
});

export const checkOutVisitorSchema = z.object({
  checkOutTime: z.string().optional(), // defaults to now if omitted
});

export const listVisitorsSchema = z.object({
  page:        z.coerce.number().int().min(1).default(1),
  limit:       z.coerce.number().int().min(1).max(200).default(50),
  search:      z.string().trim().optional(),
  purpose:     z.enum(PURPOSES).optional(),
  onlyOnSite:  z.coerce.boolean().optional(), // checked in, not yet checked out
  date:        z.string().optional(),          // YYYY-MM-DD, defaults to today's log
  dateFrom:    z.string().optional(),
  dateTo:      z.string().optional(),
});
