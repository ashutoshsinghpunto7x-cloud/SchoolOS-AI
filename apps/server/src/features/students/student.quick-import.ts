import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { excelParser } from '../import/parsers/excel.parser';
import { createStudentSchema } from './student.validation';
import { studentService } from './student.service';
import { buildAuthContext } from '../../lib/auth-context';
import { sendSuccess } from '../../lib/response';
import { ValidationError } from '../../middlewares/errorHandler';

/**
 * Lightweight, single-request Excel/CSV import scoped to one class + section —
 * used by the teacher "Add Students" flow. Unlike the admin bulk-import module
 * (apps/server/src/features/import), there is no session/wizard: every row is
 * parsed, validated, and created in one pass, matching the teacher quick-add form.
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS = 500;

export const quickImportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter(_req, file, cb) {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'text/plain',
      'application/csv',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new ValidationError('Only .xlsx, .xls, and .csv files are allowed.'));
  },
}).single('file');

// ── Column matching ──────────────────────────────────────────────────────────

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const COLUMN_ALIASES: Record<string, string[]> = {
  rollNumber: ['rollnumber', 'rollno', 'roll'],
  fullName: ['fullname', 'name', 'studentname'],
  admissionNumber: ['admissionnumber', 'admissionno', 'admno'],
  dateOfBirth: ['dateofbirth', 'dob'],
  gender: ['gender', 'sex'],
  phone: ['phonenumber', 'phone', 'mobile', 'mobilenumber', 'contact', 'parentphone'],
};

function buildHeaderMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const header of headers) {
    const norm = normalize(header);
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.includes(norm) && !map[field]) {
        map[field] = header;
      }
    }
  }
  return map;
}

function normalizeGender(raw: string): 'male' | 'female' | 'other' | undefined {
  const v = raw.trim().toLowerCase();
  if (!v) return undefined;
  if (v.startsWith('m')) return 'male';
  if (v.startsWith('f')) return 'female';
  return 'other';
}

function normalizePhone(raw: string): string | undefined {
  const digits = raw.replace(/\D/g, '').slice(-10);
  return /^[6-9]\d{9}$/.test(digits) ? digits : undefined;
}

// ── Controller ────────────────────────────────────────────────────────────────

interface RowError {
  row: number;
  message: string;
}

export const studentQuickImportController = {
  // POST /students/quick-import (multipart: file, class, section)
  async run(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new ValidationError('No file uploaded. Send the file in a "file" form field.');

      const cls = typeof req.body.class === 'string' ? req.body.class.trim() : '';
      const section = typeof req.body.section === 'string' ? req.body.section.trim() : '';
      if (!cls) throw new ValidationError('Class is required.');
      if (!section) throw new ValidationError('Section is required.');

      const ctx = buildAuthContext(req.user!);
      const { headers, rows } = excelParser.parse(req.file.buffer, req.file.mimetype);

      if (rows.length > MAX_ROWS) {
        throw new ValidationError(`File contains ${rows.length} rows. Maximum allowed is ${MAX_ROWS} per import.`);
      }

      const headerMap = buildHeaderMap(headers);
      if (!headerMap.fullName) {
        throw new ValidationError('Could not find a "Full Name" column in the file.');
      }

      const errors: RowError[] = [];
      let created = 0;

      for (const row of rows) {
        const get = (field: string) =>
          headerMap[field] ? String(row.data[headerMap[field]] ?? '').trim() : '';

        const fullName = get('fullName');
        const rollNumber = get('rollNumber');
        const admissionNumber = get('admissionNumber');
        const dob = get('dateOfBirth');
        const genderRaw = get('gender');
        const phoneRaw = get('phone');

        if (!fullName) {
          errors.push({ row: row.rowNumber, message: 'Full Name is required' });
          continue;
        }

        const remarksParts: string[] = [];
        if (rollNumber) remarksParts.push(`Roll: ${rollNumber}`);
        if (admissionNumber) remarksParts.push(`Ref Adm No: ${admissionNumber}`);

        const payload = {
          fullName,
          class: cls,
          section,
          gender: normalizeGender(genderRaw),
          dateOfBirth: dob || undefined,
          parentPhone: phoneRaw ? normalizePhone(phoneRaw) : undefined,
          admissionStatus: 'active' as const,
          remarks: remarksParts.length ? remarksParts.join(' | ') : undefined,
        };

        const parsed = createStudentSchema.safeParse(payload);
        if (!parsed.success) {
          errors.push({ row: row.rowNumber, message: parsed.error.issues[0]?.message ?? 'Invalid row' });
          continue;
        }

        try {
          await studentService.createStudent(parsed.data, ctx);
          created += 1;
        } catch (err) {
          errors.push({ row: row.rowNumber, message: err instanceof Error ? err.message : 'Failed to create student' });
        }
      }

      sendSuccess(res, {
        totalRows: rows.length,
        created,
        failed: errors.length,
        errors: errors.slice(0, 50),
      }, `Imported ${created} of ${rows.length} students`);
    } catch (err) {
      next(err);
    }
  },
};
