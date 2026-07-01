export interface ParsedRow {
  /** 1-based row number (row 1 = first data row after header) */
  rowNumber: number;
  /** Raw key-value pairs from the file using original header names */
  data: Record<string, unknown>;
}

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  totalRows: number;
}

export interface IParser {
  /** Supported MIME types */
  readonly supportedMimeTypes: string[];
  /** Supported file extensions (lowercase, with dot) */
  readonly supportedExtensions: string[];

  /**
   * Parse a file buffer into rows.
   * @param buffer - The file contents
   * @param mimeType - The file's MIME type
   */
  parse(buffer: Buffer, mimeType: string): ParseResult;
}
