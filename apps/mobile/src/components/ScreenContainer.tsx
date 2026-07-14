import { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

interface ScreenContainerProps {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: ViewStyle;
}

export function ScreenContainer({ children, scroll = true, refreshing, onRefresh, style }: ScreenContainerProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  const content = (
    <View style={[styles.content, { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }, style]}>
      {children}
    </View>
  );

  if (!scroll) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: insets.top }]}>{content}</View>
    );
  }

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 12 }}
      refreshControl={
        onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined
      }
    >
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1 },
});
