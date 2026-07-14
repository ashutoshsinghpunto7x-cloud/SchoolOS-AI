import { AuthContext } from '../../../lib/auth-context';
import { ImportType } from '../import-session.model';

/** How to handle a row that matched an existing record during preview.
 *  Defaults to 'update' everywhere — identical to the engine's pre-existing
 *  behavior before duplicate resolution was surfaced to the user. */
export type DuplicateAction = 'skip' | 'update' | 'create';

export interface ProcessRowResult {
  success: boolean;
  /** _id of the created or updated domain record on success */
  recordId?: string;
  /** Error message on failure */
  error?: string;
  /**
   * Set when this row updated an existing record rather than creating a new
   * one (e.g. student import matched by admission number). The engine still
   * marks the row 'imported', but excludes it from the session's rollback
   * list — rolling back an import must never delete a record that already
   * existed before this session ran.
   */
  isUpdate?: boolean;
  /** Set when duplicateAction was 'skip' and a match was found — the row is
   *  marked 'skipped' rather than 'imported' and never touches the DB. */
  skipped?: boolean;
}

export interface IProcessor {
  readonly importType: ImportType;

  /**
   * Create a single domain record by delegating to the business service.
   * Must NOT write directly to MongoDB — delegates to the business service.
   * Must NOT throw — always returns ProcessRowResult.
   *
   * `duplicateAction` (only meaningful when `findDuplicate` found a match at
   * validation time) controls what happens to that match: 'update' (default)
   * overwrites it, 'skip' leaves it untouched, 'create' ignores the match and
   * always inserts a new record.
   */
  processRow(cleanData: Record<string, unknown>, ctx: AuthContext, duplicateAction?: DuplicateAction): Promise<ProcessRowResult>;

  /**
   * Soft-delete a previously imported record (rollback).
   * Delegates to the business service's delete method.
   * Must NOT throw — resolves silently if record not found.
   */
  rollbackRow(recordId: string, ctx: AuthContext): Promise<void>;

  /**
   * Optional: look up whether cleanData matches an existing record, called
   * once per row during validation/preview (read-only, never writes). Types
   * with no natural dedup key (fees, admissions) simply omit this.
   */
  findDuplicate?(cleanData: Record<string, unknown>, schoolId: string): Promise<string | undefined>;
}
