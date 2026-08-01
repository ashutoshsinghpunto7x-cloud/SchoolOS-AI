import {
  ReportCardTemplate,
  IReportCardTemplate,
  ITemplateSubjectRow,
  ITemplateSkillSection,
  ITemplateGradingKeyEntry,
  ITemplateExamSlots,
} from './report-card-template.model';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreateReportCardTemplateData {
  schoolId: string;
  class: string;
  academicYear: string;
  subjects: ITemplateSubjectRow[];
  skillSections: ITemplateSkillSection[];
  gradingKey: ITemplateGradingKeyEntry[];
  examSlots: ITemplateExamSlots;
  createdBy?: string;
}

export type UpdateReportCardTemplateData = Partial<
  Pick<CreateReportCardTemplateData, 'subjects' | 'skillSections' | 'gradingKey' | 'examSlots'>
> & { updatedBy?: string };

export interface FindReportCardTemplateOptions {
  class?: string;
  academicYear?: string;
}

// ── Repository ────────────────────────────────────────────────────────────────

export const reportCardTemplateRepository = {
  async create(data: CreateReportCardTemplateData): Promise<IReportCardTemplate> {
    const template = new ReportCardTemplate(data);
    return template.save();
  },

  async findById(id: string, schoolId: string): Promise<IReportCardTemplate | null> {
    return ReportCardTemplate.findOne({ _id: id, schoolId });
  },

  async findByClassYear(schoolId: string, cls: string, academicYear: string): Promise<IReportCardTemplate | null> {
    return ReportCardTemplate.findOne({ schoolId, class: cls, academicYear });
  },

  async findAll(schoolId: string, opts: FindReportCardTemplateOptions): Promise<IReportCardTemplate[]> {
    const query: Record<string, unknown> = { schoolId };
    if (opts.class) query.class = opts.class;
    if (opts.academicYear) query.academicYear = opts.academicYear;
    return ReportCardTemplate.find(query).sort({ class: 1, academicYear: -1 }).lean<IReportCardTemplate[]>();
  },

  async update(id: string, schoolId: string, data: UpdateReportCardTemplateData): Promise<IReportCardTemplate | null> {
    return ReportCardTemplate.findOneAndUpdate(
      { _id: id, schoolId },
      { $set: data },
      { new: true, runValidators: true },
    );
  },

  async updateStatus(id: string, schoolId: string, status: 'draft' | 'published', updatedBy?: string): Promise<IReportCardTemplate | null> {
    return ReportCardTemplate.findOneAndUpdate(
      { _id: id, schoolId },
      { $set: { status, updatedBy } },
      { new: true, runValidators: true },
    );
  },

  async deleteById(id: string, schoolId: string): Promise<boolean> {
    const result = await ReportCardTemplate.deleteOne({ _id: id, schoolId });
    return result.deletedCount > 0;
  },
};
