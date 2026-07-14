import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Skeleton } from '@/components/Skeleton';
import { StatTile } from '@/components/StatTile';
import { useTheme } from '@/theme';
import { LeaveRequestRow } from '../components/LeaveRequestRow';
import { useMyLeaveRequests } from '../hooks';

export function MyLeaveScreen() {
  const { colors, spacing, typography } = useTheme();
  const query = useMyLeaveRequests();

  const requests = query.data ?? [];
  // Computed client-side from the real list — the backend has no separate
  // leave-balance/summary endpoint, so this is presentation, not new logic.
  const counts = {
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  };

  return (
    <ScreenContainer onRefresh={() => query.refetch()} refreshing={query.isFetching}>
      <View style={styles.headerRow}>
        <Text style={[typography.title, { color: colors.text }]}>My leave</Text>
      </View>

      <View style={{ marginBottom: spacing.lg }}>
        <Button label="Apply for leave" onPress={() => router.push('/(app)/leave/apply')} />
      </View>

      {!query.isLoading && requests.length > 0 ? (
        <View style={[styles.grid, { marginBottom: spacing.lg }]}>
          <StatTile label="Pending" value={String(counts.pending)} tone="warning" />
          <StatTile label="Approved" value={String(counts.approved)} tone="success" />
          <StatTile label="Rejected" value={String(counts.rejected)} tone="danger" />
        </View>
      ) : null}

      {query.isLoading ? (
        <View>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={{ height: 100, borderRadius: 16, marginBottom: 8 }} />
          ))}
        </View>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : requests.length === 0 ? (
        <EmptyState title="No leave requests yet" />
      ) : (
        requests.map((request) => <LeaveRequestRow key={request._id} request={request} />)
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
