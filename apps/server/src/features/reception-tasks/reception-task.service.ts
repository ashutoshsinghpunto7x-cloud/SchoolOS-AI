import {
  receptionTaskRepository,
  PaginatedReceptionTasks,
  CreateReceptionTaskData,
} from './reception-task.repository';
import { IReceptionTask, ReceptionTaskStatus } from './reception-task.model';
import {
  createReceptionTaskSchema,
  updateReceptionTaskSchema,
  completeReceptionTaskSchema,
  snoozeReceptionTaskSchema,
  listReceptionTasksSchema,
} from './reception-task.validation';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { notificationService } from '../notifications/notification.service';

// Roles that can see and assign across everyone's tasks — everyone else
// (reception, counselors) only ever sees their own, no matter what they pass
// in the query string. Mirrors the SRD's permissions matrix (§4).
const OVERSIGHT_ROLES = ['admin', 'principal', 'incharge'];

const STATUS_TRANSITIONS: Record<ReceptionTaskStatus, ReceptionTaskStatus[]> = {
  open:        ['in_progress', 'completed', 'snoozed', 'cancelled'],
  in_progress: ['completed', 'snoozed', 'cancelled'],
  completed:   [],
  snoozed:     ['open', 'in_progress', 'completed', 'cancelled'],
  cancelled:   [],
};

export const receptionTaskService = {
  async createTask(rawInput: unknown, ctx: AuthContext): Promise<IReceptionTask> {
    const data = createReceptionTaskSchema.parse(rawInput);

    const task = await receptionTaskRepository.create({
      schoolId:     ctx.schoolId,
      title:        data.title,
      description:  data.description,
      priority:     data.priority,
      dueDate:      new Date(data.dueDate),
      assignedToId: data.assignedToId,
      assignedById: ctx.userId,
    });

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'reception_task.created',
      resource: 'reception_tasks', resourceId: task._id.toString(),
      details: { title: data.title, assignedToId: data.assignedToId }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    // Best-effort: let the assignee know, unless they assigned it to themselves.
    if (data.assignedToId !== ctx.userId) {
      void notificationService.sendToUser({
        recipientUserId: data.assignedToId,
        type: 'message',
        title: 'New task assigned to you',
        body: data.title,
      }, ctx).catch(() => {});
    }

    return task;
  },

  async listTasks(rawQuery: unknown, ctx: AuthContext): Promise<PaginatedReceptionTasks> {
    const opts = listReceptionTasksSchema.parse(rawQuery);
    const hasOversight = OVERSIGHT_ROLES.includes(ctx.role);

    // Oversight roles may explicitly ask for "mine" or filter by any
    // assignee; everyone else is hard-pinned to their own tasks regardless
    // of what the query string says.
    const assignedToId = hasOversight
      ? (opts.mine ? ctx.userId : opts.assignedToId)
      : ctx.userId;

    return receptionTaskRepository.findAll(ctx.schoolId, {
      page: opts.page, limit: opts.limit, status: opts.status, priority: opts.priority, assignedToId,
    });
  },

  async getTask(id: string, ctx: AuthContext): Promise<IReceptionTask> {
    const task = await receptionTaskRepository.findById(id, ctx.schoolId);
    if (!task) throw new NotFoundError('Task');
    if (task.assignedToId !== ctx.userId && !OVERSIGHT_ROLES.includes(ctx.role)) {
      throw new NotFoundError('Task');
    }
    return task;
  },

  async updateTask(id: string, rawInput: unknown, ctx: AuthContext): Promise<IReceptionTask> {
    const data = updateReceptionTaskSchema.parse(rawInput);
    const existing = await receptionTaskService.getTask(id, ctx);

    const task = await receptionTaskRepository.update(id, ctx.schoolId, {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    });
    if (!task) throw new NotFoundError('Task');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'reception_task.updated',
      resource: 'reception_tasks', resourceId: id, details: { title: existing.title }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return task;
  },

  async setStatus(id: string, nextStatus: ReceptionTaskStatus, ctx: AuthContext): Promise<IReceptionTask> {
    const existing = await receptionTaskService.getTask(id, ctx);
    const allowed = STATUS_TRANSITIONS[existing.status];
    if (!allowed.includes(nextStatus)) {
      throw new ValidationError(
        `Cannot move a task from "${existing.status}" to "${nextStatus}". ` +
        `Allowed next steps: ${allowed.length ? allowed.join(', ') : 'none — this is a final state'}.`
      );
    }

    const update: Parameters<typeof receptionTaskRepository.setStatus>[2] = { status: nextStatus };
    if (nextStatus === 'completed') update.completedAt = new Date();

    const task = await receptionTaskRepository.setStatus(id, ctx.schoolId, update);
    if (!task) throw new NotFoundError('Task');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: `reception_task.status_${nextStatus}`,
      resource: 'reception_tasks', resourceId: id, details: { title: existing.title, from: existing.status, to: nextStatus },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return task;
  },

  async completeTask(id: string, rawInput: unknown, ctx: AuthContext): Promise<IReceptionTask> {
    const { completionNotes } = completeReceptionTaskSchema.parse(rawInput);
    const existing = await receptionTaskService.getTask(id, ctx);
    const allowed = STATUS_TRANSITIONS[existing.status];
    if (!allowed.includes('completed')) {
      throw new ValidationError(`Cannot complete a task that is "${existing.status}".`);
    }

    const task = await receptionTaskRepository.setStatus(id, ctx.schoolId, {
      status: 'completed', completedAt: new Date(), completionNotes,
    });
    if (!task) throw new NotFoundError('Task');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'reception_task.status_completed',
      resource: 'reception_tasks', resourceId: id, details: { title: existing.title }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return task;
  },

  async snoozeTask(id: string, rawInput: unknown, ctx: AuthContext): Promise<IReceptionTask> {
    const { dueDate } = snoozeReceptionTaskSchema.parse(rawInput);
    const existing = await receptionTaskService.getTask(id, ctx);
    const allowed = STATUS_TRANSITIONS[existing.status];
    if (!allowed.includes('snoozed')) {
      throw new ValidationError(`Cannot snooze a task that is "${existing.status}".`);
    }

    const task = await receptionTaskRepository.setStatus(id, ctx.schoolId, {
      status: 'snoozed', dueDate: new Date(dueDate),
    });
    if (!task) throw new NotFoundError('Task');
    return task;
  },

  async deleteTask(id: string, ctx: AuthContext): Promise<void> {
    const existing = await receptionTaskService.getTask(id, ctx);
    const deleted = await receptionTaskRepository.softDelete(id, ctx.schoolId, ctx.displayName);
    if (!deleted) throw new NotFoundError('Task');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'reception_task.deleted',
      resource: 'reception_tasks', resourceId: id, details: { title: existing.title }, ip: ctx.ip, schoolId: ctx.schoolId,
    });
  },

  /** Used only by the auto-task cron (see reception-task-auto.job.ts) — bypasses
   *  the create-schema's human-facing validation since the caller already
   *  knows exactly what it wants. Not exposed via any route. */
  async createAutoTask(data: CreateReceptionTaskData): Promise<IReceptionTask | null> {
    if (data.linkedEntityType && data.linkedEntityType !== 'none' && data.linkedEntityId && data.source) {
      const alreadyExists = await receptionTaskRepository.hasOpenAutoTask(
        data.schoolId, data.linkedEntityType, data.linkedEntityId, data.source,
      );
      if (alreadyExists) return null;
    }
    return receptionTaskRepository.create(data);
  },
};
