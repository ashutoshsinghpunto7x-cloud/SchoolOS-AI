import { Worksheet, IWorksheet, IWorksheetQuestion, WorksheetType } from './worksheet.model';

export interface WorksheetListOptions {
  page?: number;
  limit?: number;
  class?: string;
  subject?: string;
  chapterId?: string;
  worksheetType?: WorksheetType;
}

export interface PaginatedWorksheets {
  worksheets: IWorksheet[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateWorksheetData {
  schoolId: string;
  teacherId: string;
  class: string;
  subject: string;
  chapterIds: string[];
  chapterNames: string[];
  worksheetType: WorksheetType;
  title: string;
  questions: IWorksheetQuestion[];
  createdBy: string;
}

export const worksheetRepository = {
  async create(data: CreateWorksheetData): Promise<IWorksheet> {
    return Worksheet.create(data);
  },

  /**
   * Scoped to schoolId + class/subject (when given), NOT teacherId — a worksheet belongs to the
   * class/subject it was made for, so a teacher reassigned onto that class/subject still sees
   * everything a prior teacher generated for it. Pass `teacherId` only to further narrow to "my
   * own worksheets" (e.g. a flat "my worksheets" view with no class/subject picked yet).
   */
  async findAll(schoolId: string, teacherId: string | undefined, opts: WorksheetListOptions = {}): Promise<PaginatedWorksheets> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, isDeleted: false };
    if (teacherId) query.teacherId = teacherId;
    if (opts.class) query.class = opts.class;
    if (opts.subject) query.subject = opts.subject;
    if (opts.chapterId) query.chapterIds = opts.chapterId;
    if (opts.worksheetType) query.worksheetType = opts.worksheetType;

    const [worksheets, total] = await Promise.all([
      Worksheet.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<IWorksheet[]>(),
      Worksheet.countDocuments(query),
    ]);

    return { worksheets, total, page, limit };
  },

  async findById(id: string, schoolId: string): Promise<IWorksheet | null> {
    return Worksheet.findOne({ _id: id, schoolId, isDeleted: false }).lean<IWorksheet>();
  },

  async softDelete(id: string, schoolId: string): Promise<boolean> {
    const res = await Worksheet.updateOne({ _id: id, schoolId, isDeleted: false }, { $set: { isDeleted: true, deletedAt: new Date() } });
    return res.modifiedCount > 0;
  },
};
