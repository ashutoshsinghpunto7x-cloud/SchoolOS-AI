import { useEffect, useRef, useState } from 'react';
import { getDraft, setDraft, deleteDraft } from '@/lib/drafts/draftStore';
import { isExpired } from '@/lib/drafts/expiry';
import type { DraftStatus } from '@/lib/drafts/types';

interface UseSmartDraftOptions {
  /** Debounce window before a changed value is written to IndexedDB. */
  debounceMs?: number;
  /** When false, the hook is fully inert — no reads, no writes. Use this while
   *  the draft key's dependencies (route params, auth user, …) haven't resolved yet. */
  enabled?: boolean;
  /** Drafts older than this are treated as absent and silently deleted on read. */
  maxAgeDays?: number;
}

interface UseSmartDraftResult<T> {
  status: DraftStatus;
  lastSavedAt: number | null;
  isOffline: boolean;
  /** True once a non-expired local draft was found for this key and hasn't been
   *  resolved yet via restore()/discard(). The caller decides what to do — nothing
   *  is auto-applied. */
  hasRecoverableDraft: boolean;
  /** Returns the recovered payload for the caller to apply to its own state. */
  restore: () => T | null;
  /** Deletes the local draft without applying it. */
  discard: () => void;
  /** Call after a confirmed successful server submission — clears the local draft. */
  markSubmitted: () => void;
}

/** Generic client-side draft/autosave engine — reusable by any editable module.
 *  It wraps a caller-owned value (does not own state itself): every change to
 *  `currentValue` is debounced and persisted to IndexedDB, and a recoverable
 *  draft found on mount is surfaced via `hasRecoverableDraft` for the caller to
 *  offer as a restore/discard choice. */
export function useSmartDraft<T>(
  key: string | null,
  currentValue: T,
  options: UseSmartDraftOptions = {},
): UseSmartDraftResult<T> {
  const { debounceMs = 400, enabled = true, maxAgeDays = 7 } = options;
  const active = enabled && !!key;

  const [status, setStatus] = useState<DraftStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);
  const [hasRecoverableDraft, setHasRecoverableDraft] = useState(false);

  const lastPersistedRef = useRef<string | null>(null);
  const pendingDraftPayloadRef = useRef<T | null>(null);
  const awaitingRecoveryRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Online/offline tracking — independent of `key`/`enabled`.
  useEffect(() => {
    function onOnline() { setIsOffline(false); }
    function onOffline() { setIsOffline(true); }
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // One-shot recoverable-draft check whenever the key changes.
  useEffect(() => {
    lastPersistedRef.current = null;
    pendingDraftPayloadRef.current = null;
    awaitingRecoveryRef.current = false;
    setHasRecoverableDraft(false);
    setStatus('idle');
    setLastSavedAt(null);

    if (!active || !key) return;
    let cancelled = false;

    void getDraft<T>(key).then((record) => {
      if (cancelled || !record) return;
      if (isExpired(record.updatedAt, maxAgeDays)) {
        void deleteDraft(key);
        return;
      }
      pendingDraftPayloadRef.current = record.payload;
      awaitingRecoveryRef.current = true;
      setHasRecoverableDraft(true);
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, active, maxAgeDays]);

  // Debounced autosave — skipped while a recovery decision is still pending,
  // so the freshly-loaded server state doesn't silently overwrite the local
  // draft before the teacher has chosen Restore or Discard.
  useEffect(() => {
    if (!active || !key || awaitingRecoveryRef.current) return;

    const serialized = JSON.stringify(currentValue);
    if (serialized === lastPersistedRef.current) return;

    setStatus('dirty');
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setStatus('saving');
      setDraft(key, currentValue)
        .then(() => {
          lastPersistedRef.current = serialized;
          setStatus('saved');
          setLastSavedAt(Date.now());
        })
        .catch(() => setStatus('error'));
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentValue, active, key, debounceMs]);

  function restore(): T | null {
    const payload = pendingDraftPayloadRef.current;
    awaitingRecoveryRef.current = false;
    setHasRecoverableDraft(false);
    if (payload !== null) lastPersistedRef.current = JSON.stringify(payload);
    return payload;
  }

  function discard(): void {
    awaitingRecoveryRef.current = false;
    pendingDraftPayloadRef.current = null;
    setHasRecoverableDraft(false);
    if (key) void deleteDraft(key);
  }

  function markSubmitted(): void {
    lastPersistedRef.current = null;
    setStatus('idle');
    setLastSavedAt(null);
    if (key) void deleteDraft(key);
  }

  return { status, lastSavedAt, isOffline, hasRecoverableDraft, restore, discard, markSubmitted };
}
