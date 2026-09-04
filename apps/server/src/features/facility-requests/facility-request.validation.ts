import { z } from 'zod';

export const createFacilityRequestSchema = z.object({
  issueType:   z.enum(['electrical', 'plumbing', 'furniture', 'computer', 'ac', 'other'], { required_error: 'issueType is required' }),
  priority:    z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  location:    z.string({ required_error: 'location is required' }).min(1).max(200).trim(),
  assetId:     z.string().optional(),
  description: z.string().max(1000).trim().optional(),
});

export const assignFacilityRequestSchema = z.object({
  assignedToType: z.enum(['employee', 'vendor'], { required_error: 'assignedToType is required' }),
  assignedToId:   z.string({ required_error: 'assignedToId is required' }).min(1),
  assignedToName: z.string({ required_error: 'assignedToName is required' }).min(1).trim(),
});

export const updateFacilityRequestStatusSchema = z.object({
  status:          z.enum(['in_progress', 'completed', 'cancelled'], { required_error: 'status is required' }),
  resolutionNotes: z.string().max(1000).trim().optional(),
});

export const listFacilityRequestsSchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
  status:   z.enum(['open', 'assigned', 'in_progress', 'completed', 'cancelled']).optional(),
  issueType: z.enum(['electrical', 'plumbing', 'furniture', 'computer', 'ac', 'other']).optional(),
});

export type CreateFacilityRequestInput = z.infer<typeof createFacilityRequestSchema>;
export type AssignFacilityRequestInput = z.infer<typeof assignFacilityRequestSchema>;
export type UpdateFacilityRequestStatusInput = z.infer<typeof updateFacilityRequestStatusSchema>;
export type ListFacilityRequestsInput = z.infer<typeof listFacilityRequestsSchema>;
