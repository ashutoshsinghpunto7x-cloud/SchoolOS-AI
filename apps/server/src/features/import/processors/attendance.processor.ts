import { AuthContext } from '../../../lib/auth-context';
import { studentRepository } from '../../students/student.repository';
import { attendanceRepository } from '../../attendance/attendance.repository';
import { AttendanceStatus } from '../../attendance/attendance.model';
import { IProcessor, ProcessRowResult, DuplicateAction } from './processor.interface';
import { logger } from '../../../lib/logger';

// Historical backfill only — bypasses the live class-teacher-authorization and
// future-date checks that apply to day-of attendance marking, since this
// imports past records by an admin, not a teacher marking today's class.
export const attendanceProcessor: IProcessor = {
  importType: 'attendance',

  async findDuplicate(cleanData: Record<string, unknown>, schoolId: string): Promise<string | undefined> {
    const admissionNumber = String(cleanData.admissionNumber ?? '').trim();
    const date = String(cleanData.date ?? '');
    if (!admissionNumber || !date) return undefined;
    const student = await studentRepository.findByAdmissionNumber(admissionNumber, schoolId);
    if (!student) return undefined;
    const existing = await attendanceRepository.findByStudentAndDate(schoolId, student._id.toString(), date);
    return existing ? existing._id.toString() : undefined;
  },

  async processRow(cleanData: Record<string, unknown>, ctx: AuthContext, duplicateAction: DuplicateAction = 'update'): Promise<ProcessRowResult> {
    try {
      const admissionNumber = String(cleanData.admissionNumber ?? '').trim();
      const student = await studentRepository.findByAdmissionNumber(admissionNumber, ctx.schoolId);
      if (!student) {
        return { success: false, error: `No student found with Admission Number "${admissionNumber}"` };
      }

      const studentId = student._id.toString();
      const date = String(cleanData.date);

      // Same (schoolId, studentId, date) key attendanceRepository.upsert relies
      // on — checked first purely to know whether this row is updating a
      // pre-existing record, so it's excluded from the session's rollback list.
      const existing = await attendanceRepository.findByStudentAndDate(ctx.schoolId, studentId, date);

      if (existing && duplicateAction === 'skip') {
        return { success: true, recordId: existing._id.toString(), isUpdate: true, skipped: true };
      }

      const saved = await attendanceRepository.upsert({
        studentId,
        schoolId: ctx.schoolId,
        class: String(cleanData.class),
        section: String(cleanData.section),
        date,
        status: cleanData.status as AttendanceStatus,
        note: typeof cleanData.note === 'string' && cleanData.note ? cleanData.note : undefined,
        markedById: ctx.userId,
        markedByName: ctx.displayName,
        markedAt: new Date(),
      });

      return { success: true, recordId: saved._id.toString(), isUpdate: !!existing };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import attendance record';
      logger.warn('Attendance import row failed', { error: message });
      return { success: false, error: message };
    }
  },

  async rollbackRow(recordId: string, ctx: AuthContext): Promise<void> {
    try {
      await attendanceRepository.softDelete(recordId, ctx.schoolId, ctx.displayName);
    } catch (err) {
      logger.warn('Attendance rollback failed for record', { recordId, error: String(err) });
    }
  },
};
