import { Stack } from 'expo-router';

export default function FeesLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="record" options={{ title: 'Record payment', headerBackTitle: 'Back' }} />
      <Stack.Screen name="receipt/[receiptNumber]" options={{ title: 'Receipt', headerBackTitle: 'Fees' }} />
    </Stack>
  );
}
