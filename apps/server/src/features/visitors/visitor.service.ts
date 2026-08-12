import {
  visitorRepository,
  PaginatedVisitors,
} from './visitor.repository';
import { IVisitor } from './visitor.model';
import {
  createVisitorSchema,
  checkOutVisitorSchema,
  listVisitorsSchema,
} from './visitor.validation';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';

export const visitorService = {
  async createVisitor(rawInput: unknown, ctx: AuthContext): Promise<IVisitor> {
    const data = createVisitorSchema.parse(rawInput);

    const visitor = await visitorRepository.create({
      schoolId:       ctx.schoolId,
      name:           data.name,
      contactNumber:  data.contactNumber,
      purpose:        data.purpose,
      purposeNote:    data.purposeNote,
      personToVisit:  data.personToVisit,
      checkInTime:    data.checkInTime ? new Date(data.checkInTime) : new Date(),
      recordedById:   ctx.userId,
      recordedByName: ctx.displayName,
    });

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'visitor.checked_in',
      resource:        'visitors',
      resourceId:      visitor._id.toString(),
      details:         { name: data.name, purpose: data.purpose, personToVisit: data.personToVisit },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });

    return visitor;
  },

  async listVisitors(rawQuery: unknown, ctx: AuthContext): Promise<PaginatedVisitors> {
    const opts = listVisitorsSchema.parse(rawQuery);
    return visitorRepository.findAll(ctx.schoolId, opts);
  },

  async getVisitor(id: string, ctx: AuthContext): Promise<IVisitor> {
    const visitor = await visitorRepository.findById(id, ctx.schoolId);
    if (!visitor) throw new NotFoundError('Visitor');
    return visitor;
  },

  async checkOutVisitor(id: string, rawInput: unknown, ctx: AuthContext): Promise<IVisitor> {
    const existing = await visitorRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Visitor');
    if (existing.checkOutTime) throw new ValidationError('Visitor has already been checked out');

    const { checkOutTime } = checkOutVisitorSchema.parse(rawInput);

    const visitor = await visitorRepository.checkOut(
      id,
      ctx.schoolId,
      checkOutTime ? new Date(checkOutTime) : new Date(),
    );
    if (!visitor) throw new NotFoundError('Visitor');

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'visitor.checked_out',
      resource:        'visitors',
      resourceId:      id,
      details:         { name: existing.name },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });

    return visitor;
  },

  async deleteVisitor(id: string, ctx: AuthContext): Promise<void> {
    const existing = await visitorRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Visitor');

    const deleted = await visitorRepository.softDelete(id, ctx.schoolId, ctx.displayName);
    if (!deleted) throw new NotFoundError('Visitor');

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'visitor.deleted',
      resource:        'visitors',
      resourceId:      id,
      details:         { name: existing.name },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });
  },
};
