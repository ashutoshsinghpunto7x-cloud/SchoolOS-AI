import { inventoryRepository, PaginatedInventoryItems } from './inventory.repository';
import { IInventoryItem, InventoryCategory } from './inventory-item.model';
import { IStockMovement, StockMovementRefType, StockMovementType } from './stock-movement.model';
import {
  createInventoryItemSchema,
  updateInventoryItemSchema,
  listInventoryItemsSchema,
  createStockMovementSchema,
} from './inventory.validation';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { nextSequence } from '../../lib/counter.model';

const SKU_PREFIXES: Record<InventoryCategory, string> = {
  stationery: 'STA', furniture: 'FUR', it_equipment: 'ITE', sports_equipment: 'SPT',
  electrical: 'ELE', lab_equipment: 'LAB', cleaning_materials: 'CLN', consumables: 'CON', other: 'OTH',
};

async function generateSku(schoolId: string, category: InventoryCategory): Promise<string> {
  const seq = await nextSequence(`inventoryItem:${schoolId}:${category}`);
  return `${SKU_PREFIXES[category]}-${String(seq).padStart(4, '0')}`;
}

export const inventoryService = {
  async createItem(rawInput: unknown, ctx: AuthContext): Promise<IInventoryItem> {
    const data = createInventoryItemSchema.parse(rawInput);
    const sku = data.sku?.trim() || (await generateSku(ctx.schoolId, data.category as InventoryCategory));

    const item = await inventoryRepository.create({
      schoolId: ctx.schoolId,
      sku,
      itemName: data.itemName,
      category: data.category as InventoryCategory,
      qtyAvailable: data.qtyAvailable,
      minStockLevel: data.minStockLevel,
      unitPrice: data.unitPrice,
      preferredVendorId: data.preferredVendorId,
      storageLocation: data.storageLocation,
      createdBy: ctx.displayName,
    });

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'inventory_item.created', resource: 'inventory', resourceId: item._id.toString(),
      details: { itemName: item.itemName, sku: item.sku },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return item;
  },

  /** Reused by Purchase Order receiving: returns the existing item matching
   *  `itemName` (case-insensitive), or creates one with qty 0 first. */
  async findOrCreateByName(itemName: string, ctx: AuthContext): Promise<IInventoryItem> {
    const existing = await inventoryRepository.findByName(itemName, ctx.schoolId);
    if (existing) return existing;

    const sku = await generateSku(ctx.schoolId, 'other');
    return inventoryRepository.create({
      schoolId: ctx.schoolId,
      sku,
      itemName,
      category: 'other',
      qtyAvailable: 0,
      minStockLevel: 0,
      createdBy: ctx.displayName,
    });
  },

  async listItems(rawQuery: unknown, ctx: AuthContext): Promise<PaginatedInventoryItems> {
    const query = listInventoryItemsSchema.parse(rawQuery);
    return inventoryRepository.findAll(ctx.schoolId, {
      page: query.page, limit: query.limit, search: query.search,
      category: query.category as InventoryCategory | undefined, lowStock: query.lowStock,
    });
  },

  async getById(id: string, ctx: AuthContext): Promise<IInventoryItem> {
    const item = await inventoryRepository.findById(id, ctx.schoolId);
    if (!item) throw new NotFoundError('Inventory item');
    return item;
  },

  async updateItem(id: string, rawInput: unknown, ctx: AuthContext): Promise<IInventoryItem> {
    const data = updateInventoryItemSchema.parse(rawInput);
    const updated = await inventoryRepository.update(id, ctx.schoolId, { ...data, updatedBy: ctx.displayName } as never);
    if (!updated) throw new NotFoundError('Inventory item');
    return updated;
  },

  async deleteItem(id: string, ctx: AuthContext): Promise<void> {
    const deleted = await inventoryRepository.softDelete(id, ctx.schoolId, ctx.displayName);
    if (!deleted) throw new NotFoundError('Inventory item');
  },

  async countLowStock(ctx: AuthContext): Promise<number> {
    return inventoryRepository.countLowStock(ctx.schoolId);
  },

  /** Manual stock movement (stock-in / issue / return / damage / lost) raised
   *  directly against an item — distinct from the automatic 'added' movement
   *  a Purchase Order receipt writes via recordMovement() below. */
  async createMovement(itemId: string, rawInput: unknown, ctx: AuthContext): Promise<IStockMovement> {
    const data = createStockMovementSchema.parse(rawInput);
    const item = await inventoryRepository.findById(itemId, ctx.schoolId);
    if (!item) throw new NotFoundError('Inventory item');

    const delta = data.type === 'added' || data.type === 'returned' ? data.qty : -data.qty;
    if (item.qtyAvailable + delta < 0) {
      throw new ValidationError(`Cannot ${data.type} ${data.qty} — only ${item.qtyAvailable} available`);
    }

    const updated = await inventoryRepository.adjustQuantity(itemId, ctx.schoolId, delta);
    const movement = await inventoryRepository.recordMovement({
      schoolId: ctx.schoolId,
      itemId,
      itemName: item.itemName,
      type: data.type,
      qty: data.qty,
      balanceAfter: updated!.qtyAvailable,
      refType: 'requisition',
      issuedTo: data.issuedTo,
      recordedBy: ctx.displayName,
      note: data.note,
    });

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'stock_movement.recorded', resource: 'inventory', resourceId: movement._id.toString(),
      details: { itemId, itemName: item.itemName, type: data.type, qty: data.qty },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return movement;
  },

  /** Reused by Purchase Order receiving to write the 'added' movement and
   *  bump qtyAvailable in one call, tagged back to the PO. */
  async recordReceipt(
    itemId: string,
    itemName: string,
    qty: number,
    refType: StockMovementRefType,
    refId: string,
    ctx: AuthContext,
  ): Promise<IStockMovement> {
    const updated = await inventoryRepository.adjustQuantity(itemId, ctx.schoolId, qty);
    if (!updated) throw new NotFoundError('Inventory item');

    return inventoryRepository.recordMovement({
      schoolId: ctx.schoolId,
      itemId,
      itemName,
      type: 'added' as StockMovementType,
      qty,
      balanceAfter: updated.qtyAvailable,
      refType,
      refId,
      recordedBy: ctx.displayName,
    });
  },

  async listMovements(itemId: string, ctx: AuthContext): Promise<IStockMovement[]> {
    return inventoryRepository.listMovements(itemId, ctx.schoolId);
  },
};
