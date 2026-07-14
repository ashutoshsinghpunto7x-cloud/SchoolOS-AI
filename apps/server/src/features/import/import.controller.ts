import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { buildAuthContext } from '../../lib/auth-context';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { ValidationError } from '../../middlewares/errorHandler';
import { importService } from './import.service';
import { ImportType } from './import-session.model';

// ── Multer — in-memory file storage ──────────────────────────────────────────

const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'text/plain',
  'application/csv',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ValidationError('Only .xlsx, .xls, and .csv files are allowed.'));
    }
  },
}).single('file');

// ── Controller ────────────────────────────────────────────────────────────────

export const importController = {
  // POST /import/sessions  (multipart/form-data: file + importType)
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new ValidationError('No file uploaded. Send the file in a "file" form field.');
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const session = await importService.upload(req.body, req.file, ctx);
      sendCreated(res, session, 'File uploaded and validated');
    } catch (err) {
      next(err);
    }
  },

  // GET /import/sessions
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const result = await importService.list(req.query, ctx);
      sendPaginated(res, result.data, result.meta);
    } catch (err) {
      next(err);
    }
  },

  // GET /import/sessions/:id
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const session = await importService.getById(req.params.id, ctx);
      sendSuccess(res, session);
    } catch (err) {
      next(err);
    }
  },

  // GET /import/sessions/:id/rows
  async getRows(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const result = await importService.getRows(req.params.id, req.query, ctx);
      sendPaginated(res, result.data, result.meta);
    } catch (err) {
      next(err);
    }
  },

  // PATCH /import/sessions/:id/mapping
  async updateMapping(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const session = await importService.updateMapping(req.params.id, req.body, ctx);
      sendSuccess(res, session, 'Column mapping updated');
    } catch (err) {
      next(err);
    }
  },

  // GET /import/sessions/:id/errors/download
  async downloadErrors(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const { filename, csv } = await importService.exportErrors(req.params.id, ctx);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  },

  // PATCH /import/sessions/:id/duplicates
  async setDuplicateStrategy(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const session = await importService.setDuplicateStrategy(req.params.id, req.body, ctx);
      sendSuccess(res, session, 'Duplicate strategy updated');
    } catch (err) {
      next(err);
    }
  },

  // POST /import/sessions/:id/ai-map
  async aiMap(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const suggestions = await importService.suggestAIMapping(req.params.id, ctx);
      sendSuccess(res, suggestions);
    } catch (err) {
      next(err);
    }
  },

  // POST /import/sessions/:id/confirm
  async confirm(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const session = await importService.confirm(req.params.id, ctx);
      sendSuccess(res, session, 'Import started');
    } catch (err) {
      next(err);
    }
  },

  // POST /import/sessions/:id/cancel
  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const session = await importService.cancel(req.params.id, ctx);
      sendSuccess(res, session, 'Import cancelled');
    } catch (err) {
      next(err);
    }
  },

  // POST /import/sessions/:id/rollback
  async rollback(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const session = await importService.rollback(req.params.id, ctx);
      sendSuccess(res, session, 'Rollback started');
    } catch (err) {
      next(err);
    }
  },

  // POST /import/sessions/:id/save-mapping-template
  async saveMappingTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const template = await importService.saveMappingTemplate(req.params.id, req.body, ctx);
      sendCreated(res, template, 'Mapping template saved');
    } catch (err) {
      next(err);
    }
  },

  // GET /import/mapping-templates
  async listMappingTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const templates = await importService.listMappingTemplates(req.query, ctx);
      sendSuccess(res, templates);
    } catch (err) {
      next(err);
    }
  },

  // DELETE /import/mapping-templates/:id
  async deleteMappingTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      await importService.deleteMappingTemplate(req.params.id, ctx);
      sendSuccess(res, null, 'Mapping template deleted');
    } catch (err) {
      next(err);
    }
  },

  // GET /import/templates
  async listTemplates(_req: Request, res: Response, next: NextFunction) {
    try {
      const templates = importService.listTemplates();
      sendSuccess(res, templates);
    } catch (err) {
      next(err);
    }
  },

  // GET /import/templates/:type/download
  async downloadTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const importType = req.params.type as ImportType;
      const buffer = importService.generateTemplate(importType);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${importType}-template.xlsx"`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  },
};
