import { z } from 'zod';
import { INVENTORY_CATEGORIES } from './inventory-item.model';

export const createInventoryItemSchema = z.object({
  itemName:          z.string({ required_error: 'itemName is required' }).min(2).max(200).trim(),
  category:          z.enum(INVENTORY_CATEGORIES as [string, ...string[]], { required_error: 'category is required' }),
  sku:               z.string().max(60).trim().optional(), // auto-generated when omitted
  qtyAvailable:      z.coerce.number().min(0).default(0),
  minStockLevel:     z.coerce.number().min(0).default(0),
  unitPrice:         z.coerce.number().min(0).optional(),
  preferredVendorId: z.string().optional(),
  storageLocation:   z.string().max(200).trim().optional(),
});

export const updateInventoryItemSchema = z.object({
  itemName:          z.string().min(2).max(200).trim().optional(),
  category:          z.enum(INVENTORY_CATEGORIES as [string, ...string[]]).optional(),
  minStockLevel:     z.coerce.number().min(0).optional(),
  unitPrice:         z.coerce.number().min(0).optional(),
  preferredVendorId: z.string().optional(),
  storageLocation:   z.string().max(200).trim().optional(),
});

export const listInventoryItemsSchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
  search:   z.string().optional(),
  category: z.enum(INVENTORY_CATEGORIES as [string, ...string[]]).optional(),
  lowStock: z.coerce.boolean().optional(),
});

export const createStockMovementSchema = z.object({
  type:     z.enum(['added', 'issued', 'returned', 'damaged', 'lost'], { required_error: 'type is required' }),
  qty:      z.coerce.number().int().positive(),
  issuedTo: z.string().optional(),
  note:     z.string().max(500).trim().optional(),
});

export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;
export type ListInventoryItemsInput  = z.infer<typeof listInventoryItemsSchema>;
export type CreateStockMovementInput = z.infer<typeof createStockMovementSchema>;
