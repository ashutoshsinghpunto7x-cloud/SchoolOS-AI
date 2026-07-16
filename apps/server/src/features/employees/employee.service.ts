import crypto from 'crypto';
import QRCode from 'qrcode';
import bcrypt from 'bcrypt';
import { employeeRepository, PaginatedEmployees, FindEmployeesOptions } from './employee.repository';
import {
  createEmployeeSchema, updateEmployeeSchema, listEmployeesSchema, createEmployeeLoginSchema,
} from './employee.validation';
import { IEmployee, EmployeeRole, IEmployeeQr } from './employee.model';
import { Teacher } from '../teachers/teacher.model';
import { teacherRepository } from '../teachers/teacher.repository';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { IUser } from '../users/user.model';
import { userRepository } from '../users/user.repository';
import { nextSequence } from '../../lib/counter.model';
import { employeeIdCounterKey, seedEmployeeIdSequence } from './employee-id.util';
import { env } from '../../config/env';

// Same bcrypt cost used for teacher-login provisioning (see teacher.service.ts)
// — reused rather than reinventing a separate constant.
const LOGIN_SALT_ROUNDS = 12;

// HR job-role → auth UserRole for the subset of employee roles that are
// actually login-capable. Anything not in this map cannot get a login account.
const LOGIN_CAPABLE_ROLES: Partial<Record<EmployeeRole, 'teacher' | 'principal' | 'accountant' | 'reception'>> = {
  teacher: 'teacher',
  principal: 'principal',
  accountant: 'accountant',
  receptionist: 'reception',
};

const QR_SIGNING_SECRET = process.env.QR_SIGNING_SECRET || env.JWT_ACCESS_SECRET;

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// The employee-employeeId counter is a separate sequence from the
// teacher-employeeId one (teachers can also be created directly via the
// Teacher feature, bypassing Employee entirely), so the two can independently
// produce the same "EMP-{year}-{seq}" string. Every employee that's a teacher
// also writes a linked Teacher record sharing this same ID, so a collision
// there is a real, not theoretical, duplicate-key failure. Guard against it
// by checking both collections and re-drawing from the counter until free,
// rather than trusting the counter alone.
const generateEmployeeId = async (schoolId: string): Promise<string> => {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const seq = await nextSequence(
      employeeIdCounterKey(schoolId, year),
      () => seedEmployeeIdSequence(schoolId, year)
    );
    const candidate = `EMP-${year}-${String(seq).padStart(4, '0')}`;

    const [employeeClash, teacherClash] = await Promise.all([
      employeeRepository.findByEmployeeId(candidate, schoolId),
      teacherRepository.findByEmployeeId(candidate, schoolId),
    ]);
    if (!employeeClash && !teacherClash) return candidate;
  }
  throw new ValidationError('Could not generate a unique employee ID — please try again.');
};

/** First token as firstName, remainder as lastName — User requires both, but an
 *  Employee record only has one fullName field. */
function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] || fullName;
  const lastName = parts.slice(1).join(' ') || 'Staff';
  return { firstName, lastName };
}

function signQrPayload(payload: Record<string, unknown>): string {
  const payloadStr = base64url(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', QR_SIGNING_SECRET).update(payloadStr).digest('hex');
  return `${payloadStr}.${signature}`;
}

function verifyQrSignature(token: string): { employeeUuid: string; employeeId: string; issuedAt: number } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadStr, signature] = parts;

  const expected = crypto.createHmac('sha256', QR_SIGNING_SECRET).update(payloadStr).digest('hex');

  const sigBuf = Buffer.from(signature, 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const decoded = Buffer.from(payloadStr, 'base64url').toString('utf8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

/** True for a Mongo/Mongoose duplicate-key error on the `employeeId` field
 *  specifically — used to self-heal by drawing a new ID and retrying, rather
 *  than failing outright, in case a stale/legacy index in the live database
 *  enforces uniqueness more broadly than our own pre-check can see (e.g. an
 *  old single-field unique index left over from before the current
 *  school-scoped, soft-delete-aware compound index was introduced). */
function isEmployeeIdDuplicateKeyError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err as { code?: number }).code === 11000 &&
    /employeeId/.test(err.message)
  );
}

