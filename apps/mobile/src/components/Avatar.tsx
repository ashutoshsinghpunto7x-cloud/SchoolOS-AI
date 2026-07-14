import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';

interface AvatarProps {
  name: string;
  photoUrl?: string;
  size?: number;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function Avatar({ name, photoUrl, size = 48 }: AvatarProps) {
  const { colors, typography } = useTheme();
  const dimensionStyle = { width: size, height: size, borderRadius: size / 2 };

  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={[styles.image, dimensionStyle]} />;
  }

  return (
    <View style={[styles.fallback, dimensionStyle, { backgroundColor: colors.primaryMuted }]}>
      <Text style={[typography.bodyStrong, { color: colors.primary, fontSize: size * 0.4 }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {},
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
