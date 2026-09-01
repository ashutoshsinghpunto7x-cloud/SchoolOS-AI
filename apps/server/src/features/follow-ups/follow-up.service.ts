import { followUpRepository, PaginatedFollowUps } from './follow-up.repository';
import { IFollowUp } from './follow-up.model';
import {
  createFollowUpSchema,
  completeFollowUpSchema,
  rescheduleFollowUpSchema,
  listFollowUpsSchema,
} from './follow-up.validation';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { enquiryRepository } from '../enquiries/enquiry.repository';

export const followUpService = {
  async createFollowUp(rawInput: unknown, ctx: AuthContext): Promise<IFollowUp> {
    const data = createFollowUpSchema.parse(rawInput);

    const enquiry = await enquiryRepository.findById(data.enquiryId, ctx.schoolId);
    if (!enquiry) throw new NotFoundError('Enquiry');

    const followUp = await followUpRepository.create({
      schoolId:     ctx.schoolId,
      enquiryId:    data.enquiryId,
      dueDate:      new Date(data.dueDate),
      assignedToId: data.assignedToId ?? ctx.userId,
      channel:      data.channel,
      createdBy:    ctx.displayName,
    });

    // Keeps the pipeline view's "Follow-up Date" column current without a
    // second manual edit on the enquiry itself.
    await enquiryRepository.setFollowUpDate(data.enquiryId, ctx.schoolId, followUp.dueDate);

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'follow_up.created',
      resource: 'follow_ups', resourceId: followUp._id.toString(),
      details: { enquiryId: data.enquiryId, dueDate: data.dueDate }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return followUp;
  },

  async listFollowUps(rawQuery: unknown, ctx: AuthContext): Promise<PaginatedFollowUps> {
    const opts = listFollowUpsSchema.parse(rawQuery);
    return followUpRepository.findAll(ctx.schoolId, {
      page: opts.page,
      limit: opts.limit,
      enquiryId: opts.enquiryId,
      status: opts.status,
      assignedToId: opts.mine ? ctx.userId : opts.assignedToId,
      dueBy: opts.dueBy ? new Date(opts.dueBy) : undefined,
    });
  },

  async getFollowUp(id: string, ctx: AuthContext): Promise<IFollowUp> {
    const followUp = await followUpRepository.findById(id, ctx.schoolId);
    if (!followUp) throw new NotFoundError('Follow-up');
    return followUp;
  },

  /** Marks the attempt done. If `nextFollowUpDate` is given, chains straight
   *  into the next attempt (one action instead of "complete, then remember to
   *  separately schedule the next one") — otherwise the enquiry's follow-up
   *  date is cleared, since nothing else is pending. */
  async completeFollowUp(id: string, rawInput: unknown, ctx: AuthContext): Promise<IFollowUp> {
    const { outcome, nextFollowUpDate } = completeFollowUpSchema.parse(rawInput);
    const existing = await followUpService.getFollowUp(id, ctx);
    if (existing.status === 'completed') throw new ValidationError('This follow-up is already completed.');

    const followUp = await followUpRepository.setStatus(id, ctx.schoolId, {
      status: 'completed',
      completedAt: new Date(),
      outcome,
      nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : undefined,
    });
    if (!followUp) throw new NotFoundError('Follow-up');

    await enquiryRepository.setLastContactedAt(existing.enquiryId, ctx.schoolId, new Date());

    if (nextFollowUpDate) {
      const chained = await followUpRepository.create({
        schoolId: ctx.schoolId, enquiryId: existing.enquiryId, dueDate: new Date(nextFollowUpDate),
        assignedToId: existing.assignedToId, channel: existing.channel, createdBy: ctx.displayName,
      });
      await enquiryRepository.setFollowUpDate(existing.enquiryId, ctx.schoolId, chained.dueDate);
    } else {
      await enquiryRepository.setFollowUpDate(existing.enquiryId, ctx.schoolId, null);
    }

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'follow_up.completed',
      resource: 'follow_ups', resourceId: id, details: { enquiryId: existing.enquiryId }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return followUp;
  },

  async rescheduleFollowUp(id: string, rawInput: unknown, ctx: AuthContext): Promise<IFollowUp> {
    const { nextFollowUpDate, outcome } = rescheduleFollowUpSchema.parse(rawInput);
    const existing = await followUpService.getFollowUp(id, ctx);
    if (existing.status === 'completed') throw new ValidationError('This follow-up is already completed.');

    await followUpRepository.setStatus(id, ctx.schoolId, {
      status: 'rescheduled', outcome, nextFollowUpDate: new Date(nextFollowUpDate),
    });

    const chained = await followUpRepository.create({
      schoolId: ctx.schoolId, enquiryId: existing.enquiryId, dueDate: new Date(nextFollowUpDate),
      assignedToId: existing.assignedToId, channel: existing.channel, createdBy: ctx.displayName,
    });
    await enquiryRepository.setFollowUpDate(existing.enquiryId, ctx.schoolId, chained.dueDate);

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'follow_up.rescheduled',
      resource: 'follow_ups', resourceId: id, details: { enquiryId: existing.enquiryId, nextFollowUpDate }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return chained;
  },

  async deleteFollowUp(id: string, ctx: AuthContext): Promise<void> {
    const existing = await followUpService.getFollowUp(id, ctx);
    const deleted = await followUpRepository.softDelete(id, ctx.schoolId, ctx.displayName);
    if (!deleted) throw new NotFoundError('Follow-up');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'follow_up.deleted',
      resource: 'follow_ups', resourceId: id, details: { enquiryId: existing.enquiryId }, ip: ctx.ip, schoolId: ctx.schoolId,
    });
  },
};
