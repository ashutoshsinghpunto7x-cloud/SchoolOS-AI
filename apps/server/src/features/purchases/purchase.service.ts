import { purchaseRepository, PaginatedPurchaseRequests, PaginatedPurchaseOrders } from './purchase.repository';
import { IPurchaseRequest, PurchaseCategory } from './purchase-request.model';
import { IPurchaseOrder, IPurchaseOrderLineItem } from './purchase-order.model';
import {
  createPurchaseRequestSchema,
  decidePurchaseRequestSchema,
  listPurchaseRequestsSchema,
  createPurchaseOrderSchema,
  receivePurchaseOrderSchema,
  listPurchaseOrdersSchema,
} from './purchase.validation';
import { employeeRepository } from '../employees/employee.repository';
import { vendorRepository } from '../vendors/vendor.repository';
import { vendorService } from '../vendors/vendor.service';
import { inventoryService } from '../inventory/inventory.service';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { nextSequence } from '../../lib/counter.model';

async function generateRequestNo(schoolId: string): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await nextSequence(`purchaseRequest:${schoolId}:${year}`);
  return `PR-${year}-${String(seq).padStart(5, '0')}`;
}

async function generatePoNumber(schoolId: string): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await nextSequence(`purchaseOrder:${schoolId}:${year}`);
  return `PO-${year}-${String(seq).padStart(5, '0')}`;
}

