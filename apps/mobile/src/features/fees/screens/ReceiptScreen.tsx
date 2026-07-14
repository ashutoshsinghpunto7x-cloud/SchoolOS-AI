import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Skeleton } from '@/components/Skeleton';
import { useTheme } from '@/theme';
import { formatCurrency } from '@/utils/format';
import { useReceipt } from '../hooks';

function Row({ label, value }: { label: string; value: string }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={[styles.row, { marginBottom: spacing.sm }]}>
      <Text style={[typography.body, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[typography.bodyStrong, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

export function ReceiptScreen() {
  const { colors, spacing, typography } = useTheme();
  const { receiptNumber } = useLocalSearchParams<{ receiptNumber: string }>();
  const query = useReceipt(receiptNumber ?? '');

  if (query.isLoading) {
    return (
      <ScreenContainer scroll={false}>
        <Skeleton style={{ height: 200, borderRadius: 16, marginTop: 24 }} />
      </ScreenContainer>
    );
  }

  if (query.isError || !query.data) {
    return (
      <ScreenContainer scroll={false}>
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      </ScreenContainer>
    );
  }

  const { record, payment } = query.data;

  return (
    <ScreenContainer scroll={false}>
      <View style={{ alignItems: 'center', marginVertical: spacing.xl }}>
        <Text style={[typography.title, { color: colors.success }]}>Payment recorded</Text>
        <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
          Receipt #{payment.receiptNumber}
        </Text>
      </View>

      <Card>
        <Row label="Student" value={record.studentName} />
        <Row label="Class" value={`${record.class}-${record.section}`} />
        <Row label="Fee head" value={record.feeHead} />
        <Row label="Amount paid" value={formatCurrency(payment.amount)} />
        <Row label="Payment mode" value={payment.paymentMode.replace('_', ' ')} />
        <Row label="Date" value={payment.paymentDate} />
        {payment.referenceNumber ? <Row label="Reference" value={payment.referenceNumber} /> : null}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});
