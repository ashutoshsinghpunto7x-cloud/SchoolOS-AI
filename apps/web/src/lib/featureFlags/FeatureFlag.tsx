import type { ReactNode } from 'react';
import { useFeature } from './FeatureFlagProvider';

export function FeatureFlag({
  name,
  fallback = null,
  children,
}: {
  name: string;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const enabled = useFeature(name);
  return <>{enabled ? children : fallback}</>;
}
