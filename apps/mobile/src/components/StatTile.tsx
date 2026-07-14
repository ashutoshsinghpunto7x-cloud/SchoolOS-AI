import { StyleSheet, Text } from 'react-native';
import { useTheme } from '@/theme';
import { Card } from './Card';

interface StatTileProps {
  label: string;
  value: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger';
}

export function StatTile({ label, value, tone = 'primary' }: StatTileProps) {
  const { colors, spacing, typography } = useTheme();
  const toneColor = { primary: colors.primary, success: colors.success, warning: colors.warning, danger: colors.danger }[
    tone
  ];

  return (
    <Card style={styles.card}>
      <Text style={[typography.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[typography.title, { color: toneColor, marginTop: spacing.xs }]}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexBasis: '47%', flexGrow: 1 },
});
