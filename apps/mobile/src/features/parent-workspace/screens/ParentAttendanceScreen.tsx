import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Skeleton } from '@/components/Skeleton';
import { StatTile } from '@/components/StatTile';
import { StatusPill } from '@/components/StatusPill';
import { useTheme } from '@/theme';
import { ChildSwitcher } from '../components/ChildSwitcher';
import { useChildAttendance, useParentWorkspace } from '../hooks';
import { useSelectedChildStore } from '../store';
import type { AttendanceStatus } from '../types';

const STATUS_TONE: Record<AttendanceStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  present: 'success',
  absent: 'danger',
  late: 'warning',
  half_day: 'warning',
  leave_approved: 'neutral',
};

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  half_day: 'Half day',
  leave_approved: 'Leave',
};

export function ParentAttendanceScreen() {
  const { colors, spacing, typography } = useTheme();
  const selectedChildId = useSelectedChildStore((s) => s.selectedChildId);
  const setSelectedChildId = useSelectedChildStore((s) => s.setSelectedChildId);

  const workspace = useParentWorkspace(selectedChildId ?? undefined);
  const attendance = useChildAttendance(selectedChildId ?? undefined);

  if (workspace.isLoading || (selectedChildId && attendance.isLoading)) {
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
        <Text style={[typography.title, { color: colors.text, marginBottom: spacing.lg }]}>Attendance</Text>
        <EmptyState title="No student linked yet" />
      </ScreenContainer>
    );
  }

  if (attendance.isError) {
    return (
      <ScreenContainer>
        <Text style={[typography.title, { color: colors.text, marginBottom: spacing.lg }]}>Attendance</Text>
        <ChildSwitcher children={children} selectedChildId={selectedChildId} onSelect={setSelectedChildId} />
        <ErrorState error={attendance.error} onRetry={() => attendance.refetch()} />
      </ScreenContainer>
    );
  }

  const { monthSummary, yearSummary, records, month } = attendance.data ?? {};

  return (
    <ScreenContainer onRefresh={() => attendance.refetch()} refreshing={attendance.isFetching}>
      <Text style={[typography.title, { color: colors.text, marginBottom: spacing.md }]}>Attendance</Text>
      <ChildSwitcher children={children} selectedChildId={selectedChildId} onSelect={setSelectedChildId} />

      {monthSummary && yearSummary ? (
        <>
          <Text style={[typography.subheading, { color: colors.text, marginBottom: spacing.sm }]}>
            {month ?? 'This month'}
          </Text>
          <View style={styles.grid}>
            <StatTile
              label="This month"
              value={`${monthSummary.attendanceRate}%`}
              tone={monthSummary.attendanceRate >= 90 ? 'success' : monthSummary.attendanceRate >= 75 ? 'warning' : 'danger'}
            />
            <StatTile label="This year" value={`${yearSummary.attendanceRate}%`} />
          </View>

          <View style={{ flexDirection: 'row', marginTop: spacing.md, marginBottom: spacing.lg, gap: 12 }}>
            <StatTile label="Present" value={String(monthSummary.present)} tone="success" />
            <StatTile label="Absent" value={String(monthSummary.absent)} tone="danger" />
          </View>
        </>
      ) : null}

      <Text style={[typography.heading, { color: colors.text, marginBottom: spacing.sm }]}>Daily record</Text>
      {!records || records.length === 0 ? (
        <EmptyState title="No records for this month yet" />
      ) : (
        records.map((record) => (
          <Card key={record.date} style={{ marginBottom: spacing.sm }}>
            <View style={styles.row}>
              <View style={{ flexShrink: 1 }}>
                <Text style={[typography.bodyStrong, { color: colors.text }]}>{record.date}</Text>
                {record.note ? (
                  <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>{record.note}</Text>
                ) : null}
              </View>
              <StatusPill label={STATUS_LABEL[record.status]} tone={STATUS_TONE[record.status]} />
            </View>
          </Card>
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
