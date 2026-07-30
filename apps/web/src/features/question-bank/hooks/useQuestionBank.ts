import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { questionBankApi } from '../api/question-bank.api';
import type {
  QuestionListOptions,
  CreateQuestionPayload,
  UpdateQuestionPayload,
  ConfirmExtractedQuestionsPayload,
  PaperGenerationConfig,
} from '@schoolos/types';

export const questionBankKeys = {
  all:      ['question-bank']                        as const,
  chapters: (cls: string, subject: string) => [...questionBankKeys.all, 'chapters', cls, subject] as const,
  lists:    () => [...questionBankKeys.all, 'list']    as const,
  list:     (o: QuestionListOptions) => [...questionBankKeys.lists(), o] as const,
  detail:   (id: string) => [...questionBankKeys.all, 'detail', id] as const,
};

export const useChapters = (cls: string, subject: string) =>
  useQuery({
    queryKey: questionBankKeys.chapters(cls, subject),
    queryFn:  () => questionBankApi.listChapters(cls, subject),
    enabled:  !!cls && !!subject,
  });

export const useQuestions = (opts: QuestionListOptions = {}) =>
  useQuery({
    queryKey: questionBankKeys.list(opts),
    queryFn:  () => questionBankApi.listQuestions(opts),
  });

export const useQuestion = (id: string) =>
  useQuery({
    queryKey: questionBankKeys.detail(id),
    queryFn:  () => questionBankApi.getQuestion(id),
    enabled:  !!id,
  });

function useInvalidatingMutation<TPayload, TResult>(fn: (payload: TPayload) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess:  () => qc.invalidateQueries({ queryKey: questionBankKeys.all }),
  });
}

export const useCreateQuestion = () => useInvalidatingMutation((payload: CreateQuestionPayload) => questionBankApi.createQuestion(payload));
export const useUpdateQuestion = (id: string) => useInvalidatingMutation((payload: UpdateQuestionPayload) => questionBankApi.updateQuestion(id, payload));
export const useDeleteQuestion = () => useInvalidatingMutation((id: string) => questionBankApi.deleteQuestion(id));
export const useConfirmExtractedQuestions = () => useInvalidatingMutation((payload: ConfirmExtractedQuestionsPayload) => questionBankApi.confirmExtracted(payload));

// AI extraction never saves anything, so no query invalidation on success.
export const useExtractQuestionsFromImage = () =>
  useMutation({ mutationFn: ({ target, file }: { target: { class: string; subject: string }; file: File }) => questionBankApi.extractFromImage(target, file) });

export const useExtractQuestionsFromPdf = () =>
  useMutation({ mutationFn: ({ target, file }: { target: { class: string; subject: string }; file: File }) => questionBankApi.extractFromPdf(target, file) });

export const useGeneratePaper = () =>
  useMutation({ mutationFn: (config: PaperGenerationConfig) => questionBankApi.generatePaper(config) });

export const useGeneratedPaper = (id: string) =>
  useQuery({
    queryKey: [...questionBankKeys.all, 'paper', id],
    queryFn:  () => questionBankApi.getPaper(id),
    enabled:  !!id,
  });
