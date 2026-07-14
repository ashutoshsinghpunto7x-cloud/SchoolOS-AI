import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={[styles.container, { paddingVertical: spacing.xxl }]}>
      <Text style={[typography.subheading, { color: colors.text, textAlign: 'center' }]}>{title}</Text>
      {description ? (
        <Text
          style={[
            typography.body,
            { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg },
          ]}
        >
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: spacing.md, minWidth: 160 }}>
          <Button label={actionLabel} onPress={onAction} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
});
