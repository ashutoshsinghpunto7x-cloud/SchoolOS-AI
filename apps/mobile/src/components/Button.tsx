import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
}

export function Button({ label, onPress, variant = 'primary', loading, disabled }: ButtonProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const isDisabled = disabled || loading;

  const backgroundColor =
    variant === 'primary' ? colors.primary : variant === 'danger' ? colors.dangerMuted : colors.surfaceRaised;
  const textColor = variant === 'primary' ? colors.textInverse : variant === 'danger' ? colors.danger : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor,
          borderRadius: radius.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          opacity: isDisabled ? 0.6 : pressed ? 0.85 : 1,
          borderWidth: variant === 'secondary' ? StyleSheet.hairlineWidth : 0,
          borderColor: colors.border,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[typography.bodyStrong, { color: textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
