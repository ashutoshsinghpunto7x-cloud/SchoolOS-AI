import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';

type Tone = 'success' | 'warning' | 'danger' | 'neutral';

export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const { colors, radius, spacing, typography } = useTheme();

  const toneColors: Record<Tone, { bg: string; fg: string }> = {
    success: { bg: colors.successMuted, fg: colors.success },
    warning: { bg: colors.warningMuted, fg: colors.warning },
    danger: { bg: colors.dangerMuted, fg: colors.danger },
    neutral: { bg: colors.border, fg: colors.textMuted },
  };

  const { bg, fg } = toneColors[tone];

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: bg, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
      ]}
    >
      <Text style={[typography.label, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start' },
});
