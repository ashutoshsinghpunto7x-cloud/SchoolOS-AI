import * as XLSX from 'xlsx';
import { IParser, ParseResult, ParsedRow } from './parser.interface';
import { ValidationError } from '../../../middlewares/errorHandler';

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

    const rawHeaders = (aoa[0] as string[]).map((h) => String(h ?? '').trim());

    // Deduplicate blank/null headers — skip them
    const headers = rawHeaders.filter((h) => h.length > 0);

    if (headers.length === 0) throw new ValidationError('No column headers found in the first row.');

    // Maximum 10,000 data rows per import
    const MAX_ROWS = 10_000;
    const dataRows = aoa.slice(1);

    if (dataRows.length > MAX_ROWS) {
      throw new ValidationError(
        `File contains ${dataRows.length} rows. Maximum allowed is ${MAX_ROWS} per import. Split the file and import in batches.`
      );
    }

    const rows: ParsedRow[] = [];

    dataRows.forEach((rowArr, idx) => {
      const row = rowArr as (string | number | Date | null | undefined)[];
      const data: Record<string, unknown> = {};
      let hasAnyValue = false;

      rawHeaders.forEach((header, colIdx) => {
        if (!header) return; // skip blank header columns
        const cell = row[colIdx];
        const value = cell instanceof Date
          ? cell.toISOString().slice(0, 10)   // YYYY-MM-DD
          : cell !== null && cell !== undefined
            ? String(cell).trim()
            : '';
        data[header] = value;
        if (value !== '') hasAnyValue = true;
      });

      // Skip completely empty rows
      if (hasAnyValue) {
        rows.push({ rowNumber: idx + 1, data });
      }
    });

    if (rows.length === 0) {
      throw new ValidationError('No data rows found after skipping empty rows.');
    }

    return { headers, rows, totalRows: rows.length };
  },
};