export const employeeService = {
  async createEmployee(rawInput: unknown, ctx: AuthContext): Promise<IEmployee> {
    const data = createEmployeeSchema.parse(rawInput);

    const MAX_ID_RETRIES = 5;
    let employee: IEmployee | undefined;

    for (let attempt = 0; attempt < MAX_ID_RETRIES && !employee; attempt += 1) {
      const employeeId = await generateEmployeeId(ctx.schoolId);
      let teacherId: string | undefined;

      // If this employee is a teacher, mirror a linked Teacher record so the
      // rest of the app (timetable, salary, leave, etc. — all keyed on Teacher)
      // keeps working unchanged. Sequential create + cleanup, matching the rest
      // of this codebase (no multi-document Mongoose transactions used elsewhere).
      if (data.role === 'teacher') {
        try {
          const teacher = await teacherRepository.create({
            fullName: data.fullName,
            gender: data.gender,
            dateOfBirth: data.dateOfBirth,
            employeeId,
            phone: data.phone,
            alternatePhone: data.alternatePhone,
            email: data.email,
            address: data.address,
            department: data.department,
            subjects: [],
            assignedClasses: [],
            joiningDate: data.joiningDate,
            employmentStatus: 'active',
            tags: [],
            schoolId: ctx.schoolId,
            createdBy: ctx.displayName,
          });
          teacherId = teacher._id.toString();
        } catch (err) {
          if (isEmployeeIdDuplicateKeyError(err)) continue; // draw a new ID and retry
          throw new ValidationError(
            `Failed to create linked Teacher record for this employee: ${err instanceof Error ? err.message : 'unknown error'}`
          );
        }
      }

      try {
        employee = await employeeRepository.create({
          fullName: data.fullName,
          gender: data.gender,
          dateOfBirth: data.dateOfBirth,
          employeeId,
          phone: data.phone,
          alternatePhone: data.alternatePhone,
          email: data.email,
          address: data.address,
          designation: data.designation,
          department: data.department,
          joiningDate: data.joiningDate,
          monthlySalary: data.monthlySalary,
          employmentType: data.employmentType,
          role: data.role,
          status: data.status,
          teacherId,
          schoolId: ctx.schoolId,
          createdBy: ctx.displayName,
        });
      } catch (err) {
        // Orphan cleanup: the linked Teacher was created but the Employee write
        // failed — remove it rather than leaving a dangling Teacher record.
        if (teacherId) {
          await Teacher.deleteOne({ _id: teacherId, schoolId: ctx.schoolId }).catch(() => undefined);
        }
        if (isEmployeeIdDuplicateKeyError(err)) continue; // draw a new ID and retry
        throw err;
      }
    }

    if (!employee) {
      throw new ValidationError('Could not generate a unique employee ID after several attempts — please try again.');
    }

    const withQr = await employeeService.generateQrForEmployee(employee._id.toString(), ctx);

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'employee.created',
      resource: 'employees',
      resourceId: employee._id.toString(),
      details: { fullName: data.fullName, employeeId: employee.employeeId, role: data.role },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return withQr;
  },

  async listEmployees(rawQuery: unknown, ctx: AuthContext): Promise<PaginatedEmployees> {
    const opts = listEmployeesSchema.parse(rawQuery);
    const options: FindEmployeesOptions = {
      page: opts.page,
      limit: opts.limit,
      search: opts.search,
      department: opts.department,
      role: opts.role,
      status: opts.status,
      sortBy: opts.sortBy,
      sortOrder: opts.sortOrder,
    };
    return employeeRepository.findAll(ctx.schoolId, options);
  },

  async getEmployee(id: string, ctx: AuthContext): Promise<IEmployee> {
    const employee = await employeeRepository.findById(id, ctx.schoolId);
    if (!employee) throw new NotFoundError('Employee');
    return employee;
  },

  /** Used for teacher self-service checks (e.g. "is this my own attendance
   *  history?") — returns null rather than throwing when no linked Employee exists. */
  async getEmployeeByUserId(userId: string, schoolId: string): Promise<IEmployee | null> {
    return employeeRepository.findByUserId(userId, schoolId);
  },

  async updateEmployee(id: string, rawInput: unknown, ctx: AuthContext): Promise<IEmployee> {
    const data = updateEmployeeSchema.parse(rawInput);
    if (!Object.keys(data).length) throw new ValidationError('No fields to update');

    const employee = await employeeRepository.update(id, ctx.schoolId, {
      ...data,
      updatedBy: ctx.displayName,
    });
    if (!employee) throw new NotFoundError('Employee');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'employee.updated',
      resource: 'employees',
      resourceId: id,
      details: { fields: Object.keys(data) },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return employee;
  },

  async updatePhoto(id: string, dataUri: string, ctx: AuthContext): Promise<IEmployee> {
    const employee = await employeeRepository.updatePhoto(id, ctx.schoolId, dataUri, ctx.displayName);
    if (!employee) throw new NotFoundError('Employee');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'employee.updated', resource: 'employees', resourceId: id,
      details: { fields: ['photoUrl'] }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return employee;
  },

  async updateSignature(id: string, dataUri: string, ctx: AuthContext): Promise<IEmployee> {
    const employee = await employeeRepository.updateSignature(id, ctx.schoolId, dataUri, ctx.displayName);
    if (!employee) throw new NotFoundError('Employee');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'employee.updated', resource: 'employees', resourceId: id,
      details: { fields: ['signatureUrl'] }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return employee;
  },

  async deleteEmployee(id: string, ctx: AuthContext): Promise<void> {
    const employee = await employeeRepository.findById(id, ctx.schoolId);
    if (!employee) throw new NotFoundError('Employee');

    const deleted = await employeeRepository.softDelete(id, ctx.schoolId, ctx.displayName);
    if (!deleted) throw new NotFoundError('Employee');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'employee.deleted',
      resource: 'employees',
      resourceId: id,
      details: { fullName: employee.fullName, employeeId: employee.employeeId },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });
  },

  // ── QR ────────────────────────────────────────────────────────────────────

  async generateQrForEmployee(id: string, ctx: AuthContext): Promise<IEmployee> {
    const employee = await employeeRepository.findById(id, ctx.schoolId);
    if (!employee) throw new NotFoundError('Employee');

    // Only the three fields below — never salary or other PII — go into the token.
    const token = signQrPayload({
      employeeUuid: employee._id.toString(),
      employeeId: employee.employeeId,
      issuedAt: Date.now(),
    });

    const qr: IEmployeeQr = { token, issuedAt: new Date(), status: 'active' };
    const updated = await employeeRepository.setQr(id, ctx.schoolId, qr);
    if (!updated) throw new NotFoundError('Employee');

    return updated;
  },

  async regenerateQr(id: string, ctx: AuthContext): Promise<IEmployee> {
    const updated = await employeeService.generateQrForEmployee(id, ctx);

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'employee.qr_regenerated',
      resource: 'employees',
      resourceId: id,
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return updated;
  },

  async disableQr(id: string, ctx: AuthContext): Promise<IEmployee> {
    const employee = await employeeRepository.findById(id, ctx.schoolId);
    if (!employee) throw new NotFoundError('Employee');
    if (!employee.qr) throw new ValidationError('This employee has no QR code to disable');

    const updated = await employeeRepository.setQrStatus(id, ctx.schoolId, 'disabled');
    if (!updated) throw new NotFoundError('Employee');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'employee.qr_disabled',
      resource: 'employees',
      resourceId: id,
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return updated;
  },

  async getQrImage(id: string, ctx: AuthContext): Promise<{ dataUri: string; status: string; issuedAt: Date }> {
    const employee = await employeeRepository.findById(id, ctx.schoolId);
    if (!employee) throw new NotFoundError('Employee');
    if (!employee.qr) throw new NotFoundError('QR code');

    const dataUri = await QRCode.toDataURL(employee.qr.token);
    return { dataUri, status: employee.qr.status, issuedAt: employee.qr.issuedAt };
  },

  /** Re-derives the HMAC from the stored secret and compares with
   *  crypto.timingSafeEqual (never plain ===) to avoid timing attacks. Rejects
   *  on signature mismatch, missing employee, or a non-active qr.status. */
  async verifyQrToken(token: string, schoolId: string): Promise<IEmployee> {
    const decoded = verifyQrSignature(token);
    if (!decoded) throw new ValidationError('Invalid or tampered QR code');

    const employee = await employeeRepository.findById(decoded.employeeUuid, schoolId);
    if (!employee) throw new ValidationError('Invalid or inactive QR code');
    if (!employee.qr || employee.qr.token !== token || employee.qr.status !== 'active') {
      throw new ValidationError('Invalid or inactive QR code');
    }

    return employee;
  },

  // ── Login Provisioning ──────────────────────────────────────────────────────

  async createLogin(id: string, rawInput: unknown, ctx: AuthContext): Promise<{ employeeId: string; username: string }> {
    const { username, password } = createEmployeeLoginSchema.parse(rawInput);

    const employee = await employeeRepository.findById(id, ctx.schoolId);
    if (!employee) throw new NotFoundError('Employee');

    const authRole = LOGIN_CAPABLE_ROLES[employee.role];
    if (!authRole) {
      throw new ValidationError(`Employees with role "${employee.role}" cannot be issued a login account.`);
    }
    if (employee.userId) throw new ValidationError('This employee already has a login account.');
    if (!employee.email) {
      throw new ValidationError("Add an email to this employee's profile before creating a login.");
    }

    const existingUser = await userRepository.findByEmail(employee.email);
    if (existingUser) throw new ValidationError('This email already has login credentials.');

    const usernameTaken = await userRepository.findByUsername(username);
    if (usernameTaken) throw new ValidationError('That username is already taken.');

    const passwordHash = await bcrypt.hash(password, LOGIN_SALT_ROUNDS);
    const { firstName, lastName } = splitFullName(employee.fullName);

    const user: IUser = await userRepository.create({
      firstName,
      lastName,
      email: employee.email,
      username,
      passwordHash,
      role: authRole,
      schoolId: ctx.schoolId,
      createdBy: ctx.userId,
    });

    await employeeRepository.setUserId(id, ctx.schoolId, user._id.toString());

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'employee.login_created',
      resource: 'employees',
      resourceId: id,
      details: { username },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return { employeeId: id, username };
  },
};
