import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { extractErrorMessage } from '@/services/api/client';
import { secureStorage } from '@/services/secureStorage';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';

export function PinLoginScreen() {
  const { colors, spacing, typography } = useTheme();
  const loginWithPin = useAuthStore((s) => s.loginWithPin);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    secureStorage.getDeviceId().then(setDeviceId);
  }, []);

  const onSubmit = async () => {
    if (!deviceId) return;
    setError(null);
    setSubmitting(true);
    try {
      await loginWithPin(deviceId, pin);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!deviceId) {
    return (
      <ScreenContainer scroll={false}>
        <View style={styles.header}>
          <Text style={[typography.subheading, { color: colors.text }]}>Quick PIN sign-in isn't set up on this device yet</Text>
          <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.xs }]}>
            Sign in with your password first, then enable it from Settings.
          </Text>
        </View>
        <Button label="Back to sign in" variant="secondary" onPress={() => router.back()} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.header}>
        <Text style={[typography.title, { color: colors.text }]}>Enter your PIN</Text>
      </View>

      <TextField
        label="4-digit PIN"
        keyboardType="number-pad"
        maxLength={4}
        secureTextEntry
        value={pin}
        onChangeText={setPin}
      />

      {error ? <Text style={[typography.caption, { color: colors.danger, marginBottom: spacing.md }]}>{error}</Text> : null}

      <Button label="Unlock" onPress={onSubmit} loading={submitting} disabled={pin.length !== 4} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 32, marginTop: 48 },
});
