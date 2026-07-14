import * as XLSX from 'xlsx';
import { IParser, ParseResult, ParsedRow } from './parser.interface';
import { ValidationError } from '../../../middlewares/errorHandler';

const isBlankCell = (cell: unknown): boolean => cell === null || cell === undefined || String(cell).trim() === '';

/** A cell "looks like a header label" if it's short text that isn't purely numeric/date-like. */
function looksLikeHeaderCell(cell: unknown): boolean {
  const s = String(cell ?? '').trim();
  if (!s || s.length > 40) return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return false; // pure number
  if (/^\d{1,4}[/-]\d{1,2}[/-]\d{1,4}$/.test(s)) return false; // date-like
  return true;
}

/**
 * Many school ERPs export sheets with a preamble above the real table —
 * school name, address, report title, generation date, blank rows — before
 * the actual header row. Scan the first few rows and pick the first one that
 * looks like a header (mostly short text cells) immediately followed by a
 * row of comparable width (the first data row). Falls back to row 0 so
 * already-correct files (header already on row 1) behave exactly as before.
 */
function detectHeaderRowIndex(aoa: unknown[][]): number {
  const SCAN_LIMIT = Math.min(20, aoa.length - 1);

  for (let i = 0; i < SCAN_LIMIT; i++) {
    const row = aoa[i] ?? [];
    const nonBlank = row.filter((c) => !isBlankCell(c));
    if (nonBlank.length < 2) continue; // titles/blank rows are usually 0-1 cells wide

    const headerLikeCount = nonBlank.filter(looksLikeHeaderCell).length;
    const textRatio = headerLikeCount / nonBlank.length;
    if (textRatio < 0.6) continue; // reads like a data row, not labels

    const nextRow = aoa[i + 1] ?? [];
    const nextNonBlank = nextRow.filter((c) => !isBlankCell(c)).length;
    if (nextNonBlank === 0 || nextNonBlank < nonBlank.length * 0.5) continue; // no real table follows

    return i;
  }

  return 0; // no better candidate found — assume row 1 is the header, as before
}

/**
 * Unified parser for .xlsx, .xls, and .csv files using SheetJS.
 * All three formats share the same parse path — SheetJS normalises them.
 */
export const excelParser: IParser = {
  supportedMimeTypes: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel',                                           // .xls
    'text/csv',
    'text/plain',
    'application/csv',
  ],
  supportedExtensions: ['.xlsx', '.xls', '.csv'],

  parse(buffer: Buffer): ParseResult {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, dateNF: 'yyyy-mm-dd' });
    } catch {
      throw new ValidationError('Could not read file. Ensure it is a valid .xlsx or .csv file.');
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new ValidationError('The file contains no sheets.');

    const sheet = workbook.Sheets[sheetName];

    // Convert to array-of-arrays to get raw header row
    const aoa: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });

    if (aoa.length === 0) throw new ValidationError('The file is empty.');
    if (aoa.length === 1) throw new ValidationError('The file has a header row but no data rows.');

    const headerRowIndex = detectHeaderRowIndex(aoa);
    const rawHeaders = (aoa[headerRowIndex] as string[]).map((h) => String(h ?? '').trim());

    // Deduplicate blank/null headers — skip them
    const headers = rawHeaders.filter((h) => h.length > 0);

    if (headers.length === 0) throw new ValidationError('No column headers found.');

    // Maximum 10,000 data rows per import
    const MAX_ROWS = 10_000;
    const dataRows = aoa.slice(headerRowIndex + 1);

    if (dataRows.length > MAX_ROWS) {
      throw new ValidationError(
        `File contains ${dataRows.length} rows. Maximum allowed is ${MAX_ROWS} per import. Split the file and import in batches.`
      );
    }

    const rows: ParsedRow[] = [];

    dataRows.forEach((rowArr, idx) => {
      const row = rowArr as (string | number | Date | null | undefined)[];
      const data: Record<string, unknown> = {};
      let nonEmptyCount = 0;

      rawHeaders.forEach((header, colIdx) => {
        if (!header) return; // skip blank header columns
        const cell = row[colIdx];
        const value = cell instanceof Date
          ? cell.toISOString().slice(0, 10)   // YYYY-MM-DD
          : cell !== null && cell !== undefined
            // Wrapped/merged Excel cells often contain literal line breaks
            // (e.g. a multi-line address) — collapse them to spaces so a
            // single cell never silently becomes multiple garbled values.
            ? String(cell).replace(/\r\n|\r|\n/g, ' ').replace(/\s+/g, ' ').trim()
            : '';
        data[header] = value;
        if (value !== '') nonEmptyCount++;
      });

      // Skip empty rows, and near-empty ones (exactly one populated cell).
      // Report exports commonly stack a stray footnote/annotation row under
      // a real record — e.g. a lone "New" in the admission-number column on
      // its own row, marking the student above as newly admitted — which
      // isn't a second record at all. A genuine data row for a person
      // always carries more than one field, so a single stray cell is
      // reliably noise rather than a minimal-but-real row.
      if (nonEmptyCount > 1) {
        rows.push({ rowNumber: idx + 1, data });
      }
    });

    if (rows.length === 0) {
      throw new ValidationError('No data rows found after skipping empty rows.');
    }

    return { headers, rows, totalRows: rows.length };
  },
};
