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
import { useChildFees, useParentWorkspace } from '../hooks';
import { useSelectedChildStore } from '../store';
import type { FeeStatus } from '../types';

const STATUS_TONE: Record<FeeStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  paid: 'success',
  partially_paid: 'warning',
  pending: 'warning',
  overdue: 'danger',
  waived: 'neutral',
};

const STATUS_LABEL: Record<FeeStatus, string> = {
  paid: 'Paid',
  partially_paid: 'Partially paid',
  pending: 'Pending',
  overdue: 'Overdue',
  waived: 'Waived',
};

const formatAmount = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

export function ParentFeesScreen() {
  const { colors, spacing, typography } = useTheme();
  const selectedChildId = useSelectedChildStore((s) => s.selectedChildId);
  const setSelectedChildId = useSelectedChildStore((s) => s.setSelectedChildId);

  const workspace = useParentWorkspace(selectedChildId ?? undefined);
  const fees = useChildFees(selectedChildId ?? undefined);

  if (workspace.isLoading || (selectedChildId && fees.isLoading)) {
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
        <Text style={[typography.title, { color: colors.text, marginBottom: spacing.lg }]}>Fees</Text>
        <EmptyState title="No student linked yet" />
      </ScreenContainer>
    );
  }

  if (fees.isError) {
    return (
      <ScreenContainer>
        <Text style={[typography.title, { color: colors.text, marginBottom: spacing.lg }]}>Fees</Text>
        <ChildSwitcher children={children} selectedChildId={selectedChildId} onSelect={setSelectedChildId} />
        <ErrorState error={fees.error} onRetry={() => fees.refetch()} />
      </ScreenContainer>
    );
  }

  const data = fees.data;

  return (
    <ScreenContainer onRefresh={() => fees.refetch()} refreshing={fees.isFetching}>
      <Text style={[typography.title, { color: colors.text, marginBottom: spacing.md }]}>Fees</Text>
      <ChildSwitcher children={children} selectedChildId={selectedChildId} onSelect={setSelectedChildId} />

      {data ? (
        <>
          <View style={styles.grid}>
            <StatTile label="Total charged" value={formatAmount(data.totalCharged)} />
            <StatTile label="Total paid" value={formatAmount(data.totalPaid)} tone="success" />
          </View>
          <View style={{ marginTop: spacing.md, marginBottom: spacing.lg }}>
            <StatTile
              label="Outstanding"
              value={formatAmount(data.totalOutstanding)}
              tone={data.totalOutstanding > 0 ? 'danger' : 'success'}
            />
          </View>

          <Text style={[typography.heading, { color: colors.text, marginBottom: spacing.sm }]}>Fee records</Text>
          {data.records.length === 0 ? (
            <EmptyState title="No fee records yet" />
          ) : (
            data.records.map((record) => (
              <Card key={record._id} style={{ marginBottom: spacing.sm }}>
                <View style={styles.row}>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={[typography.bodyStrong, { color: colors.text }]}>
                      {record.customHead || record.feeHead}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                      {record.academicYear}
                      {record.month ? ` · ${record.month}` : ''} · Due {record.dueDate}
                    </Text>
                  </View>
                  <StatusPill label={STATUS_LABEL[record.status]} tone={STATUS_TONE[record.status]} />
                </View>
                <View style={[styles.row, { marginTop: spacing.sm }]}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    {formatAmount(record.paidAmount)} paid of {formatAmount(record.totalAmount)}
                  </Text>
                  {record.balance > 0 ? (
                    <Text style={[typography.bodyStrong, { color: colors.danger }]}>{formatAmount(record.balance)} due</Text>
                  ) : null}
                </View>
              </Card>
            ))
          )}
        </>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
