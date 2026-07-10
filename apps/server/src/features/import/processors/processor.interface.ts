import { AuthContext } from '../../../lib/auth-context';
import { ImportType } from '../import-session.model';

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
}

export interface IProcessor {
  readonly importType: ImportType;

  /**
   * Create a single domain record by delegating to the business service.
   * Must NOT write directly to MongoDB — delegates to the business service.
   * Must NOT throw — always returns ProcessRowResult.
   */
  processRow(cleanData: Record<string, unknown>, ctx: AuthContext): Promise<ProcessRowResult>;

  /**
   * Soft-delete a previously imported record (rollback).
   * Delegates to the business service's delete method.
   * Must NOT throw — resolves silently if record not found.
   */
  rollbackRow(recordId: string, ctx: AuthContext): Promise<void>;
}
