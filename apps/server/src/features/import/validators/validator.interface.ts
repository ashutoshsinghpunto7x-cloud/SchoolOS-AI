import { IImportRowError } from '../import-session.model';

export interface RowValidationResult {
  /** 'valid' | 'warning' | 'error' */
  status: 'valid' | 'warning' | 'error';
  errors: IImportRowError[];
  warnings: IImportRowError[];
  /** Cleaned / coerced data ready for business service */
  cleanData: Record<string, unknown>;
}

export interface IValidator {
  readonly importType: string;

  /**
   * Validate a single mapped row and return the validation result.
   * Must NOT write to the database.
   * Must NOT throw — always returns RowValidationResult.
   */
  validate(mappedData: Record<string, unknown>): RowValidationResult;

  /** Human-readable field name map for error messages: schemaField → "Display Name" */
  readonly fieldLabels: Record<string, string>;
}
