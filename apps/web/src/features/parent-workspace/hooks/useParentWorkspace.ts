import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { parentWorkspaceApi } from '../api/parent-workspace.api';

// Selected child persists across a browser session so a parent who checked
// Anaya's homework doesn't land back on Aarav after a refresh.
const STORAGE_KEY = 'schoolos.parent.activeChildId';

export function useParentWorkspace() {
  const [activeChildId, setActiveChildIdState] = useState<string | undefined>(
    () => sessionStorage.getItem(STORAGE_KEY) ?? undefined,
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ['parent-workspace', activeChildId],
    queryFn: () => parentWorkspaceApi.getWorkspace(activeChildId),
  });

  const setActiveChildId = (id: string) => {
    sessionStorage.setItem(STORAGE_KEY, id);
    setActiveChildIdState(id);
  };

  const activeChild = data?.children.find((c) => c._id === (activeChildId ?? data.children[0]?._id))
    ?? data?.children[0];

  return {
    data,
    activeChild,
    isLoading,
    isError,
    setActiveChildId,
  };
}
