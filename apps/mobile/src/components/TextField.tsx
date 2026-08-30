import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '@/theme';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function TextField({ label, error, style, secureTextEntry, ...inputProps }: TextFieldProps) {
  const { colors, radius, spacing, typography } = useTheme();
  // Only a password-type field (secureTextEntry passed by the caller) gets
  // the reveal toggle — everything else renders exactly as before.
  const isPasswordField = !!secureTextEntry;
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[typography.label, { color: colors.textMuted, marginBottom: spacing.xs }]}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isPasswordField && !revealed}
          style={[
            styles.input,
            typography.body,
            {
              color: colors.text,
              backgroundColor: colors.surface,
              borderColor: error ? colors.danger : colors.border,
              borderRadius: radius.md,
              paddingHorizontal: spacing.md,
              paddingRight: isPasswordField ? 44 : spacing.md,
            },
            style,
          ]}
          {...inputProps}
        />
        {isPasswordField ? (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            hitSlop={8}
            style={styles.toggle}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
          >
            <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={[typography.caption, { color: colors.danger, marginTop: spacing.xs }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrapper: { justifyContent: 'center' },
  input: {
    height: 48,
    borderWidth: StyleSheet.hairlineWidth,
  },
  toggle: {
    position: 'absolute',
    right: 12,
    height: 48,
    justifyContent: 'center',
  },
});
