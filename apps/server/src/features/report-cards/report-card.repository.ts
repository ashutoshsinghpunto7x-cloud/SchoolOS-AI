import { ReportCard, IReportCard, ISubjectRow, ICoScholasticEntry, IReportCardSummary, IReportCardAttendance } from './report-card.model';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UpsertReportCardData {
  schoolId: string;
  examId: string;
  studentId: string;
  class: string;
  section: string;
  subjects: ISubjectRow[];
  summary: IReportCardSummary;
  attendance: IReportCardAttendance;
  warnings: string[];
  verificationToken: string;
  generatedById: string;
  generatedByName: string;
  /** Only set on first creation — a regenerate should never blank out
   *  co-scholastic grades / remarks a teacher already entered by hand. */
  coScholasticIfNew: ICoScholasticEntry[];
}

// ── Repository ────────────────────────────────────────────────────────────────

export const reportCardRepository = {
  async upsert(data: UpsertReportCardData): Promise<IReportCard> {
    const existing = await ReportCard.findOne({ schoolId: data.schoolId, examId: data.examId, studentId: data.studentId });

    if (existing) {
      existing.class = data.class;
      existing.section = data.section;
      existing.subjects = data.subjects;
      existing.summary = data.summary;
      existing.attendance = data.attendance;
      existing.warnings = data.warnings;
      existing.generatedById = data.generatedById;
      existing.generatedByName = data.generatedByName;
      existing.generatedAt = new Date();
      return existing.save();
    }

    return ReportCard.create({
      schoolId: data.schoolId,
      examId: data.examId,
      studentId: data.studentId,
      class: data.class,
      section: data.section,
      subjects: data.subjects,
      coScholastic: data.coScholasticIfNew,
      summary: data.summary,
      attendance: data.attendance,
      warnings: data.warnings,
      verificationToken: data.verificationToken,
      status: 'draft',
      generatedById: data.generatedById,
      generatedByName: data.generatedByName,
      generatedAt: new Date(),
    });
  },

  async findById(id: string, schoolId: string): Promise<IReportCard | null> {
    return ReportCard.findOne({ _id: id, schoolId });
  },

  async findByExamStudent(schoolId: string, examId: string, studentId: string): Promise<IReportCard | null> {
    return ReportCard.findOne({ schoolId, examId, studentId });
  },

  async findByToken(token: string): Promise<IReportCard | null> {
    return ReportCard.findOne({ verificationToken: token }).lean<IReportCard>();
  },

  async findByClassExam(schoolId: string, examId: string, cls: string, section: string): Promise<IReportCard[]> {
    return ReportCard.find({ schoolId, examId, class: cls, section }).lean<IReportCard[]>();
  },
};
