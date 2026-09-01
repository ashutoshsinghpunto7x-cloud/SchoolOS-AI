import {
  ReceptionTask, IReceptionTask, ReceptionTaskPriority, ReceptionTaskStatus,
  ReceptionTaskLinkedEntityType, ReceptionTaskSource,
} from './reception-task.model';

export interface CreateReceptionTaskData {
  schoolId: string;
  title: string;
  description?: string;
  priority: ReceptionTaskPriority;
  dueDate: Date;
  assignedToId: string;
  assignedById: string;
  linkedEntityType?: ReceptionTaskLinkedEntityType;
  linkedEntityId?: string;
  source?: ReceptionTaskSource;
}

export interface UpdateReceptionTaskData {
  title?: string;
  description?: string;
  priority?: ReceptionTaskPriority;
  dueDate?: Date;
  assignedToId?: string;
}

export interface FindReceptionTasksOptions {
  page?: number;
  limit?: number;
  status?: ReceptionTaskStatus;
  priority?: ReceptionTaskPriority;
  assignedToId?: string;
}

export interface PaginatedReceptionTasks {
  tasks: IReceptionTask[];
  total: number;
  page: number;
  limit: number;
}

export const receptionTaskRepository = {
  async create(data: CreateReceptionTaskData): Promise<IReceptionTask> {
    const task = new ReceptionTask({
      ...data,
      linkedEntityType: data.linkedEntityType ?? 'none',
      source: data.source ?? 'manual',
      status: 'open',
    });
    return task.save();
  },

  async findById(id: string, schoolId: string): Promise<IReceptionTask | null> {
    return ReceptionTask.findOne({ _id: id, schoolId, isDeleted: false });
  },

  async findAll(schoolId: string, opts: FindReceptionTasksOptions = {}): Promise<PaginatedReceptionTasks> {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(200, Math.max(1, opts.limit ?? 50));
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, isDeleted: false };
    if (opts.status)       query.status = opts.status;
    if (opts.priority)     query.priority = opts.priority;
    if (opts.assignedToId) query.assignedToId = opts.assignedToId;

    const [tasks, total] = await Promise.all([
      ReceptionTask.find(query).sort({ dueDate: 1 }).skip(skip).limit(limit).lean<IReceptionTask[]>(),
      ReceptionTask.countDocuments(query),
    ]);

    return { tasks, total, page, limit };
  },

  async update(id: string, schoolId: string, data: UpdateReceptionTaskData): Promise<IReceptionTask | null> {
    return ReceptionTask.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: data },
      { new: true },
    );
  },

  async setStatus(
    id: string, schoolId: string,
    update: { status: ReceptionTaskStatus; dueDate?: Date; completedAt?: Date; completionNotes?: string },
  ): Promise<IReceptionTask | null> {
    return ReceptionTask.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: update },
      { new: true },
    );
  },

  async softDelete(id: string, schoolId: string, deletedBy: string): Promise<boolean> {
    const result = await ReceptionTask.updateOne(
      { _id: id, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } },
    );
    return result.modifiedCount > 0;
  },

  /** Whether an open (not completed/cancelled) auto-generated task already
   *  exists for this source record — keeps the auto-task cron idempotent so
   *  it doesn't recreate the same task on every tick (see
   *  reception-task-auto.job.ts). */
  async hasOpenAutoTask(
    schoolId: string, linkedEntityType: ReceptionTaskLinkedEntityType, linkedEntityId: string, source: ReceptionTaskSource,
  ): Promise<boolean> {
    const existing = await ReceptionTask.exists({
      schoolId, linkedEntityType, linkedEntityId, source, isDeleted: false,
      status: { $in: ['open', 'in_progress', 'snoozed'] },
    });
    return !!existing;
  },
};
