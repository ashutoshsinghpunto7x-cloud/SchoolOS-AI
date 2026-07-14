import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '@/theme';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function TextField({ label, error, style, ...inputProps }: TextFieldProps) {
  const { colors, radius, spacing, typography } = useTheme();

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[typography.label, { color: colors.textMuted, marginBottom: spacing.xs }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          typography.body,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
          },
          style,
        ]}
        {...inputProps}
      />
      {error ? <Text style={[typography.caption, { color: colors.danger, marginTop: spacing.xs }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 48,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
