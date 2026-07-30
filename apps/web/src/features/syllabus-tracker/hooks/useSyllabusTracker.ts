import { useQuery } from '@tanstack/react-query';
import { syllabusTrackerApi } from '../api/syllabus-tracker.api';

export const syllabusTrackerKeys = {
  overview: ['syllabus-tracker', 'overview'] as const,
  activity: ['syllabus-tracker', 'activity'] as const,
};

export const useSyllabusOverview = () =>
  useQuery({ queryKey: syllabusTrackerKeys.overview, queryFn: syllabusTrackerApi.getOverview });

export const useSyllabusActivity = () =>
  useQuery({ queryKey: syllabusTrackerKeys.activity, queryFn: syllabusTrackerApi.getActivity });
