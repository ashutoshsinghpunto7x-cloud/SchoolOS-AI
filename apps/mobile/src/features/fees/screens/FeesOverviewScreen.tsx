import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Skeleton } from '@/components/Skeleton';
import { StatTile } from '@/components/StatTile';
import { canRecordFeePayments } from '@/constants/roles';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import { formatCurrency } from '@/utils/format';
import { DefaulterRow } from '../components/DefaulterRow';
import { useFeeSummary, useOutstandingFees } from '../hooks';

export function FeesOverviewScreen() {
  const { colors, spacing, typography } = useTheme();
  const role = useAuthStore((s) => s.user?.role);
  const canCollect = role ? canRecordFeePayments(role) : false;

  const summary = useFeeSummary();
  const outstanding = useOutstandingFees();

  return (
    <ScreenContainer
      onRefresh={() => {
        summary.refetch();
        outstanding.refetch();
      }}
      refreshing={summary.isFetching || outstanding.isFetching}
    >
      <Text style={[typography.title, { color: colors.text, marginBottom: spacing.lg }]}>Fees</Text>

      {summary.isLoading ? (
        <View style={styles.grid}>
          {[0, 1].map((i) => (
            <Skeleton key={i} style={{ height: 88, flexBasis: '47%', borderRadius: 16 }} />
          ))}
        </View>
      ) : summary.isError ? (
        <ErrorState error={summary.error} onRetry={() => summary.refetch()} />
      ) : summary.data ? (
        <View style={styles.grid}>
          <StatTile label="Collected" value={formatCurrency(summary.data.totalCollected)} tone="success" />
          <StatTile label="Outstanding" value={formatCurrency(summary.data.totalOutstanding)} tone="warning" />
          <StatTile label="Overdue accounts" value={String(summary.data.overdueCount)} tone="danger" />
          <StatTile label="Pending accounts" value={String(summary.data.pendingCount)} />
        </View>
      ) : null}

      <Text style={[typography.heading, { color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md }]}>
        Outstanding balances
      </Text>

      {outstanding.isLoading ? (
        <View>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={{ height: 72, borderRadius: 16, marginBottom: 8 }} />
          ))}
        </View>
      ) : outstanding.isError ? (
        <ErrorState error={outstanding.error} onRetry={() => outstanding.refetch()} />
      ) : !outstanding.data || outstanding.data.length === 0 ? (
        <EmptyState title="All caught up" description="No outstanding fee balances right now." />
      ) : (
        outstanding.data.map((defaulter) => (
          <DefaulterRow
            key={defaulter.feeRecordId}
            defaulter={defaulter}
            onPress={() => {
              if (!canCollect) return;
              router.push({
                pathname: '/(app)/(tabs)/fees/record',
                params: {
                  feeRecordId: defaulter.feeRecordId,
                  studentName: defaulter.studentName,
                  balance: String(defaulter.balance),
                },
              });
            }}
          />
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
