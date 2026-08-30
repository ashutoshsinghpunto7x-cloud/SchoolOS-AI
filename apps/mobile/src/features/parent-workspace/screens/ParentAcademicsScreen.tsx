import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Skeleton } from '@/components/Skeleton';
import { StatusPill } from '@/components/StatusPill';
import { useTheme } from '@/theme';
import { ChildSwitcher } from '../components/ChildSwitcher';
import { useChildAcademics, useParentWorkspace } from '../hooks';
import { useSelectedChildStore } from '../store';
import type { ExamResult } from '../types';

function resultTone(result: ExamResult['subjects'][number]['result']): 'success' | 'danger' | 'neutral' {
  if (result === 'pass') return 'success';
  if (result === 'fail') return 'danger';
  return 'neutral';
}

export function ParentAcademicsScreen() {
  const { colors, spacing, typography } = useTheme();
  const selectedChildId = useSelectedChildStore((s) => s.selectedChildId);
  const setSelectedChildId = useSelectedChildStore((s) => s.setSelectedChildId);

  // Reuses the workspace bundle just for the child list/switcher — the same
  // query is already cached by ParentDashboardScreen under the same key.
  const workspace = useParentWorkspace(selectedChildId ?? undefined);
  const academics = useChildAcademics(selectedChildId ?? undefined);

  if (workspace.isLoading || (selectedChildId && academics.isLoading)) {
    return (
      <ScreenContainer>
        <Skeleton style={{ height: 60, borderRadius: 16, marginBottom: 16 }} />
        <Skeleton style={{ height: 200, borderRadius: 16 }} />
      </ScreenContainer>
    );
  }

  if (workspace.isError || !workspace.data) {
    return (
      <ScreenContainer>
        <ErrorState error={workspace.error} onRetry={() => workspace.refetch()} />
      </ScreenContainer>
    );
  }

  const { children } = workspace.data;

  if (children.length === 0) {
    return (
      <ScreenContainer>
        <Text style={[typography.title, { color: colors.text, marginBottom: spacing.lg }]}>Academics</Text>
        <EmptyState title="No student linked yet" />
      </ScreenContainer>
    );
  }

  if (academics.isError) {
    return (
      <ScreenContainer>
        <Text style={[typography.title, { color: colors.text, marginBottom: spacing.lg }]}>Academics</Text>
        <ChildSwitcher children={children} selectedChildId={selectedChildId} onSelect={setSelectedChildId} />
        <ErrorState error={academics.error} onRetry={() => academics.refetch()} />
      </ScreenContainer>
    );
  }

  const exams = academics.data?.exams ?? [];

  return (
    <ScreenContainer onRefresh={() => academics.refetch()} refreshing={academics.isFetching}>
      <Text style={[typography.title, { color: colors.text, marginBottom: spacing.md }]}>Academics</Text>
      <ChildSwitcher children={children} selectedChildId={selectedChildId} onSelect={setSelectedChildId} />

      {exams.length === 0 ? (
        <EmptyState title="No results published yet" description="Exam results will show up here once released." />
      ) : (
        exams.map((exam) => (
          <Card key={exam.examId} style={{ marginBottom: spacing.md }}>
            <View style={styles.row}>
              <View style={{ flexShrink: 1 }}>
                <Text style={[typography.subheading, { color: colors.text }]}>{exam.examName}</Text>
                <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                  {exam.examType}
                  {exam.termLabel ? ` · ${exam.termLabel}` : ''}
                </Text>
              </View>
              {exam.overallPercentage !== undefined ? (
                <Text style={[typography.title, { color: colors.primary }]}>{exam.overallPercentage}%</Text>
              ) : null}
            </View>

            <View style={{ marginTop: spacing.md }}>
              {exam.subjects.map((subject) => (
                <View
                  key={subject.subject}
                  style={[styles.subjectRow, { borderTopColor: colors.border, paddingVertical: spacing.sm }]}
                >
                  <Text style={[typography.body, { color: colors.text, flexShrink: 1 }]}>{subject.subject}</Text>
                  <View style={styles.row}>
                    {subject.percentage !== undefined ? (
                      <Text style={[typography.caption, { color: colors.textMuted, marginRight: spacing.sm }]}>
                        {subject.percentage}%
                      </Text>
                    ) : null}
                    <StatusPill label={subject.grade ?? subject.result} tone={resultTone(subject.result)} />
                  </View>
                </View>
              ))}
            </View>
          </Card>
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subjectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
