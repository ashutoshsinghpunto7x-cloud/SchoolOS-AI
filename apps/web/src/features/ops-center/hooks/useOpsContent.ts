import { useMutation, useQuery } from '@tanstack/react-query';
import { opsContentApi } from '../api/opsContentApi';
import type { ConfirmExtractedQuestionsPayload } from '@schoolos/types';

export const useOpsSchoolClasses = (schoolId: string | undefined) =>
  useQuery({
    queryKey: ['ops', 'schools', schoolId, 'classes'],
    queryFn: () => opsContentApi.listSchoolClasses(schoolId!),
    enabled: !!schoolId,
  });

export const useOpsQuestionBankOverview = (schoolId: string | undefined) =>
  useQuery({
    queryKey: ['ops', 'schools', schoolId, 'question-bank', 'overview'],
    queryFn: () => opsContentApi.getQuestionBankOverview(schoolId!),
    enabled: !!schoolId,
  });

export const useOpsExtractChapter = (schoolId: string | undefined) =>
  useMutation({
    mutationFn: ({ target, chapterName, images, detectImages }: { target: { class: string; subject: string }; chapterName: string; images: File[]; detectImages?: boolean }) =>
      opsContentApi.extractChapter(schoolId!, target, chapterName, images, detectImages),
  });

/** Polls the chapter-capture job every 2s while processing — mirrors useChapterCaptureJob from the teacher flow. */
export const useOpsChapterCaptureJob = (schoolId: string | undefined, jobId: string | undefined) =>
  useQuery({
    queryKey: ['ops', 'schools', schoolId, 'chapter-capture-job', jobId],
    queryFn: () => opsContentApi.getChapterCaptureJob(schoolId!, jobId!),
    enabled: !!schoolId && !!jobId,
    refetchInterval: (query) => (query.state.data?.status === 'processing' ? 2000 : false),
  });

export const useOpsRetryChapterPage = (schoolId: string | undefined) =>
  useMutation({
    mutationFn: ({ jobId, pageNumber, file }: { jobId: string; pageNumber: number; file: File }) =>
      opsContentApi.retryChapterPage(schoolId!, jobId, pageNumber, file),
  });

export const useOpsConfirmExtracted = (schoolId: string | undefined) =>
  useMutation({
    mutationFn: (payload: ConfirmExtractedQuestionsPayload) => opsContentApi.confirmExtracted(schoolId!, payload),
  });
