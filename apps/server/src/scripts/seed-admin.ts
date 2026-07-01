import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function seedAdmin() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db!;
  const users = db.collection('users');

  const existing = await users.findOne({ email: 'admin@schoolos.com' });
  if (existing) {
    console.log('Admin user already exists. Login with admin@schoolos.com');
    await mongoose.disconnect();
    return;
  }

  const hash = await bcrypt.hash('Admin@123', 10);

  await users.insertOne({
    firstName:   'Admin',
    lastName:    'User',
    email:       'admin@schoolos.com',
    password:    hash,
    role:        'admin',
    status:      'active',
    schoolId:    'school_001',
    createdAt:   new Date(),
    updatedAt:   new Date(),
  });

  console.log('✓ Admin user created');
  console.log('  Email:    admin@schoolos.com');
  console.log('  Password: Admin@123');
  console.log('  Change your password after first login!');

  await mongoose.disconnect();
}

seedAdmin().catch((err) => { console.error(err); process.exit(1); });
