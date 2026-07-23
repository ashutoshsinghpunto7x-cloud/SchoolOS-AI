import { createStore, get, set, del, keys } from 'idb-keyval';
import type { DraftRecord } from './types';

// Dedicated store so this never shares an object store with any unrelated
// future idb-keyval usage elsewhere in the app.
const draftsStore = createStore('schoolos-drafts', 'drafts');

export async function getDraft<T>(key: string): Promise<DraftRecord<T> | undefined> {
  return get<DraftRecord<T>>(key, draftsStore);
}

export async function setDraft<T>(key: string, payload: T): Promise<void> {
  const record: DraftRecord<T> = { key, payload, updatedAt: Date.now(), schemaVersion: 1 };
  await set(key, record, draftsStore);
}

export async function deleteDraft(key: string): Promise<void> {
  await del(key, draftsStore);
}

export async function listDraftKeys(prefix: string): Promise<string[]> {
  const all = await keys(draftsStore);
  return all.filter((k): k is string => typeof k === 'string' && k.startsWith(prefix));
}
