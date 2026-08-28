import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/theme';
import type { ChildSummary } from '../types';

interface ChildSwitcherProps {
  children: ChildSummary[];
  selectedChildId: string | null;
  onSelect: (childId: string) => void;
}

// Only renders anything useful once a parent has more than one child linked —
// single-child parents never see this row, matching the web dashboard.
export function ChildSwitcher({ children, selectedChildId, onSelect }: ChildSwitcherProps) {
  const { colors, radius, spacing, typography } = useTheme();

  if (children.length < 2) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
      {children.map((child) => {
        const isSelected = child._id === selectedChildId;
        return (
          <Pressable
            key={child._id}
            onPress={() => onSelect(child._id)}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? colors.primary : colors.surface,
                borderColor: isSelected ? colors.primary : colors.border,
                borderRadius: radius.full,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                marginRight: spacing.sm,
              },
            ]}
          >
            <Text style={[typography.bodyStrong, { color: isSelected ? colors.textInverse : colors.text }]}>
              {child.name}
            </Text>
            <Text
              style={[
                typography.caption,
                { color: isSelected ? colors.textInverse : colors.textMuted, marginTop: 1 },
              ]}
            >
              {child.grade}-{child.section}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: { borderWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
});
