import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { classNameKey } from '../lib/class-name';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * One-time backfill: unlike SyllabusChapter (normalized to classNameKey since
 * chapter.repository.ts's findOrCreate/findAll), Question.class and QuestionSource.class were
 * stored as whatever raw string the request happened to carry — so a question saved as class "II"
 * and one saved as class "2" for the exact same grade/chapter were invisible to each other: they
 * split into two separate rows on the Question Bank landing view (Question.findGroups groups by
 * the raw `class` field), a class-scoped paper/worksheet generation pool silently only saw
 * whichever half matched the request's spelling, and deleting one landing-page "chapter" row
 * (softDeleteByChapterGroups) only cleared its half, leaving the other behind. Discovered
 * 2026-09-03 live-testing the process-once extraction guard, where a cleanup script scoped to one
 * chapterId nearly deleted an unrelated class's legitimate questions that happened to share it.
 *
 * question.repository.ts / question-source.repository.ts now normalize `class` to classNameKey on
 * every write and read (see their comments) — this closes the gap for documents saved before that
 * fix. Idempotent — safe to re-run; a document whose class is already canonical is left untouched
 * (Mongo reports it as not modified, not as an error).
 */

async function backfill() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  for (const collectionName of ['questions', 'questionsources']) {
    const collection = mongoose.connection.db!.collection(collectionName);
    const docs = await collection.find({}, { projection: { class: 1 } }).toArray();

    let updated = 0;
    let alreadyCanonical = 0;
    for (const doc of docs) {
      if (typeof doc.class !== 'string') continue;
      const canonical = classNameKey(doc.class);
      if (canonical === doc.class) { alreadyCanonical += 1; continue; }
      await collection.updateOne({ _id: doc._id }, { $set: { class: canonical } });
      updated += 1;
    }

    console.log(`${collectionName}: ${docs.length} document(s) — ${updated} normalized, ${alreadyCanonical} already canonical.`);
  }

  await mongoose.disconnect();
}

backfill().catch((err) => { console.error(err); process.exit(1); });
