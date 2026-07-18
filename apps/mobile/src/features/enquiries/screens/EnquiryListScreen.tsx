import { useEffect, useMemo, useState } from 'react';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { Enquiry, EnquiryStage } from '@schoolos/types';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Skeleton } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import { useTheme } from '@/theme';
import { EnquiryCard } from '../components/EnquiryCard';
import { PipelineOverview } from '../components/PipelineOverview';
import { useInfiniteEnquiries, useStageCounts } from '../hooks';

// Debounces the search box so every keystroke doesn't fire a network request.
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function EnquiryListScreen() {
  const { colors, spacing, typography } = useTheme();
  const [search, setSearch] = useState('');
  const [interestedClass, setInterestedClass] = useState('');
  const [stage, setStage] = useState<EnquiryStage | undefined>(undefined);

  const debouncedSearch = useDebouncedValue(search, 350);
  const debouncedClass = useDebouncedValue(interestedClass, 350);

  const filters = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      interestedClass: debouncedClass.trim() || undefined,
      stage,
    }),
    [debouncedSearch, debouncedClass, stage]
  );

  const stageCounts = useStageCounts();
  const query = useInfiniteEnquiries(filters);
  const enquiries: Enquiry[] = query.data?.pages.flatMap((page) => page.data) ?? [];
  const total = query.data?.pages[0]?.meta.total;

  return (
    <ScreenContainer scroll={false} style={{ paddingHorizontal: 0, paddingBottom: 0 }}>
      <View style={{ paddingTop: spacing.lg, paddingHorizontal: spacing.lg }}>
        <View style={styles.headerRow}>
          <Text style={[typography.title, { color: colors.text }]}>Admissions</Text>
          <Text
            style={[typography.bodyStrong, { color: colors.primary }]}
            onPress={() => router.push('/(app)/admissions/new')}
          >
            New enquiry
          </Text>
        </View>

        {stageCounts.data ? (
          <View style={{ marginBottom: spacing.md }}>
            <PipelineOverview counts={stageCounts.data} activeStage={stage} onSelectStage={setStage} />
          </View>
        ) : null}

        <TextField label="Name, phone, or parent" placeholder="Search enquiries" value={search} onChangeText={setSearch} />
        <TextField label="Interested class" placeholder="e.g. 8" value={interestedClass} onChangeText={setInterestedClass} />

        {typeof total === 'number' ? (
          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.sm }]}>
            {total} enquir{total === 1 ? 'y' : 'ies'}
          </Text>
        ) : null}
      </View>

      <View style={styles.listArea}>
        {query.isLoading ? (
          <View style={{ paddingHorizontal: spacing.lg }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} style={{ height: 84, borderRadius: 16, marginBottom: 8 }} />
            ))}
          </View>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : enquiries.length === 0 ? (
          <EmptyState title="No enquiries found" description="Try adjusting your search or filters." />
        ) : (
          <FlashList
            data={enquiries}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
            renderItem={({ item }) => (
              <EnquiryCard
                enquiry={item}
                onPress={() => router.push({ pathname: '/(app)/admissions/[id]', params: { id: item._id } })}
              />
            )}
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
            }}
            onRefresh={() => query.refetch()}
            refreshing={query.isRefetching}
            ListFooterComponent={
              query.isFetchingNextPage ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} /> : null
            }
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  listArea: { flex: 1 },
});