export const purchaseService = {
  // ── Purchase Requests ─────────────────────────────────────────────────────

  async createRequest(rawInput: unknown, ctx: AuthContext): Promise<IPurchaseRequest> {
    const data = createPurchaseRequestSchema.parse(rawInput);

    const employee = await employeeRepository.findById(data.raisedBy, ctx.schoolId);
    if (!employee) throw new NotFoundError('Employee');

    const requestNo = await generateRequestNo(ctx.schoolId);
    const request = await purchaseRepository.createRequest({
      schoolId: ctx.schoolId,
      requestNo,
      raisedBy: data.raisedBy,
      raisedByName: employee.fullName,
      department: data.department ?? employee.department,
      category: data.category as PurchaseCategory,
      items: data.items,
      justification: data.justification,
      status: 'pending',
      createdBy: ctx.displayName,
    });

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'purchase_request.created', resource: 'purchases', resourceId: request._id.toString(),
      details: { requestNo, category: data.category, itemCount: data.items.length },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return request;
  },

  async listRequests(rawQuery: unknown, ctx: AuthContext): Promise<PaginatedPurchaseRequests> {
    const query = listPurchaseRequestsSchema.parse(rawQuery);
    return purchaseRepository.findAllRequests(ctx.schoolId, {
      page: query.page, limit: query.limit,
      status: query.status, category: query.category as PurchaseCategory | undefined,
    });
  },

  async getRequestById(id: string, ctx: AuthContext): Promise<IPurchaseRequest> {
    const request = await purchaseRepository.findRequestById(id, ctx.schoolId);
    if (!request) throw new NotFoundError('Purchase request');
    return request;
  },

  async countPendingRequests(ctx: AuthContext): Promise<number> {
    return purchaseRepository.countPending(ctx.schoolId);
  },

  async decideRequest(
    id: string,
    decision: 'approved' | 'rejected',
    rawInput: unknown,
    ctx: AuthContext,
  ): Promise<IPurchaseRequest> {
    const request = await purchaseRepository.findRequestById(id, ctx.schoolId);
    if (!request) throw new NotFoundError('Purchase request');
    if (request.status !== 'pending') {
      throw new ValidationError(`Request is already ${request.status}, not pending`);
    }

    const data = decidePurchaseRequestSchema.parse(rawInput);
    const updated = await purchaseRepository.updateRequest(id, ctx.schoolId, {
      status: decision,
      approvedBy: ctx.displayName,
      decidedAt: new Date(),
      rejectionReason: decision === 'rejected' ? data.rejectionReason : undefined,
    });
    if (!updated) throw new NotFoundError('Purchase request');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: `purchase_request.${decision}`, resource: 'purchases', resourceId: id,
      details: { requestNo: request.requestNo },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return updated;
  },

  // ── Purchase Orders ───────────────────────────────────────────────────────

  async createOrder(rawInput: unknown, ctx: AuthContext): Promise<IPurchaseOrder> {
    const data = createPurchaseOrderSchema.parse(rawInput);

    const vendor = await vendorRepository.findById(data.vendorId, ctx.schoolId);
    if (!vendor) throw new NotFoundError('Vendor');

    // Every referenced request must exist, belong to this school, and be
    // approved (not already converted/rejected) before it can back a PO.
    for (const requestId of data.requestIds) {
      const request = await purchaseRepository.findRequestById(requestId, ctx.schoolId);
      if (!request) throw new NotFoundError(`Purchase request ${requestId}`);
      if (request.status !== 'approved') {
        throw new ValidationError(`Request ${request.requestNo} is ${request.status}, not approved`);
      }
    }

    const lineItems: IPurchaseOrderLineItem[] = data.lineItems.map((li) => ({
      itemName: li.itemName,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      total: Math.round(li.quantity * li.unitPrice * 100) / 100,
      quantityReceived: 0,
    }));
    const totalAmount = Math.round(lineItems.reduce((sum, li) => sum + li.total, 0) * 100) / 100;

    const poNumber = await generatePoNumber(ctx.schoolId);
    const order = await purchaseRepository.createOrder({
      schoolId: ctx.schoolId,
      poNumber,
      vendorId: data.vendorId,
      vendorName: vendor.name,
      requestIds: data.requestIds,
      lineItems,
      totalAmount,
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
      status: 'issued',
      createdBy: ctx.displayName,
    });

    // Mark backing requests as converted so they drop out of the pending/approved queues.
    await Promise.all(
      data.requestIds.map((requestId) =>
        purchaseRepository.updateRequest(requestId, ctx.schoolId, { status: 'converted', poId: order._id.toString() }),
      ),
    );

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'purchase_order.created', resource: 'purchases', resourceId: order._id.toString(),
      details: { poNumber, vendorId: data.vendorId, totalAmount },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return order;
  },

  async listOrders(rawQuery: unknown, ctx: AuthContext): Promise<PaginatedPurchaseOrders> {
    const query = listPurchaseOrdersSchema.parse(rawQuery);
    return purchaseRepository.findAllOrders(ctx.schoolId, query);
  },

  async getOrderById(id: string, ctx: AuthContext): Promise<IPurchaseOrder> {
    const order = await purchaseRepository.findOrderById(id, ctx.schoolId);
    if (!order) throw new NotFoundError('Purchase order');
    return order;
  },

  /**
   * Marks goods received against a PO: for each line item, writes an 'added'
   * stock movement and bumps inventory (creating the InventoryItem by name if
   * it doesn't exist yet — see inventoryService.findOrCreateByName), then
   * raises a VendorBill in the existing Accountant-owned billing system for
   * the received value so Accountant can record the actual payment there.
   * Reuses vendorService.recordVendorBill rather than tracking payment state
   * a second time — the PO's own paymentStatus is read back from that bill.
   */
  async receiveOrder(id: string, rawInput: unknown, ctx: AuthContext): Promise<IPurchaseOrder> {
    const order = await purchaseRepository.findOrderById(id, ctx.schoolId);
    if (!order) throw new NotFoundError('Purchase order');
    if (order.status === 'received' || order.status === 'closed') {
      throw new ValidationError(`Order is already ${order.status}`);
    }

    const data = receivePurchaseOrderSchema.parse(rawInput);
    const receivedByName = new Map((data.received ?? []).map((r) => [r.itemName, r.quantity]));

    let receivedValue = 0;
    const updatedLineItems: IPurchaseOrderLineItem[] = [];
    for (const line of order.lineItems) {
      const qtyThisReceipt = receivedByName.has(line.itemName)
        ? receivedByName.get(line.itemName)!
        : line.quantity - line.quantityReceived; // default: receive the remainder in full

      if (qtyThisReceipt < 0 || line.quantityReceived + qtyThisReceipt > line.quantity) {
        throw new ValidationError(`Invalid received quantity for "${line.itemName}"`);
      }

      if (qtyThisReceipt > 0) {
        const inventoryItem = await inventoryService.findOrCreateByName(line.itemName, ctx);
        await inventoryService.recordReceipt(
          inventoryItem._id.toString(), line.itemName, qtyThisReceipt, 'po_receipt', order._id.toString(), ctx,
        );
        receivedValue += qtyThisReceipt * line.unitPrice;
      }

      updatedLineItems.push({ ...line, quantityReceived: line.quantityReceived + qtyThisReceipt });
    }

    const fullyReceived = updatedLineItems.every((li) => li.quantityReceived >= li.quantity);
    const anyReceived = updatedLineItems.some((li) => li.quantityReceived > 0);
    const status = fullyReceived ? 'received' : anyReceived ? 'partially_received' : order.status;

    let vendorBillId = order.vendorBillId;
    if (receivedValue > 0 && !vendorBillId) {
      // VendorCategory has no procurement-specific value — 'supplies' is the
      // closest fit and matches how ad-hoc categories are handled elsewhere
      // in this codebase (see vendor.model.ts's 'other' extension-point note).
      const bill = await vendorService.recordVendorBill(order.vendorId, {
        description: `Purchase Order ${order.poNumber}`,
        category: 'supplies',
        amount: Math.round(receivedValue * 100) / 100,
        billDate: new Date().toISOString().slice(0, 10),
      }, ctx);
      vendorBillId = bill._id.toString();
    }

    const updated = await purchaseRepository.updateOrder(id, ctx.schoolId, {
      lineItems: updatedLineItems, status, vendorBillId,
    });
    if (!updated) throw new NotFoundError('Purchase order');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'purchase_order.received', resource: 'purchases', resourceId: id,
      details: { poNumber: order.poNumber, status, receivedValue },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return updated;
  },
};
