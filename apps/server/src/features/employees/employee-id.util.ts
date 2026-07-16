import { Teacher } from '../teachers/teacher.model';
import { Employee } from './employee.model';

/** Employees and teachers share one "EMP-{year}-{seq}" ID space (an Employee
 *  with role='teacher' writes a linked Teacher record using the same ID), so
 *  both generators must draw from the same counter — otherwise, as soon as
 *  either side has existing records, the other's fresh counter starts back at
 *  1 and walks straight into IDs the other side already took. */
export const employeeIdCounterKey = (schoolId: string, year: number): string => `employeeId:${schoolId}:${year}`;

/** Seeds the shared counter from the highest "EMP-{year}-{n}" suffix already
 *  in use across Teacher and Employee for this school/year, so a brand-new
 *  counter continues past existing records instead of restarting at 1 and
 *  colliding with them. Only consulted the first time the counter key is
 *  created (see nextSequence) — a plain read, safe to call on every miss. */
export async function seedEmployeeIdSequence(schoolId: string, year: number): Promise<number> {
  const prefix = `EMP-${year}-`;
  const regex = new RegExp(`^${prefix}(\\d+)$`);

  const [teacherDocs, employeeDocs] = await Promise.all([
    Teacher.find({ schoolId, employeeId: { $regex: regex } }, { employeeId: 1 }).lean<{ employeeId: string }[]>(),
    Employee.find({ schoolId, employeeId: { $regex: regex } }, { employeeId: 1 }).lean<{ employeeId: string }[]>(),
  ]);

  let max = 0;
  for (const doc of [...teacherDocs, ...employeeDocs]) {
    const match = regex.exec(doc.employeeId);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return max;
}
