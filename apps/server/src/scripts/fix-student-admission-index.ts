import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * One-time migration: replaces the old global unique indexes on
 * Student.admissionNumber and Teacher.employeeId (which blocked reuse of
 * that value even when the conflicting record was soft-deleted) with
 * schoolId-scoped, `isDeleted: false`-partial unique indexes — the same
 * pattern Attendance already uses. Mongoose's autoIndex creates the new
 * indexes automatically, but never drops indexes it no longer recognizes,
 * so the stale global indexes have to be dropped explicitly here.
 */

interface FieldSpec {
  collection: string;
  field: string;
}

const TARGETS: FieldSpec[] = [
  { collection: 'students', field: 'admissionNumber' },
  { collection: 'teachers', field: 'employeeId' },
];

async function fixIndexes() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  let hadBlockingDuplicates = false;

  for (const { collection: collectionName, field } of TARGETS) {
    console.log(`\n── ${collectionName}.${field} ──`);
    const collection = mongoose.connection.db!.collection(collectionName);

    const existingIndexes = await collection.indexes();
    const staleIndex = existingIndexes.find(
      (idx) => idx.key && Object.keys(idx.key).length === 1 && idx.key[field] === 1 && idx.unique,
    );

    if (staleIndex?.name) {
      console.log(`Dropping stale global unique index "${staleIndex.name}"...`);
      await collection.dropIndex(staleIndex.name);
      console.log('✓ Dropped');
    } else {
      console.log('No stale global index found — nothing to drop.');
    }

    // Surface any pre-existing collisions before creating the new index,
    // since a duplicate active value in current data would make it fail.
    const duplicates = await collection.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: { schoolId: '$schoolId', value: `$${field}` }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]).toArray();

    if (duplicates.length > 0) {
      hadBlockingDuplicates = true;
      console.error(`✗ Found ${duplicates.length} ${field} value(s) shared by multiple active ${collectionName} — resolve these before the new index can be created:`);
      for (const d of duplicates) console.error(`  ${JSON.stringify(d._id)} — ${d.count} records`);
      continue;
    }

    console.log('Creating new schoolId-scoped, isDeleted:false-partial unique index...');
    await collection.createIndex(
      { schoolId: 1, [field]: 1 },
      { unique: true, partialFilterExpression: { isDeleted: false } },
    );
    console.log('✓ New index created');
  }

  await mongoose.disconnect();
  if (hadBlockingDuplicates) process.exit(1);
}

fixIndexes().catch((err) => { console.error(err); process.exit(1); });
