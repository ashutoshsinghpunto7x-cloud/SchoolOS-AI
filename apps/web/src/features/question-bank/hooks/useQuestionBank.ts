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
  ChapterPage,
  QuestionGenerationOptions,
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

// ── Layout-aware chapter capture (multi-page) ─────────────────────────────────

export const useExtractChapter = () =>
  useMutation({ mutationFn: (images: File[]) => questionBankApi.extractChapter(images) });

/** Polls the chapter-capture job every 2s while processing, so the review screen can show per-page progress instead of a blocking spinner. */
export const useChapterCaptureJob = (jobId: string | undefined) =>
  useQuery({
    queryKey: ['question-bank', 'chapter-capture-job', jobId],
    queryFn: () => questionBankApi.getChapterCaptureJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => (query.state.data?.status === 'processing' ? 2000 : false),
  });

export const useRetryChapterPage = () =>
  useMutation({
    mutationFn: ({ jobId, pageNumber, file }: { jobId: string; pageNumber: number; file: File }) =>
      questionBankApi.retryChapterPage(jobId, pageNumber, file),
  });

export const useSaveChapterSource = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { class: string; subject: string; documentTitle?: string; language?: string; chapterName?: string; fileName?: string; pages: ChapterPage[] }) =>
      questionBankApi.saveChapterSource(payload),
    onSuccess: (source) => {
      qc.invalidateQueries({ queryKey: questionBankKeys.sources(source.class, source.subject) });
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
  useMutation({
    mutationFn: ({ id, options }: { id: string; options: QuestionGenerationOptions }) => questionBankApi.reExtractSource(id, options),
  });

export const useGeneratePaper = () =>
  useMutation({ mutationFn: (config: PaperGenerationConfig) => questionBankApi.generatePaper(config) });

export const useGeneratedPaper = (id: string) =>
  useQuery({
    queryKey: [...questionBankKeys.all, 'paper', id],
    queryFn:  () => questionBankApi.getPaper(id),
    enabled:  !!id,
  });
