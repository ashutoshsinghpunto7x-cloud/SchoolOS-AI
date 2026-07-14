import { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/theme';

export function Skeleton({ style }: { style?: ViewStyle }) {
  const { colors, radius } = useTheme();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[styles.base, { backgroundColor: colors.border, borderRadius: radius.sm }, animatedStyle, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: { height: 16, width: '100%' },
});
