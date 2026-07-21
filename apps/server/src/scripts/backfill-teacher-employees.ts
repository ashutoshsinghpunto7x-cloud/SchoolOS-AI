import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * One-time backfill: teachers created directly through the Teachers workspace
 * (as opposed to via HR Management > Add Employee) never got a linked
 * Employee record — Employee.create was only ever called from
 * employee.service.ts. Since HR Management > Employees (and payroll,
 * HR-side attendance) reads exclusively from the Employee collection, those
 * teachers were invisible there. teacher.service.ts now mirrors an Employee
 * record on every *new* teacher creation; this script closes the gap for
 * teachers that already existed before that fix. Idempotent — safe to re-run,
 * skips any teacher that already has a linked Employee.
 */

async function backfill() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const teachers = mongoose.connection.db!.collection('teachers');
  const employees = mongoose.connection.db!.collection('employees');

  const allTeachers = await teachers.find({ isDeleted: { $ne: true } }).toArray();
  console.log(`Found ${allTeachers.length} active teacher(s).`);

  let created = 0;
  let skipped = 0;

  for (const t of allTeachers) {
    const existing = await employees.findOne({
      schoolId: t.schoolId,
      $or: [{ teacherId: t._id.toString() }, { employeeId: t.employeeId }],
      isDeleted: { $ne: true },
    });
    if (existing) { skipped += 1; continue; }

    await employees.insertOne({
      fullName: t.fullName,
      gender: t.gender,
      dateOfBirth: t.dateOfBirth,
      employeeId: t.employeeId,
      phone: t.phone,
      alternatePhone: t.alternatePhone,
      email: t.email,
      address: t.address,
      designation: 'Teacher',
      department: t.department,
      joiningDate: t.joiningDate,
      role: 'teacher',
      status: t.employmentStatus === 'active' ? 'active' : 'inactive',
      teacherId: t._id.toString(),
      schoolId: t.schoolId,
      createdBy: 'backfill-teacher-employees',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    created += 1;
  }

  console.log(`✓ Created ${created} Employee record(s), skipped ${skipped} already-linked teacher(s).`);
  await mongoose.disconnect();
}

backfill().catch((err) => { console.error(err); process.exit(1); });
