/**
 * Creates (or updates the password of) one internal Ops Center staff account.
 * Internal roles have no real school tenant, so schoolId is set to the
 * INTERNAL_SCHOOL_ID sentinel (see user.model.ts) rather than a real school.
 *
 * Run: npm run seed:ops-user -w apps/server -- --email owner@schoolos.ai --password Test@123 --role owner --firstName Ada --lastName Owner
 * (--role defaults to "owner"; must be one of owner/super_admin/devops/developer/support)
 */
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { User, UserRole, INTERNAL_SCHOOL_ID } from '../features/users/user.model';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SALT_ROUNDS = 12; // Matches auth.service.ts so bcrypt.compare() succeeds at login.
const OPS_ROLES: UserRole[] = ['owner', 'super_admin', 'devops', 'developer', 'support'];

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const value = argv[i + 1];
      if (value && !value.startsWith('--')) { args[key] = value; i++; }
    }
  }
  return args;
}

async function seedOpsUser() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  const args = parseArgs();
  const email = args.email;
  const password = args.password;
  const role = (args.role ?? 'owner') as UserRole;
  const firstName = args.firstName ?? 'Ops';
  const lastName = args.lastName ?? 'Admin';

  if (!email || !password) {
    console.error('Usage: --email <email> --password <password> [--role owner|super_admin|devops|developer|support] [--firstName X] [--lastName Y]');
    process.exit(1);
  }
  if (!OPS_ROLES.includes(role)) {
    console.error(`--role must be one of: ${OPS_ROLES.join(', ')}`);
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const existing = await User.findOne({ email });

  if (existing) {
    existing.passwordHash = passwordHash;
    existing.role = role;
    existing.schoolId = INTERNAL_SCHOOL_ID;
    existing.status = 'active';
    await existing.save();
    console.log(`✓ Updated existing ops user: ${email} (${role})`);
  } else {
    await User.create({
      firstName,
      lastName,
      email,
      passwordHash,
      role,
      schoolId: INTERNAL_SCHOOL_ID,
      status: 'active',
    });
    console.log(`✓ Created ops user: ${email} (${role})`);
  }

  await mongoose.disconnect();
}

seedOpsUser().catch((err) => { console.error(err); process.exit(1); });
