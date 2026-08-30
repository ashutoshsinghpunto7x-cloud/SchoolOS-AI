import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Skeleton } from '@/components/Skeleton';
import { StatTile } from '@/components/StatTile';
import { StatusPill } from '@/components/StatusPill';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/authStore';
import { ChildSwitcher } from '../components/ChildSwitcher';
import { useParentWorkspace } from '../hooks';
import { useSelectedChildStore } from '../store';
import type { ChildSummary } from '../types';

const FEE_TONE: Record<ChildSummary['feeStatus'], 'success' | 'warning' | 'danger'> = {
  paid: 'success',
  due: 'warning',
  overdue: 'danger',
};

export function ParentDashboardScreen() {
  const { colors, spacing, typography } = useTheme();
  const authUser = useAuthStore((s) => s.user);
  const selectedChildId = useSelectedChildStore((s) => s.selectedChildId);
  const setSelectedChildId = useSelectedChildStore((s) => s.setSelectedChildId);

  const query = useParentWorkspace(selectedChildId ?? undefined);

  // First load (or after a child is removed): fall back to the primary child
  // the bundle already picked, so the child-scoped tabs have something to key on.
  useEffect(() => {
    if (!selectedChildId && query.data?.children.length) {
      setSelectedChildId(query.data.children[0]._id);
    }
  }, [query.data, selectedChildId, setSelectedChildId]);

  if (query.isLoading) {
    return (
      <ScreenContainer>
        <Skeleton style={{ height: 60, borderRadius: 16, marginBottom: 16 }} />
        <Skeleton style={{ height: 140, borderRadius: 16, marginBottom: 16 }} />
        <Skeleton style={{ height: 200, borderRadius: 16 }} />
      </ScreenContainer>
    );
  }

  if (query.isError || !query.data) {
    return (
      <ScreenContainer>
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      </ScreenContainer>
    );
  }

  const { children, schedule, attention, updates } = query.data;
  const activeChild = children.find((c) => c._id === selectedChildId) ?? children[0];

  return (
    <ScreenContainer onRefresh={() => query.refetch()} refreshing={query.isFetching}>
      <Text style={[typography.title, { color: colors.text, marginBottom: 2 }]}>
        {authUser ? `Hi, ${authUser.firstName}` : 'Home'}
      </Text>
      <Text style={[typography.body, { color: colors.textMuted, marginBottom: spacing.md }]}>
        {activeChild ? `${activeChild.name} · ${activeChild.grade}-${activeChild.section}` : 'No student linked yet'}
      </Text>

      <ChildSwitcher children={children} selectedChildId={selectedChildId} onSelect={setSelectedChildId} />

      {!activeChild ? (
        <EmptyState
          title="No student linked yet"
          description="Ask your school's front office to link your child to this account."
        />
      ) : (
        <>
          <View style={styles.grid}>
            <StatTile
              label="Attendance"
              value={`${activeChild.attendancePercent}%`}
              tone={activeChild.attendancePercent >= 90 ? 'success' : activeChild.attendancePercent >= 75 ? 'warning' : 'danger'}
            />
            <StatTile label="Academic avg" value={`${activeChild.academicAverage}/10`} />
          </View>

          <Card style={{ marginTop: spacing.md, marginBottom: spacing.lg }}>
            <View style={styles.row}>
              <View>
                <Text style={[typography.subheading, { color: colors.text }]}>Today</Text>
                <Text style={[typography.body, { color: colors.textMuted, marginTop: 2 }]}>
                  {activeChild.status === 'present'
                    ? `Checked in${activeChild.checkedInAt ? ` at ${activeChild.checkedInAt}` : ''}`
                    : activeChild.status === 'holiday'
                      ? 'Holiday'
                      : activeChild.status === 'late'
                        ? 'Arrived late'
                        : 'Not checked in'}
                </Text>
              </View>
              <StatusPill
                label={activeChild.status}
                tone={activeChild.status === 'present' ? 'success' : activeChild.status === 'absent' ? 'danger' : 'neutral'}
              />
            </View>
          </Card>

          <Card style={{ marginBottom: spacing.lg }}>
            <View style={styles.row}>
              <Text style={[typography.subheading, { color: colors.text }]}>Fees</Text>
              <StatusPill label={activeChild.feeStatus} tone={FEE_TONE[activeChild.feeStatus]} />
            </View>
            {activeChild.feeDueAmount ? (
              <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.xs }]}>
                ₹{activeChild.feeDueAmount.toLocaleString('en-IN')} due
              </Text>
            ) : null}
          </Card>

          {attention.length > 0 ? (
            <>
              <Text style={[typography.heading, { color: colors.text, marginBottom: spacing.sm }]}>
                Needs your attention
              </Text>
              {attention.map((item) => (
                <Card key={item._id} style={{ marginBottom: spacing.sm }}>
                  <Text style={[typography.bodyStrong, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>{item.detail}</Text>
                </Card>
              ))}
            </>
          ) : null}

          {schedule.length > 0 ? (
            <>
              <Text
                style={[typography.heading, { color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm }]}
              >
                Today's schedule
              </Text>
              {schedule.map((entry) => (
                <Card key={entry._id} style={{ marginBottom: spacing.sm }}>
                  <View style={styles.row}>
                    <View style={{ flexShrink: 1 }}>
                      <Text style={[typography.bodyStrong, { color: colors.text }]}>{entry.subject}</Text>
                      <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>{entry.detail}</Text>
                    </View>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>{entry.time}</Text>
                  </View>
                </Card>
              ))}
            </>
          ) : null}

          {updates.length > 0 ? (
            <>
              <Text
                style={[typography.heading, { color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm }]}
              >
                School updates
              </Text>
              {updates.map((update) => (
                <Card key={update._id} style={{ marginBottom: spacing.sm }}>
                  <Text style={[typography.bodyStrong, { color: colors.text }]}>{update.title}</Text>
                  <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                    {update.when}
                    {update.location ? ` · ${update.location}` : ''}
                  </Text>
                </Card>
              ))}
            </>
          ) : null}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
