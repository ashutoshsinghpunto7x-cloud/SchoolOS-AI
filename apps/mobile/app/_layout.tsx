import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useOtaUpdate } from '@/utils/useOtaUpdate';

// The Android/iOS app is a native shell around the real SchoolOS web app
// (see app/index.tsx) — so there are no native screens to provide here.
export default function RootLayout() {
  useOtaUpdate();
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Slot />
    </SafeAreaProvider>
  );
}
