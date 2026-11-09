import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { BoardPaper } from '../features/question-bank/board-library.model';
import { classNameKey } from '../lib/class-name';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Loads hand-transcribed previous-year board papers from apps/server/data/board-papers/*.json
 * into the shared BoardPaper collection. Upserts on board+class+subject+year, so re-running
 * after fixing a typo in a JSON file simply replaces that paper's questions.
 *
 *   npm run import:board-papers -w apps/server            # import everything
 *   npm run import:board-papers -w apps/server -- --dry   # validate only, no DB writes
 */
const DATA_DIR = path.resolve(__dirname, '../../data/board-papers');
const VALID_TYPES = new Set([
  'mcq', 'fill_blank', 'true_false', 'assertion_reason', 'very_short', 'short', 'long', 'hots', 'case_study',
  'multi_correct', 'match_following', 'one_word', 'competency_based', 'application_based', 'activity_based',
  'observation_based', 'diagram_based', 'picture_based', 'label_diagram', 'complete_diagram', 'numerical',
  'word_problem', 'oral', 'revision', 'sequence_arrangement', 'odd_one_out', 'passage_based',
]);

interface PaperFile {
  board: string; class: string; subject: string; year: number; paperCode?: string;
  language?: 'en' | 'hi' | 'bilingual';
  questions: { section: string; number: string; questionText: string; questionType: string; options?: string[]; marks: number }[];
}

function validate(file: string, p: PaperFile): string[] {
  const errs: string[] = [];
  for (const k of ['board', 'class', 'subject', 'year'] as const) if (!p[k]) errs.push(`${file}: missing ${k}`);
  p.questions.forEach((q, i) => {
    const tag = `${file} q#${i + 1} (${q.number})`;
    if (!q.questionText?.trim()) errs.push(`${tag}: empty questionText`);
    if (!VALID_TYPES.has(q.questionType)) errs.push(`${tag}: bad questionType "${q.questionType}"`);
    if (typeof q.marks !== 'number') errs.push(`${tag}: marks must be a number`);
    if (q.questionType === 'mcq' && (!q.options || q.options.length < 2)) errs.push(`${tag}: mcq needs options`);
  });
  return errs;
}

async function main(): Promise<void> {
  const dry = process.argv.includes('--dry');
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
  if (files.length === 0) { console.log('No JSON files in', DATA_DIR); return; }

  const papers: PaperFile[] = [];
  const errors: string[] = [];
  for (const f of files) {
    const p = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')) as PaperFile;
    errors.push(...validate(f, p));
    papers.push(p);
  }
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; return; }
  papers.forEach((p) => console.log(`${p.board} ${p.class} ${p.subject} ${p.year}: ${p.questions.length} questions`));
  if (dry) { console.log('Dry run — nothing written.'); return; }

  await mongoose.connect(process.env.MONGODB_URI as string);
  for (const p of papers) {
    await BoardPaper.updateOne(
      { board: p.board, class: classNameKey(p.class), subject: p.subject, year: p.year },
      { $set: { paperCode: p.paperCode, language: p.language ?? 'bilingual', questions: p.questions } },
      { upsert: true },
    );
  }
  console.log(`Imported ${papers.length} paper(s).`);
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
