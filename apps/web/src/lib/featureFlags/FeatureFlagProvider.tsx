import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { featureFlagsApi } from './featureFlags.api';

const POLL_INTERVAL_MS = 60_000;

interface FeatureFlagContextValue {
  flags: Record<string, boolean>;
  isLoading: boolean;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue>({ flags: {}, isLoading: true });

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ['feature-flags', 'evaluate'],
    queryFn: featureFlagsApi.evaluate,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: false,
    staleTime: POLL_INTERVAL_MS,
  });

  return (
    <FeatureFlagContext.Provider value={{ flags: data ?? {}, isLoading }}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

/** True once a flag is confirmed on — false while loading or if unset/off, so a
 *  gated feature never briefly flashes visible before the real answer arrives. */
export function useFeature(key: string): boolean {
  const { flags } = useContext(FeatureFlagContext);
  return !!flags[key];
}

export function useFeatureFlags(): FeatureFlagContextValue {
  return useContext(FeatureFlagContext);
}
