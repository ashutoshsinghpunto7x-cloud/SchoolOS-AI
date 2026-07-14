
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Skeleton } from '@/components/Skeleton';
import { StatTile } from '@/components/StatTile';
import { ROLE_LABELS } from '@/constants/roles';
import { useAttendanceSummary } from '@/features/attendance/hooks';
import { useFeeSummary } from '@/features/fees/hooks';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import { formatCurrency, formatPercent } from '@/utils/format';
import { useAccountantDashboard } from '../hooks';

export function DashboardScreen() {
  const { colors, spacing, typography } = useTheme();
  const user = useAuthStore((s) => s.user);

  const attendance = useAttendanceSummary();
  const fees = useFeeSummary();
  const accountantDashboard = useAccountantDashboard();

  const isAccountant = user?.role === 'accountant';
  const loading = attendance.isLoading || fees.isLoading || (isAccountant && accountantDashboard.isLoading);

  return (
    <ScreenContainer
      onRefresh={() => {
        attendance.refetch();
        fees.refetch();
        if (isAccountant) accountantDashboard.refetch();
      }}
      refreshing={attendance.isFetching || fees.isFetching || accountantDashboard.isFetching}
    >
      <View style={{ marginBottom: spacing.xl }}>
        <Text style={[typography.title, { color: colors.text }]}>
          Hi, {user?.firstName ?? 'there'}
        </Text>
        <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.xs }]}>
          {user ? ROLE_LABELS[user.role] : ''}
        </Text>
      </View>

      {user?.role === 'teacher' ? (
        <Pressable onPress={() => router.push('/(app)/my-workspace')}>
          <Card style={{ marginBottom: spacing.xl }}>
            <Text style={[typography.subheading, { color: colors.text }]}>My Workspace</Text>
            <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.xs }]}>
              Today's classes, weekly schedule, and leave
            </Text>
          </Card>
        </Pressable>
      ) : null}

      {loading ? (
        <View style={styles.grid}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} style={{ height: 88, flexBasis: '47%', borderRadius: 16 }} />
          ))}
        </View>
      ) : attendance.isError ? (
        <ErrorState error={attendance.error} onRetry={() => attendance.refetch()} />
      ) : (
        <View style={styles.grid}>
          <StatTile label="Attendance today" value={formatPercent(attendance.data?.attendanceRate ?? 0)} />
          <StatTile label="Present" value={String(attendance.data?.present ?? 0)} tone="success" />
          <StatTile label="Absent" value={String(attendance.data?.absent ?? 0)} tone="danger" />
          <StatTile label="On leave" value={String(attendance.data?.leave_approved ?? 0)} tone="warning" />
        </View>
      )}

      <View style={{ height: spacing.xl }} />

      {isAccountant && accountantDashboard.data ? (
        <View style={styles.grid}>
          <StatTile label="Collected today" value={formatCurrency(accountantDashboard.data.feesCollectedToday)} tone="success" />
          <StatTile
            label="Outstanding"
            value={formatCurrency(accountantDashboard.data.feeSummary.totalOutstanding)}
            tone="warning"
          />
        </View>
      ) : fees.data ? (
        <View style={styles.grid}>
          <StatTile label="Collected" value={formatCurrency(fees.data.totalCollected)} tone="success" />
          <StatTile label="Outstanding" value={formatCurrency(fees.data.totalOutstanding)} tone="warning" />
        </View>
      ) : fees.isError ? (
        <ErrorState error={fees.error} onRetry={() => fees.refetch()} />
      ) : (
        <EmptyState title="No fee data yet" />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
