import { QuestionSource, IQuestionSource, QuestionSourceKind } from './question-source.model';

export const questionSourceRepository = {
  async create(data: {
    schoolId: string;
    userId: string;
    class: string;
    subject: string;
    kind: QuestionSourceKind;
    fileName?: string;
    extractedText: string;
  }): Promise<IQuestionSource> {
    return QuestionSource.create(data);
  },

  /** cls/subject omitted → every stored upload for the school (used by the "pending uploads" view, which isn't scoped to one class/subject). */
  async findAll(schoolId: string, cls?: string, subject?: string): Promise<IQuestionSource[]> {
    const filter: Record<string, string> = { schoolId };
    if (cls) filter.class = cls;
    if (subject) filter.subject = subject;
    return QuestionSource.find(filter).sort({ createdAt: -1 }).lean<IQuestionSource[]>();
  },

  async findById(id: string, schoolId: string): Promise<IQuestionSource | null> {
    return QuestionSource.findOne({ _id: id, schoolId }).lean<IQuestionSource>();
  },

  async updateChapterName(id: string, schoolId: string, chapterName: string): Promise<IQuestionSource | null> {
    return QuestionSource.findOneAndUpdate({ _id: id, schoolId }, { chapterName }, { new: true }).lean<IQuestionSource>();
  },
};
