import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { useTheme } from '@/theme';

export function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <Card style={{ marginBottom: spacing.md }}>
      <Text style={[typography.subheading, { color: colors.text, marginBottom: spacing.sm }]}>{title}</Text>
      {children}
    </Card>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={[styles.row, { marginBottom: spacing.xs }]}>
      <Text style={[typography.body, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[typography.bodyStrong, { color: colors.text, flexShrink: 1, textAlign: 'right' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
});
