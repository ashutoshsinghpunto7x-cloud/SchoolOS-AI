import { useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import * as Updates from 'expo-updates';

// Checks for an OTA update at launch and every time the app returns to the
// foreground. When one has downloaded, asks the user to restart now so they
// don't have to close and reopen the app twice by hand.
export function useOtaUpdate(): void {
  const busy = useRef(false);
  const prompted = useRef(false);

  useEffect(() => {
    // Disabled in dev/Expo Go; only real release builds can update.
    if (!Updates.isEnabled) return;

    const check = async () => {
      if (busy.current || prompted.current) return;
      busy.current = true;
      try {
        const res = await Updates.checkForUpdateAsync();
        if (!res.isAvailable) return;
        await Updates.fetchUpdateAsync();
        prompted.current = true;
        Alert.alert(
          'Update available',
          'A new version of SchoolOS is ready. Restart now to use it.',
          [
            { text: 'Later', style: 'cancel', onPress: () => { prompted.current = false; } },
            { text: 'Restart now', onPress: () => { Updates.reloadAsync().catch(() => undefined); } },
          ],
          { cancelable: false },
        );
      } catch {
        // Offline or server hiccup — silently retry on next foreground.
      } finally {
        busy.current = false;
      }
    };

    check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => sub.remove();
  }, []);
}
