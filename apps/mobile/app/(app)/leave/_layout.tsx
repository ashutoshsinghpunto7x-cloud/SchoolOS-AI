import { Stack } from 'expo-router';

export default function LeaveLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'My Leave', headerBackTitle: 'Back' }} />
      <Stack.Screen name="apply" options={{ title: 'Apply for leave', headerBackTitle: 'Back' }} />
    </Stack>
  );
}
