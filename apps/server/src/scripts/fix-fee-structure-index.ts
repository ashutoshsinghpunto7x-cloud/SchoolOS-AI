import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * One-time migration: FeeStructure's unique index used to be
 * {schoolId, class, feeHead, academicYear} — before the per-month fee
 * components feature added a `month` field and widened the index to
 * {schoolId, class, feeHead, academicYear, month}. Mongoose's autoIndex adds
 * the new index automatically but never drops the old one it no longer
 * recognizes, so the stale 4-field index kept blocking saving a second month
 * for the same class+feeHead (e.g. April Tuition, then May Tuition) with a
 * duplicate-key error — surfaced to the user as "school id already exists".
 */
async function fixIndex() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const collection = mongoose.connection.db!.collection('feestructures');

  const existingIndexes = await collection.indexes();
  console.log('Current indexes:', JSON.stringify(existingIndexes, null, 2));

  const staleIndex = existingIndexes.find((idx) => {
    const keys = Object.keys(idx.key);
    return idx.unique && keys.length === 4 &&
      keys.includes('schoolId') && keys.includes('class') &&
      keys.includes('feeHead') && keys.includes('academicYear') &&
      !keys.includes('month');
  });

  if (staleIndex?.name) {
    console.log(`Dropping stale 4-field unique index "${staleIndex.name}"...`);
    await collection.dropIndex(staleIndex.name);
    console.log('✓ Dropped');
  } else {
    console.log('No stale 4-field index found — nothing to drop.');
  }

  const hasNewIndex = existingIndexes.some((idx) => {
    const keys = Object.keys(idx.key);
    return idx.unique && keys.length === 5 && keys.includes('month');
  });

  if (!hasNewIndex) {
    console.log('Creating new 5-field unique index (schoolId, class, feeHead, academicYear, month)...');
    await collection.createIndex(
      { schoolId: 1, class: 1, feeHead: 1, academicYear: 1, month: 1 },
      { unique: true },
    );
    console.log('✓ New index created');
  } else {
    console.log('New 5-field index already present.');
  }

  await mongoose.disconnect();
}

fixIndex().catch((err) => { console.error(err); process.exit(1); });
