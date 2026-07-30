import { PaperGenerationConfig, PaperValidationResult } from '@schoolos/types';
import { GeneratedPaperModel, IGeneratedPaper } from './paper.model';

export interface CreatePaperData {
  schoolId: string;
  config: PaperGenerationConfig;
  questionIds: string[];
  totalMarksAssembled: number;
  validation: PaperValidationResult;
  createdBy: string;
}

export const paperRepository = {
  async create(data: CreatePaperData): Promise<IGeneratedPaper> {
    return GeneratedPaperModel.create(data);
  },

  async findById(id: string, schoolId: string): Promise<IGeneratedPaper | null> {
    return GeneratedPaperModel.findOne({ _id: id, schoolId }).lean<IGeneratedPaper>();
  },
};
