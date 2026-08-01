import {
  TermReportCard,
  ITermReportCard,
  ITermBlock,
  ITermReportCardSkillEntry,
  ITermReportCardSummary,
} from './term-report-card.model';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UpsertTermReportCardData {
  schoolId: string;
  studentId: string;
  class: string;
  section: string;
  academicYear: string;
  templateId: string;
  firstTerm: ITermBlock;
  finalTerm: ITermBlock;
  grandTotalObtained: number;
  grandTotalMax: number;
  grandAveragePercent: number;
  overallGrade?: string;
  skills: ITermReportCardSkillEntry[];
  summary: ITermReportCardSummary;
  warnings: string[];
  verificationToken: string;
  generatedById: string;
  generatedByName: string;
}

// ── Repository ────────────────────────────────────────────────────────────────

export const termReportCardRepository = {
  /** Overwrites every computed field, but never touches teacherRemark/
   *  principalRemark/parentFeedback — those are entered by hand and must
   *  survive a regenerate exactly like the single-exam report-cards module. */
  async upsert(data: UpsertTermReportCardData): Promise<ITermReportCard> {
    const existing = await TermReportCard.findOne({ schoolId: data.schoolId, studentId: data.studentId, academicYear: data.academicYear });

    if (existing) {
      existing.class = data.class;
      existing.section = data.section;
      existing.templateId = data.templateId;
      existing.firstTerm = data.firstTerm;
      existing.finalTerm = data.finalTerm;
      existing.grandTotalObtained = data.grandTotalObtained;
      existing.grandTotalMax = data.grandTotalMax;
      existing.grandAveragePercent = data.grandAveragePercent;
      existing.overallGrade = data.overallGrade;
      existing.skills = data.skills;
      existing.summary = data.summary;
      existing.warnings = data.warnings;
      existing.generatedById = data.generatedById;
      existing.generatedByName = data.generatedByName;
      existing.generatedAt = new Date();
      return existing.save();
    }

    return TermReportCard.create({
      schoolId: data.schoolId,
      studentId: data.studentId,
      class: data.class,
      section: data.section,
      academicYear: data.academicYear,
      templateId: data.templateId,
      firstTerm: data.firstTerm,
      finalTerm: data.finalTerm,
      grandTotalObtained: data.grandTotalObtained,
      grandTotalMax: data.grandTotalMax,
      grandAveragePercent: data.grandAveragePercent,
      overallGrade: data.overallGrade,
      skills: data.skills,
      summary: data.summary,
      warnings: data.warnings,
      verificationToken: data.verificationToken,
      status: 'draft',
      generatedById: data.generatedById,
      generatedByName: data.generatedByName,
      generatedAt: new Date(),
    });
  },

  async findById(id: string, schoolId: string): Promise<ITermReportCard | null> {
    return TermReportCard.findOne({ _id: id, schoolId });
  },

  async findByStudentYear(schoolId: string, studentId: string, academicYear: string): Promise<ITermReportCard | null> {
    return TermReportCard.findOne({ schoolId, studentId, academicYear });
  },

  async findByToken(token: string): Promise<ITermReportCard | null> {
    return TermReportCard.findOne({ verificationToken: token }).lean<ITermReportCard>();
  },

  async findByClassYear(schoolId: string, cls: string, section: string, academicYear: string): Promise<ITermReportCard[]> {
    return TermReportCard.find({ schoolId, class: cls, section, academicYear }).lean<ITermReportCard[]>();
  },
};
