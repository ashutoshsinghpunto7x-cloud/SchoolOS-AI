import { Stack } from 'expo-router';

export default function TeachersLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="search" options={{ title: 'Search teachers', headerBackTitle: 'Back' }} />
      <Stack.Screen name="new" options={{ title: 'New teacher', headerBackTitle: 'Back' }} />
      <Stack.Screen name="[id]" options={{ title: 'Teacher', headerBackTitle: 'Back' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Edit teacher', headerBackTitle: 'Back' }} />
    </Stack>
  );
}
