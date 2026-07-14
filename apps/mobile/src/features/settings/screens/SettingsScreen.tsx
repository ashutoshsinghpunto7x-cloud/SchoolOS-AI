import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { ROLE_LABELS } from '@/constants/roles';
import { registerForPushNotifications } from '@/features/notifications/registerForPush';
import { authApi } from '@/features/auth/api';
import { extractErrorMessage } from '@/services/api/client';
import { secureStorage } from '@/services/secureStorage';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';

export function SettingsScreen() {
  const { colors, spacing, typography } = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [hasPinDevice, setHasPinDevice] = useState(false);
  const [pin, setPin] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [pinMessage, setPinMessage] = useState<string | null>(null);

  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);

  useEffect(() => {
    secureStorage.getDeviceId().then((id) => setHasPinDevice(!!id));
  }, []);

  const onEnablePin = async () => {
    if (pin.length !== 4) {
      setPinMessage('Enter a 4-digit PIN');
      return;
    }
    setPinBusy(true);
    setPinMessage(null);
    try {
      const { deviceId } = await authApi.setupPin({ pin });
      await secureStorage.setDeviceId(deviceId);
      setHasPinDevice(true);
      setPinMessage('Quick PIN sign-in enabled on this device');
    } catch (err) {
      setPinMessage(extractErrorMessage(err));
    } finally {
      setPinBusy(false);
    }
  };

  const onEnablePush = async () => {
    setPushBusy(true);
    setPushMessage(null);
    try {
      const result = await registerForPushNotifications();
      if (result.status === 'registered') {
        setPushMessage('Push notifications enabled');
      } else if (result.status === 'permission_denied') {
        setPushMessage('Notification permission was denied');
      } else {
        setPushMessage(result.reason);
      }
    } catch (err) {
      setPushMessage(extractErrorMessage(err));
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <ScreenContainer>
      <Text style={[typography.title, { color: colors.text, marginBottom: spacing.lg }]}>Settings</Text>

      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={[typography.subheading, { color: colors.text }]}>
          {user ? `${user.firstName} ${user.lastName}` : ''}
        </Text>
        <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.xs }]}>{user?.email}</Text>
        <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
          {user ? ROLE_LABELS[user.role] : ''}
        </Text>
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={[typography.subheading, { color: colors.text, marginBottom: spacing.sm }]}>
          Push notifications
        </Text>
        <Text style={[typography.body, { color: colors.textMuted, marginBottom: spacing.md }]}>
          Get alerted about attendance, fees, and announcements.
        </Text>
        {pushMessage ? (
          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.sm }]}>{pushMessage}</Text>
        ) : null}
        <Button label="Enable notifications" variant="secondary" onPress={onEnablePush} loading={pushBusy} />
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={[typography.subheading, { color: colors.text, marginBottom: spacing.sm }]}>Quick PIN sign-in</Text>
        {hasPinDevice ? (
          <Text style={[typography.body, { color: colors.textMuted }]}>Enabled on this device.</Text>
        ) : (
          <View>
            <TextField label="Choose a 4-digit PIN" keyboardType="number-pad" maxLength={4} secureTextEntry value={pin} onChangeText={setPin} />
            {pinMessage ? (
              <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.sm }]}>{pinMessage}</Text>
            ) : null}
            <Button label="Enable" variant="secondary" onPress={onEnablePin} loading={pinBusy} />
          </View>
        )}
      </Card>

      <Button label="Sign out" variant="danger" onPress={() => logout()} />
    </ScreenContainer>
  );
}
