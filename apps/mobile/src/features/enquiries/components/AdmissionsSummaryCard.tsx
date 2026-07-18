import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { useTheme } from '@/theme';
import { useStageCounts } from '../hooks';

const OPEN_STAGES = new Set([
  'new_enquiry',
  'contacted',
  'follow_up_scheduled',
  'campus_visit',
  'application_submitted',
  'documents_pending',
]);

// Reception's real, data-backed entry point — mirrors the two pieces of the
// web ReceptionWorkspace that are actually wired to live data (the pipeline
// counts and the New Admission/quick-search shortcuts). The web dashboard's
// "Recent Activity" and "Tasks" sections are static mock data, not real
// features, so they're intentionally not reproduced here.
export function AdmissionsSummaryCard() {
  const { colors, spacing, typography } = useTheme();
  const stageCounts = useStageCounts();

  const openCount = (stageCounts.data ?? [])
    .filter((c) => OPEN_STAGES.has(c.stage))
    .reduce((sum, c) => sum + c.count, 0);

  return (
    <Pressable onPress={() => router.push('/(app)/admissions')}>
      <Card style={{ marginBottom: spacing.xl }}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.subheading, { color: colors.text }]}>Admissions</Text>
            <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.xs }]}>
              {stageCounts.isLoading ? 'Loading pipeline…' : `${openCount} open ${openCount === 1 ? 'enquiry' : 'enquiries'}`}
            </Text>
          </View>
        </View>

        <View style={[styles.actions, { marginTop: spacing.md }]}>
          <Pressable
            style={[styles.actionChip, { backgroundColor: colors.primaryMuted, borderRadius: 10, paddingVertical: 8 }]}
            onPress={() => router.push('/(app)/admissions/new')}
          >
            <Text style={[typography.caption, { color: colors.primary, textAlign: 'center' }]}>New enquiry</Text>
          </Pressable>
          <Pressable
            style={[styles.actionChip, { backgroundColor: colors.surfaceRaised, borderRadius: 10, paddingVertical: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }]}
            onPress={() => router.push('/(app)/students/new')}
          >
            <Text style={[typography.caption, { color: colors.text, textAlign: 'center' }]}>New admission</Text>
          </Pressable>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  actions: { flexDirection: 'row', gap: 8 },
  actionChip: { flex: 1 },
});
