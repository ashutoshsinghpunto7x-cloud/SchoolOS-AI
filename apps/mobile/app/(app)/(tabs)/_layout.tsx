import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { canViewTeacherDirectory } from '@/constants/roles';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';

export default function TabsLayout() {
  const { colors } = useTheme();
  const role = useAuthStore((s) => s.user?.role);
  // `href: null` removes a tab from the bar while keeping its routes
  // reachable — used instead of a second per-role tab set so the tab bar
  // doesn't grow per role (see plan: role-aware content over duplicated tabs).
  const showTeachersTab = role ? canViewTeacherDirectory(role) : false;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-done-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="fees"
        options={{
          title: 'Fees',
          tabBarIcon: ({ color, size }) => <Ionicons name="cash-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="teachers"
        options={{
          title: 'Teachers',
          href: showTeachersTab ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
