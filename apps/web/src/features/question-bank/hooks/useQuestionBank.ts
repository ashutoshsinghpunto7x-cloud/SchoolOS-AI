import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { questionBankApi } from '../api/question-bank.api';
import type {
  QuestionListOptions,
  QuestionGroupListOptions,
  CreateQuestionPayload,
  UpdateQuestionPayload,
  ConfirmExtractedQuestionsPayload,
  PaperGenerationConfig,
  UpdateQuestionSourcePayload,
} from '@schoolos/types';

export const questionBankKeys = {
  all:      ['question-bank']                        as const,
  chapters: (cls: string, subject: string) => [...questionBankKeys.all, 'chapters', cls, subject] as const,
  groups:   (o: QuestionGroupListOptions = {}) => [...questionBankKeys.all, 'groups', o] as const,
  lists:    () => [...questionBankKeys.all, 'list']    as const,
  list:     (o: QuestionListOptions) => [...questionBankKeys.lists(), o] as const,
  detail:   (id: string) => [...questionBankKeys.all, 'detail', id] as const,
  sources:  (cls?: string, subject?: string) => [...questionBankKeys.all, 'sources', cls ?? '', subject ?? ''] as const,
  source:   (id: string) => [...questionBankKeys.all, 'source', id] as const,
};

export const useQuestionGroups = (opts: QuestionGroupListOptions = {}) =>
  useQuery({
    queryKey: questionBankKeys.groups(opts),
    queryFn:  () => questionBankApi.listQuestionGroups(opts),
  });

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

// Extraction never saves questions to the bank, but it does save the upload's converted text as a source — invalidate that list.
export const useExtractQuestionsFromImage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ target, file }: { target: { class: string; subject: string }; file: File }) => questionBankApi.extractFromImage(target, file),
    onSuccess:  (_result, { target }) => {
      qc.invalidateQueries({ queryKey: questionBankKeys.sources(target.class, target.subject) });
      qc.invalidateQueries({ queryKey: questionBankKeys.sources() });
    },
  });
};

export const useExtractQuestionsFromPdf = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ target, file }: { target: { class: string; subject: string }; file: File }) => questionBankApi.extractFromPdf(target, file),
    onSuccess:  (_result, { target }) => {
      qc.invalidateQueries({ queryKey: questionBankKeys.sources(target.class, target.subject) });
      qc.invalidateQueries({ queryKey: questionBankKeys.sources() });
    },
  });
};

export const useQuestionSources = (cls: string, subject: string) =>
  useQuery({
    queryKey: questionBankKeys.sources(cls, subject),
    queryFn:  () => questionBankApi.listSources(cls, subject),
    enabled:  !!cls && !!subject,
  });

/** Every stored upload for the school, regardless of class/subject — the "pending uploads" view. */
export const useAllQuestionSources = () =>
  useQuery({
    queryKey: questionBankKeys.sources(),
    queryFn:  () => questionBankApi.listSources(),
  });

export const useSource = (id: string) =>
  useQuery({
    queryKey: questionBankKeys.source(id),
    queryFn:  () => questionBankApi.getSource(id),
    enabled:  !!id,
  });

export const useUpdateSourceChapter = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateQuestionSourcePayload }) => questionBankApi.updateSource(id, payload),
    onSuccess:  (updated) => {
      qc.invalidateQueries({ queryKey: questionBankKeys.sources() });
      qc.invalidateQueries({ queryKey: questionBankKeys.source(updated._id) });
    },
  });
};

/** Generates a fresh batch of question drafts from a stored source's text — safe to call repeatedly. */
export const useReExtractSource = () =>
  useMutation({ mutationFn: (id: string) => questionBankApi.reExtractSource(id) });

export const useGeneratePaper = () =>
  useMutation({ mutationFn: (config: PaperGenerationConfig) => questionBankApi.generatePaper(config) });

export const useGeneratedPaper = (id: string) =>
  useQuery({
    queryKey: [...questionBankKeys.all, 'paper', id],
    queryFn:  () => questionBankApi.getPaper(id),
    enabled:  !!id,
  });
