import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Skeleton } from '@/components/Skeleton';
import { StatTile } from '@/components/StatTile';
import { WeekScheduleView } from '@/features/timetable/components/WeekScheduleView';
import { useTheme } from '@/theme';
import { useMyWorkspace } from '../hooks';

export function MyWorkspaceScreen() {
  const { colors, spacing, typography } = useTheme();
  const query = useMyWorkspace();

  if (query.isLoading) {
    return (
      <ScreenContainer>
        <Skeleton style={{ height: 120, borderRadius: 16, marginBottom: 16 }} />
        <Skeleton style={{ height: 200, borderRadius: 16 }} />
      </ScreenContainer>
    );
  }

  if (query.isError || !query.data) {
    return (
      <ScreenContainer>
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      </ScreenContainer>
    );
  }

  const { teacher, todayClasses, weekSchedule, attendanceSummary, classTeacherOf } = query.data;

  return (
    <ScreenContainer onRefresh={() => query.refetch()} refreshing={query.isFetching}>
      <Text style={[typography.title, { color: colors.text, marginBottom: spacing.xs }]}>{teacher.fullName}</Text>
      <Text style={[typography.body, { color: colors.textMuted, marginBottom: spacing.lg }]}>
        {teacher.employeeId}
        {teacher.department ? ` · ${teacher.department}` : ''}
      </Text>

      <View style={styles.grid}>
        <StatTile label="Classes marked today" value={String(attendanceSummary.classesMarkedToday)} tone="success" />
        <StatTile label="Total classes today" value={String(attendanceSummary.totalClassesToday)} />
      </View>

      <View style={{ marginTop: spacing.lg, marginBottom: spacing.md }}>
        <Button label="Apply for leave" variant="secondary" onPress={() => router.push('/(app)/leave/apply')} />
        <View style={{ height: spacing.sm }} />
        <Button label="My leave requests" variant="secondary" onPress={() => router.push('/(app)/leave')} />
      </View>

      {classTeacherOf.length > 0 ? (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={[typography.subheading, { color: colors.text, marginBottom: spacing.sm }]}>Class teacher of</Text>
          <Text style={[typography.body, { color: colors.text }]}>
            {classTeacherOf.map((c) => `${c.class}-${c.section}`).join(', ')}
          </Text>
        </Card>
      ) : null}

      <Text style={[typography.heading, { color: colors.text, marginBottom: spacing.md }]}>Today's classes</Text>
      {todayClasses.length === 0 ? (
        <EmptyState title="No classes today" />
      ) : (
        todayClasses.map((cls) => (
          <Card key={`${cls.timetableId}-${cls.slotId}`} style={{ marginBottom: spacing.sm }}>
            <View style={styles.row}>
              <View style={{ flexShrink: 1 }}>
                <Text style={[typography.bodyStrong, { color: colors.text }]}>{cls.subjectName}</Text>
                <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                  {cls.class}-{cls.section} · {cls.startTime}–{cls.endTime}
                </Text>
              </View>
              <Text style={[typography.caption, { color: cls.attendanceMarked ? colors.success : colors.warning }]}>
                {cls.attendanceMarked ? `${cls.attendanceCount}/${cls.totalStudents} marked` : 'Not marked'}
              </Text>
            </View>
          </Card>
        ))
      )}

      <Text style={[typography.heading, { color: colors.text, marginTop: spacing.lg, marginBottom: spacing.md }]}>
        Weekly schedule
      </Text>
      <WeekScheduleView weekSchedule={weekSchedule} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
