import { AuthContext } from '../../../lib/auth-context';
import { ImportType } from '../import-session.model';

export interface ProcessRowResult {
  success: boolean;
  /** _id of the created domain record on success */
  recordId?: string;
  /** Error message on failure */
  error?: string;
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
