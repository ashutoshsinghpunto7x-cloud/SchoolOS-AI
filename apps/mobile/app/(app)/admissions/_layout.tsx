import { Stack } from 'expo-router';

export default function AdmissionsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Admissions', headerBackTitle: 'Back' }} />
      <Stack.Screen name="new" options={{ title: 'New enquiry', headerBackTitle: 'Back' }} />
      <Stack.Screen name="[id]" options={{ title: 'Enquiry', headerBackTitle: 'Back' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Edit enquiry', headerBackTitle: 'Back' }} />
      <Stack.Screen name="[id]/convert" options={{ title: 'Convert to student', headerBackTitle: 'Back' }} />
    </Stack>
  );
}
