import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { EnquiryStage, StageCounts } from '@schoolos/types';
import { useTheme } from '@/theme';
import { STAGE_LABEL, STAGE_ORDER } from './stageTone';

interface PipelineOverviewProps {
  counts: StageCounts[];
  activeStage?: EnquiryStage;
  onSelectStage: (stage: EnquiryStage | undefined) => void;
}

// Horizontally-scrolling stage chips, doubling as a stage filter — mirrors
// the web app's PipelineOverview (clickable pipeline that also filters the list).
export function PipelineOverview({ counts, activeStage, onSelectStage }: PipelineOverviewProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const countByStage = new Map(counts.map((c) => [c.stage, c.count]));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
      {STAGE_ORDER.map((stage) => {
        const selected = stage === activeStage;
        return (
          <Pressable key={stage} onPress={() => onSelectStage(selected ? undefined : stage)}>
            <View
              style={[
                styles.chip,
                {
                  borderRadius: radius.md,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  backgroundColor: selected ? colors.primary : colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[typography.bodyStrong, { color: selected ? colors.textInverse : colors.text }]}>
                {countByStage.get(stage) ?? 0}
              </Text>
              <Text style={[typography.caption, { color: selected ? colors.textInverse : colors.textMuted }]}>
                {STAGE_LABEL[stage]}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: { borderWidth: StyleSheet.hairlineWidth, minWidth: 96 },
});
