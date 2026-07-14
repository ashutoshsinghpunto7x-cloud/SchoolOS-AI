import { StyleSheet, Text, View } from 'react-native';
import type { LeaveRequest, LeaveRequestStatus } from '@schoolos/types';
import { Card } from '@/components/Card';
import { StatusPill } from '@/components/StatusPill';
import { useTheme } from '@/theme';

const STATUS_TONE: Record<LeaveRequestStatus, 'success' | 'warning' | 'danger'> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
};

const STATUS_LABEL: Record<LeaveRequestStatus, string> = {
  approved: 'Approved',
  pending: 'Pending',
  rejected: 'Rejected',
};

export function LeaveRequestRow({ request }: { request: LeaveRequest }) {
  const { colors, spacing, typography } = useTheme();
  const isSameDay = request.dateFrom === request.dateTo;

  return (
    <Card style={{ marginBottom: spacing.sm }}>
      <View style={styles.row}>
        <Text style={[typography.bodyStrong, { color: colors.text }]}>
          {isSameDay ? request.dateFrom : `${request.dateFrom} – ${request.dateTo}`}
        </Text>
        <StatusPill label={STATUS_LABEL[request.status]} tone={STATUS_TONE[request.status]} />
      </View>
      <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
        {request.leaveType === 'full_day' ? 'Full day' : 'Half day'}
      </Text>
      <Text style={[typography.body, { color: colors.text, marginTop: spacing.sm }]}>{request.reason}</Text>
      {request.reviewNote ? (
        <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.sm }]}>
          Note: {request.reviewNote}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
