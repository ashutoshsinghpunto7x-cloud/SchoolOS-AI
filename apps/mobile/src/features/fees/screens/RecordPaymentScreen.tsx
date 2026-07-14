import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import type { PaymentMode } from '@schoolos/types';
import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TextField } from '@/components/TextField';
import { extractErrorMessage } from '@/services/api/client';
import { useTheme } from '@/theme';
import { useRecordPayment } from '../hooks';

const PAYMENT_MODES: { label: string; value: PaymentMode }[] = [
  { label: 'Cash', value: 'cash' },
  { label: 'Cheque', value: 'cheque' },
  { label: 'Bank transfer', value: 'bank_transfer' },
  { label: 'Online', value: 'online' },
  { label: 'Demand draft', value: 'demand_draft' },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RecordPaymentScreen() {
  const { colors, spacing, typography } = useTheme();
  const params = useLocalSearchParams<{ feeRecordId: string; studentName?: string; balance?: string }>();
  const recordPayment = useRecordPayment();

  const [amount, setAmount] = useState(params.balance ?? '');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }

    try {
      const result = await recordPayment.mutateAsync({
        feeRecordId: params.feeRecordId,
        amount: numericAmount,
        paymentDate: todayIso(),
        paymentMode,
        referenceNumber: referenceNumber || undefined,
        remarks: remarks || undefined,
      });

      const receiptNumber = result.payment.receiptNumber;
      if (receiptNumber) {
        router.replace({ pathname: '/(app)/(tabs)/fees/receipt/[receiptNumber]', params: { receiptNumber } });
      } else {
        router.back();
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  return (
    <ScreenContainer scroll={false}>
      <Text style={[typography.title, { color: colors.text, marginTop: spacing.lg, marginBottom: spacing.xs }]}>
        Record payment
      </Text>
      {params.studentName ? (
        <Text style={[typography.body, { color: colors.textMuted, marginBottom: spacing.lg }]}>{params.studentName}</Text>
      ) : (
        <View style={{ marginBottom: spacing.lg }} />
      )}

      <TextField label="Amount" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />

      <SegmentedControl label="Payment mode" options={PAYMENT_MODES} value={paymentMode} onChange={setPaymentMode} />

      <TextField
        label="Reference number (optional)"
        value={referenceNumber}
        onChangeText={setReferenceNumber}
        placeholder="Cheque / transaction ID"
      />

      <TextField label="Remarks (optional)" value={remarks} onChangeText={setRemarks} />

      {error ? <Text style={[typography.caption, { color: colors.danger, marginBottom: spacing.md }]}>{error}</Text> : null}

      <Button label="Record payment" onPress={onSubmit} loading={recordPayment.isPending} />
    </ScreenContainer>
  );
}
