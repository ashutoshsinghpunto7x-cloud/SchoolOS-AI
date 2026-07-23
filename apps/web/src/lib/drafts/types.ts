export type DraftStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export interface DraftRecord<T> {
  key: string;
  payload: T;
  updatedAt: number;
  schemaVersion: 1;
}
