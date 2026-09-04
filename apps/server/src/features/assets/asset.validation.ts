import { z } from 'zod';
import { ASSET_CATEGORIES } from './asset.model';

const dateStr = (label: string) =>
  z.string({ required_error: `${label} is required` }).regex(/^\d{4}-\d{2}-\d{2}$/, `${label} must be YYYY-MM-DD`);

export const createAssetSchema = z.object({
  name:           z.string({ required_error: 'name is required' }).min(2).max(200).trim(),
  category:       z.enum(ASSET_CATEGORIES as [string, ...string[]], { required_error: 'category is required' }),
  purchaseDate:   dateStr('purchaseDate').optional(),
  purchaseCost:   z.coerce.number().min(0).optional(),
  vendorId:       z.string().optional(),
  warrantyExpiry: dateStr('warrantyExpiry').optional(),
  amcExpiry:      dateStr('amcExpiry').optional(),
  location:       z.string({ required_error: 'location is required' }).min(1).max(200).trim(),
  assignedTo:     z.string().optional(),
});

export const updateAssetSchema = z.object({
  name:           z.string().min(2).max(200).trim().optional(),
  category:       z.enum(ASSET_CATEGORIES as [string, ...string[]]).optional(),
  purchaseDate:   dateStr('purchaseDate').optional(),
  purchaseCost:   z.coerce.number().min(0).optional(),
  vendorId:       z.string().optional(),
  warrantyExpiry: dateStr('warrantyExpiry').optional(),
  amcExpiry:      dateStr('amcExpiry').optional(),
  location:       z.string().min(1).max(200).trim().optional(),
  assignedTo:     z.string().optional(),
  status:         z.enum(['active', 'under_repair', 'disposed']).optional(),
});

export const listAssetsSchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
  search:   z.string().optional(),
  category: z.enum(ASSET_CATEGORIES as [string, ...string[]]).optional(),
  status:   z.enum(['active', 'under_repair', 'disposed']).optional(),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type ListAssetsInput  = z.infer<typeof listAssetsSchema>;
