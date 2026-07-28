import { Request, Response, NextFunction } from 'express';
import { marksService } from './marks.service';
import { marksExtractionService } from './marks-extraction.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';
import { fileToDataUri } from '../../lib/image-upload';
import { ValidationError } from '../../middlewares/errorHandler';

export const marksController = {
  /** POST /marks — save/edit a single student's marks (draft) */
  async upsertSingle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const record = await marksService.upsertSingle(req.body, ctx);
      sendCreated(res, record, 'Marks saved');
    } catch (err) { next(err); }
  },

  /** POST /marks/bulk — save/edit a class's marks in one call */
  async bulkUpsert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx     = buildAuthContext(req.user!);
      const records = await marksService.bulkUpsert(req.body, ctx);
      sendCreated(res, records, `${records.length} marks records saved`);
    } catch (err) { next(err); }
  },

  /** GET /marks/entry-table — roster merged with existing marks, for the editable grid */
  async getEntryTable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await marksService.getEntryTable(req.query, ctx);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },

  /** GET /marks/summary — KPI strip counts */
  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx     = buildAuthContext(req.user!);
      const summary = await marksService.getSummary(req.query, ctx);
      sendSuccess(res, summary);
    } catch (err) { next(err); }
  },

  /** GET /marks — list with filters */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await marksService.listAll(req.query, ctx);
      sendPaginated(res, result.records, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  /** GET /marks/:id */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const record = await marksService.getById(req.params.id, ctx);
      sendSuccess(res, record);
    } catch (err) { next(err); }
  },

  /** POST /marks/submit — teacher submits a class+subject+exam batch for review */
  async submitForReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await marksService.submitForReview(req.body, ctx);
      sendSuccess(res, result, `${result.updated} record(s) submitted for review`);
    } catch (err) { next(err); }
  },

  /** POST /marks/approve */
  async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await marksService.approve(req.body, ctx);
      sendSuccess(res, result, `${result.updated} record(s) approved`);
    } catch (err) { next(err); }
  },

  /** POST /marks/request-correction */
  async requestCorrection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await marksService.requestCorrection(req.body, ctx);
      sendSuccess(res, result, `${result.updated} record(s) sent back for correction`);
    } catch (err) { next(err); }
  },

  /** POST /marks/publish */
  async publish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await marksService.publish(req.body, ctx);
      sendSuccess(res, result, `${result.updated} record(s) published`);
    } catch (err) { next(err); }
  },

  /** POST /marks/lock */
  async lock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await marksService.lock(req.body, ctx);
      sendSuccess(res, result, `${result.updated} record(s) locked`);
    } catch (err) { next(err); }
  },

  /** POST /marks/extract/image — kicks off AI reading of a marks-sheet photo in the
   *  background (Whisper/GPT can take several seconds) and returns a job id
   *  immediately; the client polls GET /marks/extract/jobs/:id for the result. */
  async extractFromImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new ValidationError('An image file is required');
      const ctx    = buildAuthContext(req.user!);
      const job    = await marksExtractionService.enqueueExtractFromImage(req.query, fileToDataUri(req.file), ctx);
      sendCreated(res, job, 'Reading the photo…');
    } catch (err) { next(err); }
  },

  /** POST /marks/extract/voice — same as extractFromImage, for a voice note
   *  (Whisper transcription + GPT can take up to ~60s — always backgrounded). */
  async extractFromVoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new ValidationError('An audio file is required');
      const ctx = buildAuthContext(req.user!);
      const job = await marksExtractionService.enqueueExtractFromVoice(
        req.query,
        { buffer: req.file.buffer, mimetype: req.file.mimetype, filename: req.file.originalname || 'voice-note.webm' },
        ctx,
      );
      sendCreated(res, job, 'Listening to the recording…');
    } catch (err) { next(err); }
  },

  /** GET /marks/extract/jobs/:id — poll for the result of a background extraction job */
  async getExtractionJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const job = await marksExtractionService.getExtractionJob(req.params.id, ctx);
      sendSuccess(res, job);
    } catch (err) { next(err); }
  },

  /** POST /marks/extract/transcript — AI reads marks from an already-transcribed dictation (does not save) */
  async extractFromTranscript(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const transcript = typeof req.body?.transcript === 'string' ? req.body.transcript : '';
      if (!transcript.trim()) throw new ValidationError('A transcript is required');
      const ctx    = buildAuthContext(req.user!);
      const result = await marksExtractionService.extractFromTranscript(req.query, transcript, ctx);
      sendSuccess(res, result, `${result.extracted.length} student(s) read from the dictation`);
    } catch (err) { next(err); }
  },

  /** POST /marks/reopen */
  async reopen(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await marksService.reopen(req.body, ctx);
      sendSuccess(res, result, `${result.updated} record(s) reopened`);
    } catch (err) { next(err); }
  },
};
