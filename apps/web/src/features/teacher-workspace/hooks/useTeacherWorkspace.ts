import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { teacherWorkspaceApi } from '../api/teacher-workspace.api';

export const teacherWorkspaceKeys = {
  me: ['teacher-workspace', 'me'] as const,
};

export const useTeacherWorkspace = () =>
  useQuery({
    queryKey: teacherWorkspaceKeys.me,
    queryFn:  teacherWorkspaceApi.getMe,
    staleTime: 30_000, // refresh every 30s so attendance status stays current
  });

export const useInvalidateTeacherWorkspace = () => {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: teacherWorkspaceKeys.me });
};

/**
 * The teacher's own class/subject pairs, straight from the Timetable-derived
 * weekly schedule — same derivation PlannerHubPage uses to list what a
 * teacher can build a plan for. Question Bank's class/subject fields used to
 * be free-text (`placeholder="e.g. 8"`), so a teacher typing "1" one upload
 * and "I" the next made that chapter invisible everywhere that later queries
 * by exact class string (Planner chief among them — see
 * [[project_planner_chapter_403_bug]]). Picking from this list instead
 * guarantees whatever gets saved matches what Planner/Timetable already use.
 */
export function useTeacherSubjectOptions() {
  const { data, isLoading, isError } = useTeacherWorkspace();

  const options = useMemo(() => {
    if (!data) return [];
    const seen = new Map<string, { cls: string; subjectName: string }>();
    for (const day of data.weekSchedule) {
      for (const e of day.entries) {
        if (!e.subjectName) continue;
        seen.set(`${e.class}||${e.subjectName}`, { cls: e.class, subjectName: e.subjectName });
      }
    }
    return Array.from(seen.values()).sort((a, b) => `${a.cls}${a.subjectName}`.localeCompare(`${b.cls}${b.subjectName}`));
  }, [data]);

  const classes = useMemo(
    () => Array.from(new Set(options.map((o) => o.cls))),
    [options],
  );

  return { options, classes, isLoading, isError };
}
