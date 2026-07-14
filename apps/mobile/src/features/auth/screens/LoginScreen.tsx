import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { secureStorage } from '@/services/secureStorage';
import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { useAuthStore } from '@/stores/authStore';
import { extractErrorMessage } from '@/services/api/client';
import { useTheme } from '@/theme';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

export function LoginScreen() {
  const { colors, spacing, typography } = useTheme();
  const login = useAuthStore((s) => s.login);
  const [serverError, setServerError] = useState<string | null>(null);
  const [hasPinDevice, setHasPinDevice] = useState(false);

  useEffect(() => {
    secureStorage.getDeviceId().then((id) => setHasPinDevice(!!id));
  }, []);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await login(values.email, values.password);
    } catch (err) {
      setServerError(extractErrorMessage(err));
    }
  };

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.header}>
        <Text style={[typography.title, { color: colors.text }]}>SchoolOS</Text>
        <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.xs }]}>
          Sign in to your workspace
        </Text>
      </View>

      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextField
            label="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            error={errors.email?.message}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextField
            label="Password"
            secureTextEntry
            autoCapitalize="none"
            error={errors.password?.message}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
          />
        )}
      />

      {serverError ? (
        <Text style={[typography.caption, { color: colors.danger, marginBottom: spacing.md }]}>{serverError}</Text>
      ) : null}

      <Button label="Sign in" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />

      {hasPinDevice ? (
        <Pressable style={styles.pinLink} onPress={() => router.push('/(auth)/login-pin')}>
          <Text style={[typography.bodyStrong, { color: colors.primary }]}>Use PIN instead</Text>
        </Pressable>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 32, marginTop: 48 },
  pinLink: { alignItems: 'center', marginTop: 20 },
});
