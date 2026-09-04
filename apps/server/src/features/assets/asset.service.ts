import { assetRepository, PaginatedAssets } from './asset.repository';
import { IAsset, AssetCategory } from './asset.model';
import { createAssetSchema, updateAssetSchema, listAssetsSchema } from './asset.validation';
import { NotFoundError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { nextSequence } from '../../lib/counter.model';

const ASSET_ID_PREFIXES: Record<AssetCategory, string> = {
  computers: 'CMP', printers: 'PRN', projectors: 'PRJ', ac_units: 'AC',
  desks: 'DSK', smart_boards: 'SBD', vehicles: 'VEH', other: 'OTH',
};

async function generateAssetId(schoolId: string, category: AssetCategory): Promise<string> {
  const seq = await nextSequence(`asset:${schoolId}:${category}`);
  return `AST-${ASSET_ID_PREFIXES[category]}-${String(seq).padStart(5, '0')}`;
}

export const assetService = {
  async createAsset(rawInput: unknown, ctx: AuthContext): Promise<IAsset> {
    const data = createAssetSchema.parse(rawInput);
    const assetId = await generateAssetId(ctx.schoolId, data.category as AssetCategory);

    const asset = await assetRepository.create({
      schoolId: ctx.schoolId,
      assetId,
      name: data.name,
      category: data.category as AssetCategory,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      purchaseCost: data.purchaseCost,
      vendorId: data.vendorId,
      warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : undefined,
      amcExpiry: data.amcExpiry ? new Date(data.amcExpiry) : undefined,
      location: data.location,
      assignedTo: data.assignedTo,
      status: 'active',
      createdBy: ctx.displayName,
    });

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'asset.created', resource: 'assets', resourceId: asset._id.toString(),
      details: { assetId, name: data.name, category: data.category },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return asset;
  },

  async listAssets(rawQuery: unknown, ctx: AuthContext): Promise<PaginatedAssets> {
    const query = listAssetsSchema.parse(rawQuery);
    return assetRepository.findAll(ctx.schoolId, {
      page: query.page, limit: query.limit, search: query.search,
      category: query.category as AssetCategory | undefined, status: query.status,
    });
  },

  async getById(id: string, ctx: AuthContext): Promise<IAsset> {
    const asset = await assetRepository.findById(id, ctx.schoolId);
    if (!asset) throw new NotFoundError('Asset');
    return asset;
  },

  async countUnderRepair(ctx: AuthContext): Promise<number> {
    return assetRepository.countUnderRepair(ctx.schoolId);
  },

  async updateAsset(id: string, rawInput: unknown, ctx: AuthContext): Promise<IAsset> {
    const data = updateAssetSchema.parse(rawInput);
    const updated = await assetRepository.update(id, ctx.schoolId, {
      ...data,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : undefined,
      amcExpiry: data.amcExpiry ? new Date(data.amcExpiry) : undefined,
      updatedBy: ctx.displayName,
    } as never);
    if (!updated) throw new NotFoundError('Asset');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'asset.updated', resource: 'assets', resourceId: id,
      details: { changes: data },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return updated;
  },

  async deleteAsset(id: string, ctx: AuthContext): Promise<void> {
    const deleted = await assetRepository.softDelete(id, ctx.schoolId, ctx.displayName);
    if (!deleted) throw new NotFoundError('Asset');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'asset.deleted', resource: 'assets', resourceId: id,
      details: {},
      ip: ctx.ip, schoolId: ctx.schoolId,
    });
  },
};
