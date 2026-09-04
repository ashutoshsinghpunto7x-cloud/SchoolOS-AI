import { facilityRequestRepository, PaginatedFacilityRequests } from './facility-request.repository';
import { IFacilityRequest, FacilityIssueType, FacilityRequestStatus } from './facility-request.model';
import {
  createFacilityRequestSchema,
  assignFacilityRequestSchema,
  updateFacilityRequestStatusSchema,
  listFacilityRequestsSchema,
} from './facility-request.validation';
import { assetRepository } from '../assets/asset.repository';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { nextSequence } from '../../lib/counter.model';

// Only these roles triage (assign/progress/resolve) tickets — everyone else
// who can raise one (e.g. Accountant) is scoped to their own tickets only,
// enforced here rather than trusted from client input.
const TRIAGE_ROLES = ['admin', 'operations_manager'];

async function generateTicketNo(schoolId: string): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await nextSequence(`facilityRequest:${schoolId}:${year}`);
  return `MT-${year}-${String(seq).padStart(4, '0')}`;
}

/**
 * Keeps a linked Asset's status honest against its own tickets: 'under_repair'
 * while any open/assigned/in_progress ticket references it, 'active' again
 * once none do. Called whenever a ticket referencing an asset opens or
 * leaves the open bucket (resolved/cancelled) — never on a disposed asset,
 * and never nudges an already-correct status (no-op write, no audit noise).
 */
async function syncAssetStatus(assetId: string, ctx: AuthContext, ticketNo: string): Promise<void> {
  const asset = await assetRepository.findById(assetId, ctx.schoolId);
  if (!asset || asset.status === 'disposed') return;

  const openTickets = await facilityRequestRepository.countOpenByAsset(ctx.schoolId, assetId);
  const nextStatus = openTickets > 0 ? 'under_repair' : 'active';
  if (asset.status === nextStatus) return;

  await assetRepository.update(assetId, ctx.schoolId, { status: nextStatus });
  auditService.log({
    userId: ctx.userId, userDisplayName: ctx.displayName,
    action: 'asset.updated', resource: 'assets', resourceId: assetId,
    details: { status: nextStatus, trigger: 'facility_request', ticketNo },
    ip: ctx.ip, schoolId: ctx.schoolId,
  });
}

export const facilityRequestService = {
  async createRequest(rawInput: unknown, ctx: AuthContext): Promise<IFacilityRequest> {
    const data = createFacilityRequestSchema.parse(rawInput);
    const ticketNo = await generateTicketNo(ctx.schoolId);

    const request = await facilityRequestRepository.create({
      schoolId: ctx.schoolId,
      ticketNo,
      raisedBy: ctx.userId,
      raisedByName: ctx.displayName,
      raisedByRole: ctx.role,
      issueType: data.issueType as FacilityIssueType,
      priority: data.priority,
      location: data.location,
      assetId: data.assetId,
      description: data.description,
      status: 'open',
    });

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'facility_request.created', resource: 'facility-requests', resourceId: request._id.toString(),
      details: { ticketNo, issueType: data.issueType, priority: data.priority },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    if (data.assetId) await syncAssetStatus(data.assetId, ctx, ticketNo);

    return request;
  },

  async listRequests(rawQuery: unknown, ctx: AuthContext): Promise<PaginatedFacilityRequests> {
    const query = listFacilityRequestsSchema.parse(rawQuery);
    const scopedToSelf = !TRIAGE_ROLES.includes(ctx.role);

    return facilityRequestRepository.findAll(ctx.schoolId, {
      page: query.page, limit: query.limit,
      status: query.status as FacilityRequestStatus | undefined,
      issueType: query.issueType as FacilityIssueType | undefined,
      raisedBy: scopedToSelf ? ctx.userId : undefined,
    });
  },

  async getById(id: string, ctx: AuthContext): Promise<IFacilityRequest> {
    const request = await facilityRequestRepository.findById(id, ctx.schoolId);
    if (!request) throw new NotFoundError('Facility request');
    if (!TRIAGE_ROLES.includes(ctx.role) && request.raisedBy !== ctx.userId) {
      throw new NotFoundError('Facility request');
    }
    return request;
  },

  async countOpen(ctx: AuthContext): Promise<number> {
    return facilityRequestRepository.countOpen(ctx.schoolId);
  },

  async assign(id: string, rawInput: unknown, ctx: AuthContext): Promise<IFacilityRequest> {
    const request = await facilityRequestRepository.findById(id, ctx.schoolId);
    if (!request) throw new NotFoundError('Facility request');
    if (request.status === 'completed' || request.status === 'cancelled') {
      throw new ValidationError(`Ticket is already ${request.status}`);
    }

    const data = assignFacilityRequestSchema.parse(rawInput);
    const updated = await facilityRequestRepository.update(id, ctx.schoolId, {
      assignedToType: data.assignedToType,
      assignedToId: data.assignedToId,
      assignedToName: data.assignedToName,
      status: 'assigned',
      assignedAt: new Date(),
    });
    if (!updated) throw new NotFoundError('Facility request');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'facility_request.assigned', resource: 'facility-requests', resourceId: id,
      details: { ticketNo: request.ticketNo, assignedToType: data.assignedToType, assignedToName: data.assignedToName },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return updated;
  },

  async updateStatus(id: string, rawInput: unknown, ctx: AuthContext): Promise<IFacilityRequest> {
    const request = await facilityRequestRepository.findById(id, ctx.schoolId);
    if (!request) throw new NotFoundError('Facility request');
    if (request.status === 'completed' || request.status === 'cancelled') {
      throw new ValidationError(`Ticket is already ${request.status}`);
    }

    const data = updateFacilityRequestStatusSchema.parse(rawInput);
    if (data.status === 'in_progress' && request.status !== 'assigned') {
      throw new ValidationError('Ticket must be assigned before it can move to in progress');
    }

    const patch: Partial<IFacilityRequest> = { status: data.status, resolutionNotes: data.resolutionNotes };
    if (data.status === 'in_progress') patch.startedAt = new Date();
    if (data.status === 'completed') patch.resolvedAt = new Date();

    const updated = await facilityRequestRepository.update(id, ctx.schoolId, patch);
    if (!updated) throw new NotFoundError('Facility request');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'facility_request.status_changed', resource: 'facility-requests', resourceId: id,
      details: { ticketNo: request.ticketNo, status: data.status },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    // 'completed'/'cancelled' both leave the open bucket — re-check whether
    // any other ticket still holds this asset in 'under_repair'. 'in_progress'
    // stays within the open bucket, so no re-sync is needed for it.
    if (request.assetId && (data.status === 'completed' || data.status === 'cancelled')) {
      await syncAssetStatus(request.assetId, ctx, request.ticketNo);
    }

    return updated;
  },

  async slaReport(ctx: AuthContext): Promise<{ averageResolutionMinutes: number }> {
    const averageResolutionMinutes = await facilityRequestRepository.averageResolutionMinutes(ctx.schoolId);
    return { averageResolutionMinutes };
  },
};
