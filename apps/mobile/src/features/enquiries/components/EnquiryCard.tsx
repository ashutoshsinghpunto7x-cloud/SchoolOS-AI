import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Enquiry } from '@schoolos/types';
import { Card } from '@/components/Card';
import { StatusPill } from '@/components/StatusPill';
import { useTheme } from '@/theme';
import { STAGE_LABEL, STAGE_TONE } from './stageTone';

export function EnquiryCard({ enquiry, onPress }: { enquiry: Enquiry; onPress: () => void }) {
  const { colors, spacing, typography } = useTheme();

  return (
    <Pressable onPress={onPress}>
      <Card style={{ marginBottom: spacing.sm }}>
        <View style={styles.row}>
          <View style={styles.info}>
            <Text style={[typography.bodyStrong, { color: colors.text }]}>{enquiry.studentName}</Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
              Class {enquiry.interestedClass} · {enquiry.parentName}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>{enquiry.parentPhone}</Text>
          </View>
          <StatusPill label={STAGE_LABEL[enquiry.stage]} tone={STAGE_TONE[enquiry.stage]} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  info: { flexShrink: 1, marginRight: 12 },
});
