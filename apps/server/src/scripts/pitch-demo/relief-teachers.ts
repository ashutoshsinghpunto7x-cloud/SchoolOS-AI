/**
 * Three activity teachers with free periods, so the substitute suggestions have
 * someone to recommend (the five subject specialists teach every period).
 * Additive and idempotent: it only creates what is missing in DEMO_SCHOOL.
 * They have no logins.
 */
import { Teacher } from '../../features/teachers/teacher.model';
import { Employee } from '../../features/employees/employee.model';
import { PeriodSlot } from '../../features/timetable/timetable.period.model';
import { TeacherTimetable } from '../../features/teacher-timetable/teacher-timetable.model';
import { StaffAttendanceRecord } from '../../features/staff-attendance/staff-attendance.model';
import { SCHOOL_ID, ACADEMIC_YEAR, SEEDER, utc, at, log } from './common';

// `classes` decides who ranks first as a class teacher. `dutyPeriods` (0-based,
// every day) gives each a different number of free periods: 4, 5 and 3.
const RELIEF_TEACHERS = [
  {
    fullName: 'Pooja Saxena', gender: 'female' as const, employeeId: 'FNIC-EMP-R01', phone: '9000000101',
    subject: 'Art & Craft', classes: ['6A', '6B'], duty: 'Activity Room Duty', dutyPeriods: [0, 3], salary: 8700,
  },
  {
    fullName: 'Imran Qureshi', gender: 'male' as const, employeeId: 'FNIC-EMP-R02', phone: '9000000102',
    subject: 'Physical Education', classes: ['7A', '7B'], duty: 'Sports Practice', dutyPeriods: [2], salary: 9200,
  },
  {
    fullName: 'Nandini Bose', gender: 'female' as const, employeeId: 'FNIC-EMP-R03', phone: '9000000103',
    subject: 'Computer Science', classes: ['8A', '6A'], duty: 'Computer Lab Duty', dutyPeriods: [1, 4, 5], salary: 9600,
  },
];

export async function addReliefTeachers(): Promise<void> {
  if (SCHOOL_ID !== 'DEMO_SCHOOL') throw new Error('Refusing to write to a non-demo tenant');

  const slots = await PeriodSlot.find({ schoolId: SCHOOL_ID, isDeleted: { $ne: true }, isBreak: false })
    .sort({ orderIndex: 1 }).lean();
  if (!slots.length) throw new Error('No demo period slots found — run seed:pitch-demo first');

  // Days on which the demo staff already have attendance, so history lines up.
  const attendanceDays: string[] = await StaffAttendanceRecord.distinct('date', { schoolId: SCHOOL_ID });

  let created = 0;
  for (const plan of RELIEF_TEACHERS) {
    if (await Teacher.exists({ schoolId: SCHOOL_ID, employeeId: plan.employeeId, isDeleted: false })) continue;

    const teacher = await Teacher.create({
      fullName: plan.fullName, gender: plan.gender, employeeId: plan.employeeId, phone: plan.phone,
      department: 'Academics', subjects: [plan.subject], assignedClasses: plan.classes,
      employmentStatus: 'active', schoolId: SCHOOL_ID, createdBy: SEEDER,
    });
    const employee = await Employee.create({
      fullName: plan.fullName, gender: plan.gender, employeeId: plan.employeeId, phone: plan.phone,
      address: 'Lucknow, Uttar Pradesh', designation: `Teacher — ${plan.subject}`, department: 'Academics',
      joiningDate: utc(2024, 6, 3), dateOfBirth: utc(1990, 5, 14), monthlySalary: plan.salary,
      employmentType: 'full_time', role: 'teacher', teacherId: teacher._id.toString(),
      status: 'active', schoolId: SCHOOL_ID, createdBy: SEEDER,
    });

    const entries = [1, 2, 3, 4, 5, 6].flatMap((dayOfWeek) =>
      plan.dutyPeriods
        .filter((i) => slots[i])
        .map((i) => ({ dayOfWeek, slotId: String(slots[i]._id), subjectName: plan.duty })));
    await TeacherTimetable.create({
      schoolId: SCHOOL_ID, teacherId: teacher._id.toString(), teacherName: plan.fullName,
      academicYear: ACADEMIC_YEAR, status: 'published', entries,
      createdBy: SEEDER, publishedAt: new Date(), publishedBy: SEEDER,
    });

    const history = attendanceDays.map((date) => {
      const day = new Date(`${date}T00:00:00`);
      return {
        employeeId: plan.employeeId, employeeObjectId: employee._id.toString(), schoolId: SCHOOL_ID,
        date, status: 'present',
        checkIn: { time: at(day, 8, 15), recordedBy: 'Front desk scanner', device: 'Gate-1' },
        checkOut: { time: at(day, 15, 40), recordedBy: 'Front desk scanner', device: 'Gate-1' },
        workingMinutes: 445,
      };
    });
    if (history.length) await StaffAttendanceRecord.insertMany(history, { ordered: false });
    created++;
  }
  log(`  relief teachers added: ${created} (already present: ${RELIEF_TEACHERS.length - created})`);
}
