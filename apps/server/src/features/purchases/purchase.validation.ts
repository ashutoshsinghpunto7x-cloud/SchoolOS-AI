import { z } from 'zod';
import { PURCHASE_CATEGORIES } from './purchase-request.model';

// ── Purchase Request ──────────────────────────────────────────────────────────

const purchaseRequestItemSchema = z.object({
  name:          z.string({ required_error: 'item name is required' }).min(1).max(200).trim(),
  quantity:      z.coerce.number().int().positive(),
  unit:          z.string({ required_error: 'unit is required' }).min(1).max(30).trim(),
  estimatedCost: z.coerce.number().min(0).optional(),
});

export const createPurchaseRequestSchema = z.object({
  raisedBy:       z.string({ required_error: 'raisedBy is required' }).min(1),
  department:     z.string().max(200).trim().optional(),
  category:       z.enum(PURCHASE_CATEGORIES as [string, ...string[]], { required_error: 'category is required' }),
  items:          z.array(purchaseRequestItemSchema).min(1, 'at least one item is required'),
  justification:  z.string().max(1000).trim().optional(),
});

export const decidePurchaseRequestSchema = z.object({
  rejectionReason: z.string().max(500).trim().optional(),
});

export const listPurchaseRequestsSchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
  status:   z.enum(['pending', 'approved', 'rejected', 'converted']).optional(),
  category: z.enum(PURCHASE_CATEGORIES as [string, ...string[]]).optional(),
});

// ── Purchase Order ────────────────────────────────────────────────────────────

const poLineItemSchema = z.object({
  itemName:  z.string({ required_error: 'item name is required' }).min(1).max(200).trim(),
  quantity:  z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().min(0),
});

export const createPurchaseOrderSchema = z.object({
  vendorId:     z.string({ required_error: 'vendorId is required' }).min(1),
  requestIds:   z.array(z.string()).default([]),
  lineItems:    z.array(poLineItemSchema).min(1, 'at least one line item is required'),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const receivePurchaseOrderSchema = z.object({
  // per line item, how many of the ordered quantity arrived — defaults to full quantity when omitted
  received: z.array(z.object({ itemName: z.string().min(1), quantity: z.coerce.number().int().min(0) })).optional(),
});

export const listPurchaseOrdersSchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['issued', 'partially_received', 'received', 'closed']).optional(),
  vendorId: z.string().optional(),
});

// ── Inferred types ────────────────────────────────────────────────────────────

export type CreatePurchaseRequestInput  = z.infer<typeof createPurchaseRequestSchema>;
export type DecidePurchaseRequestInput  = z.infer<typeof decidePurchaseRequestSchema>;
export type ListPurchaseRequestsInput   = z.infer<typeof listPurchaseRequestsSchema>;
export type CreatePurchaseOrderInput    = z.infer<typeof createPurchaseOrderSchema>;
export type ReceivePurchaseOrderInput   = z.infer<typeof receivePurchaseOrderSchema>;
export type ListPurchaseOrdersInput     = z.infer<typeof listPurchaseOrdersSchema>;
