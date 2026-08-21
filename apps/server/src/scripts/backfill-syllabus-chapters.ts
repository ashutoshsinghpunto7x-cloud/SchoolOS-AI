import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * One-time backfill: QuestionSource.chapterName (set via "Save Chapter" or the
 * pending-uploads "Assign chapter" pencil) was never mirrored into the
 * SyllabusChapter collection — only createQuestion/confirmExtractedQuestions
 * did that. Since Teacher Planner reads exclusively from SyllabusChapter,
 * chapters teachers had already tagged/uploaded were invisible there
 * ("No saved chapters yet") even though the upload showed a chapter name.
 * question-bank.service.ts / question-extraction.service.ts now register the
 * chapter on every *new* chapter-name assignment; this script closes the gap
 * for uploads tagged before that fix. Idempotent — safe to re-run.
 */

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function backfill() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const sources = mongoose.connection.db!.collection('questionsources');
  const chapters = mongoose.connection.db!.collection('syllabuschapters');

  const tagged = await sources.find({ chapterName: { $exists: true, $ne: '' } }).toArray();
  console.log(`Found ${tagged.length} chapter-tagged upload(s).`);

  let created = 0;
  let skipped = 0;

  for (const s of tagged) {
    const schoolId = s.schoolId;
    const cls = s.class;
    const subject = s.subject;
    const nameKey = normalize(s.chapterName);

    const existingForClass = await chapters.find({ schoolId, class: cls, subject }).toArray();
    const alreadyThere = existingForClass.some((c) => normalize(c.chapterName) === nameKey);
    if (alreadyThere) { skipped += 1; continue; }

    await chapters.insertOne({
      schoolId,
      class: cls,
      subject,
      chapterName: s.chapterName.trim(),
      topics: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    created += 1;
  }

  console.log(`✓ Created ${created} SyllabusChapter record(s), skipped ${skipped} already-present chapter(s).`);
  await mongoose.disconnect();
}

backfill().catch((err) => { console.error(err); process.exit(1); });
