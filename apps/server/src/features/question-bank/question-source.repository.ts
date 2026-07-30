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

  async findAll(schoolId: string, cls: string, subject: string): Promise<IQuestionSource[]> {
    return QuestionSource.find({ schoolId, class: cls, subject }).sort({ createdAt: -1 }).lean<IQuestionSource[]>();
  },

  async findById(id: string, schoolId: string): Promise<IQuestionSource | null> {
    return QuestionSource.findOne({ _id: id, schoolId }).lean<IQuestionSource>();
  },
};
