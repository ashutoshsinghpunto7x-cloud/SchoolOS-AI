import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * One-time cleanup: the school ended up with the same class under multiple
 * spellings (numeric "2" vs Roman "II", "NURSERY" vs "Nursery", "Prepatory"
 * typo vs "Preparatory"), because student/fee/timetable creation never
 * validated against the SchoolClass catalog — each feature just stored
 * whatever string was typed. This script canonicalizes every class/section
 * string school-wide onto one spelling per class (Roman numerals for
 * numbered classes, proper spelling for the rest), then reconciles the
 * SchoolClass catalog itself. No student/fee/attendance/mark documents are
 * deleted — only their `class`/`section` string fields are rewritten.
 *
 * Also removes 16 duplicate fee records (2 students, ~1 per month) created
 * by a since-fixed generation bug that produced two rows per month with
 * due dates 18.5 hours apart — soft-deleted, not hard-deleted.
 *
 * Idempotent: safe to re-run — every step only touches records that still
 * have an old-form value.
 */

const CLASS_RENAME: Record<string, string> = {
  '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V', '6': 'VI', '7': 'VII', '9': 'IX',
  NURSERY: 'Nursery',
  NUR: 'Nursery',
  Prepatory: 'Preparatory',
};

const schoolId = 'school_001';

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB\n');
  const db = mongoose.connection.db!;

  // ── 1. Rewrite class/section strings across every data collection ──────────
  const collectionsWithClass = [
    'students', 'feerecords', 'timetables', 'timetablesubstitutes',
    'classteacherassignments', 'attendances', 'behaviorrecords', 'marks',
    'feediscountrequests',
  ];

  for (const coll of collectionsWithClass) {
    for (const [from, to] of Object.entries(CLASS_RENAME)) {
      const res = await db.collection(coll).updateMany(
        { schoolId, class: from },
        { $set: { class: to } },
      );
      if (res.modifiedCount > 0) console.log(`${coll}: ${res.modifiedCount} doc(s) class "${from}" -> "${to}"`);
    }
  }

  // feestructures uses `class` as its own id-ish field (per earlier inspection: _id grouping was on $class)
  for (const [from, to] of Object.entries(CLASS_RENAME)) {
    const res = await db.collection('feestructures').updateMany(
      { schoolId, class: from },
      { $set: { class: to } },
    );
    if (res.modifiedCount > 0) console.log(`feestructures: ${res.modifiedCount} doc(s) class "${from}" -> "${to}"`);
  }

  // teachers.assignedClasses stores combined "2a" style strings (lowercase class+section, no separator)
  const teachers = await db.collection('teachers').find({ schoolId, assignedClasses: { $exists: true, $ne: [] } }).toArray();
  for (const t of teachers) {
    const remapped: string[] = (t.assignedClasses as string[]).map((entry) => {
      const m = /^(\d+)([A-Za-z]+)$/.exec(entry);
      if (!m) return entry;
      const [, num, section] = m;
      const roman = CLASS_RENAME[num];
      return roman ? `${roman}${section}` : entry;
    });
    if (JSON.stringify(remapped) !== JSON.stringify(t.assignedClasses)) {
      await db.collection('teachers').updateOne({ _id: t._id }, { $set: { assignedClasses: remapped } });
      console.log(`teachers: ${t.fullName} assignedClasses ${JSON.stringify(t.assignedClasses)} -> ${JSON.stringify(remapped)}`);
    }
  }

  // ── 2. Reconcile SchoolClass catalog ────────────────────────────────────────
  const classes = await db.collection('schoolclasses');

  // NURSERY -> Nursery: simple rename, no competing doc.
  const nurseryDoc = await classes.findOne({ schoolId, name: 'NURSERY' });
  if (nurseryDoc) {
    await classes.updateOne({ _id: nurseryDoc._id }, { $set: { name: 'Nursery' } });
    console.log('schoolclasses: renamed "NURSERY" -> "Nursery"');
  }

  // Prepatory (has sections) -> merge into Preparatory (currently empty sections), delete old doc.
  const prepatoryDoc = await classes.findOne({ schoolId, name: 'Prepatory' });
  const preparatoryDoc = await classes.findOne({ schoolId, name: 'Preparatory' });
  if (prepatoryDoc && preparatoryDoc) {
    const mergedSections = Array.from(new Set([...(preparatoryDoc.sections ?? []), ...(prepatoryDoc.sections ?? [])]));
    await classes.updateOne({ _id: preparatoryDoc._id }, { $set: { sections: mergedSections } });
    await classes.deleteOne({ _id: prepatoryDoc._id });
    console.log(`schoolclasses: merged "Prepatory" sections ${JSON.stringify(prepatoryDoc.sections)} into "Preparatory" (now ${JSON.stringify(mergedSections)}), removed duplicate catalog entry`);
  }

  // I/II/III/V: add missing "B" section where the numeric data had one and the Roman catalog doc didn't.
  const numericSectionsBySchool: Record<string, string[]> = {
    I: ['A', 'B'], II: ['A', 'B'], III: ['A', 'B'], V: ['A', 'B'],
  };
  for (const [name, wantSections] of Object.entries(numericSectionsBySchool)) {
    const doc = await classes.findOne({ schoolId, name });
    if (!doc) continue;
    const merged = Array.from(new Set([...(doc.sections ?? []), ...wantSections]));
    if (merged.length !== (doc.sections ?? []).length) {
      await classes.updateOne({ _id: doc._id }, { $set: { sections: merged } });
      console.log(`schoolclasses: "${name}" sections ${JSON.stringify(doc.sections)} -> ${JSON.stringify(merged)}`);
    }
  }

  // VI/VII/IX: no catalog entry existed at all for these (orphaned numeric data) — create them.
  for (const name of ['VI', 'VII', 'IX']) {
    const exists = await classes.findOne({ schoolId, name });
    if (!exists) {
      await classes.insertOne({ schoolId, name, sections: ['A'], createdAt: new Date(), updatedAt: new Date() });
      console.log(`schoolclasses: created missing catalog entry "${name}" (section A)`);
    }
  }

  // ── 3. Drop the stray "Mont" class-teacher-assignment (abbreviation typo, superseded by the real "Montessori" assignment) ──
  const strayMont = await db.collection('classteacherassignments').findOne({ schoolId, class: 'Mont' });
  if (strayMont) {
    await db.collection('classteacherassignments').deleteOne({ _id: strayMont._id });
    console.log(`classteacherassignments: removed stray "Mont"/"${strayMont.section}" entry (teacher: ${strayMont.teacherName}) — superseded by the "Montessori" assignment`);
  }

  // ── 4. Soft-delete the 16 duplicate fee records (dueDate T18:30:00.000Z twin of a T00:00:00.000Z original) ──
  const dupGroups = await db.collection('feerecords').aggregate([
    { $match: { schoolId } },
    { $group: {
        _id: { studentId: '$studentId', feeHead: '$feeHead', month: '$month', totalAmount: '$totalAmount', academicYear: '$academicYear' },
        count: { $sum: 1 },
        docs: { $push: { id: '$_id', dueDate: '$dueDate' } },
      } },
    { $match: { count: { $gt: 1 } } },
  ]).toArray();

  let removedDupes = 0;
  for (const g of dupGroups) {
    for (const d of g.docs) {
      const dueDate = new Date(d.dueDate);
      if (dueDate.getUTCHours() === 18 && dueDate.getUTCMinutes() === 30) {
        await db.collection('feerecords').updateOne(
          { _id: d.id },
          { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: 'migrate-canonicalize-classes (duplicate cleanup)' } },
        );
        removedDupes += 1;
      }
    }
  }
  console.log(`\nfeerecords: soft-deleted ${removedDupes} duplicate record(s) (kept the T00:00:00Z original in each pair)`);

  console.log('\nDone.');
  await mongoose.disconnect();
}

run().catch((err) => { console.error(err); process.exit(1); });
