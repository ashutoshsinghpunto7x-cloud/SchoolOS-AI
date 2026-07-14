import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { FeeDefaulter } from '@schoolos/types';
import { Card } from '@/components/Card';
import { StatusPill } from '@/components/StatusPill';
import { useTheme } from '@/theme';
import { formatCurrency } from '@/utils/format';

export function DefaulterRow({ defaulter, onPress }: { defaulter: FeeDefaulter; onPress: () => void }) {
  const { colors, spacing, typography } = useTheme();
  const overdue = defaulter.daysOverdue > 0;

  return (
    <Pressable onPress={onPress}>
      <Card style={{ marginBottom: spacing.sm }}>
        <View style={styles.row}>
          <View style={styles.info}>
            <Text style={[typography.bodyStrong, { color: colors.text }]}>{defaulter.studentName}</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {defaulter.class}-{defaulter.section} · {defaulter.feeHead}
            </Text>
          </View>
          <View style={styles.amount}>
            <Text style={[typography.bodyStrong, { color: colors.danger }]}>{formatCurrency(defaulter.balance)}</Text>
            {overdue ? <StatusPill label={`${defaulter.daysOverdue}d overdue`} tone="danger" /> : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  info: { flexShrink: 1, marginRight: 12 },
  amount: { alignItems: 'flex-end', gap: 6 },
});
