import bcrypt from 'bcrypt';
import { userRepository, FindUsersOptions, PaginatedUsers } from './user.repository';
import { studentRepository } from '../students/student.repository';
import {
  createUserSchema,
  updateUserSchema,
  statusChangeSchema,
  bulkCreateParentsSchema,
} from './user.validation';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { IUser, UserRole } from './user.model';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import {
  ROLE_PERMISSIONS,
  ROLE_META,
  PERMISSION_META,
  Permission,
} from '../../lib/permissions';

const SALT_ROUNDS = 12;
const GENERATED_EMAIL_DOMAIN = 'parents.schoolos.local';

export interface BulkCreateParentsResult {
  created: {
    studentId: string;
    studentName: string;
    email: string;
    username: string;
  }[];
  skipped: {
    studentId: string;
    studentName: string;
    reason: string;
  }[];
  password: string;
}

/** Lowercases and strips everything but letters/digits/dots/hyphens, so it's
 *  safe to use as the local-part of a generated login email or a username. */
const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

export const userService = {
  async listUsers(schoolId: string, options: FindUsersOptions = {}): Promise<PaginatedUsers> {
    return userRepository.findAll(schoolId, options);
  },

  async getUser(id: string, schoolId: string): Promise<IUser> {
    const user = await userRepository.findById(id, schoolId);
    if (!user) throw new NotFoundError('User');
    return user;
  },

  async createUser(rawInput: unknown, ctx: AuthContext): Promise<IUser> {
    const data = createUserSchema.parse(rawInput);

    const existing = await userRepository.findByEmail(data.email);
    if (existing) throw new ValidationError('A user with this email already exists');

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    const user = await userRepository.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      passwordHash,
      role: data.role,
      linkedStudentIds: data.linkedStudentIds,
      schoolId: ctx.schoolId,
      createdBy: ctx.userId,
    });

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'user.created',
      resource: 'users',
      resourceId: user._id.toString(),
      details: { email: data.email, role: data.role },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return user;
  },

  async updateUser(id: string, rawInput: unknown, ctx: AuthContext): Promise<IUser> {
    const data = updateUserSchema.parse(rawInput);

    const updateData: Partial<IUser> & { password?: string } = { ...data };
    delete updateData.password;

    if (data.password) {
      (updateData as Record<string, unknown>).passwordHash = await bcrypt.hash(
        data.password,
        SALT_ROUNDS
      );
    }

    updateData.updatedBy = ctx.userId;

    const user = await userRepository.update(id, ctx.schoolId, updateData);
    if (!user) throw new NotFoundError('User');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'user.updated',
      resource: 'users',
      resourceId: id,
      details: { fields: Object.keys(data) },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return user;
  },

  async changeStatus(id: string, rawInput: unknown, ctx: AuthContext): Promise<IUser> {
    if (id === ctx.userId) throw new ValidationError('You cannot change your own status');

    const { status } = statusChangeSchema.parse(rawInput);
    const user = await userRepository.update(id, ctx.schoolId, {
      status,
      updatedBy: ctx.userId,
    });
    if (!user) throw new NotFoundError('User');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'user.status_changed',
      resource: 'users',
      resourceId: id,
      details: { status },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return user;
  },

  async deleteUser(id: string, ctx: AuthContext): Promise<void> {
    if (id === ctx.userId) throw new ValidationError('You cannot delete your own account');
    const deleted = await userRepository.softDelete(id, ctx.schoolId);
    if (!deleted) throw new NotFoundError('User');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'user.deleted',
      resource: 'users',
      resourceId: id,
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });
  },

  /** Creates one Parent Workspace login per selected student, all sharing the
   *  same admin-set password. Login email is the student's Student.email
   *  (the parent/guardian's contact address, despite the field's generic
   *  name — same field the accountant workspace emails fee balances to) when
   *  present and not already taken; otherwise a synthetic
   *  parent.{admissionNumber}@parents.schoolos.local address is generated so
   *  the account can still be created and logged into by username. Students
   *  that already have a linked parent account are skipped, not duplicated. */
  async bulkCreateParents(rawInput: unknown, ctx: AuthContext): Promise<BulkCreateParentsResult> {
    const data = bulkCreateParentsSchema.parse(rawInput);
    const uniqueStudentIds = [...new Set(data.studentIds)];

    const [students, alreadyLinked] = await Promise.all([
      studentRepository.findByIds(uniqueStudentIds, ctx.schoolId),
      userRepository.findLinkedStudentIds(ctx.schoolId, uniqueStudentIds),
    ]);
    const foundIds = new Set(students.map((s) => s._id.toString()));

    const result: BulkCreateParentsResult = { created: [], skipped: [], password: data.password };
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    // Tracks emails/usernames claimed earlier in *this* batch, since those
    // rows don't exist in the DB yet for findByEmail/findByUsername to see.
    const claimedEmails = new Set<string>();
    const claimedUsernames = new Set<string>();

    for (const studentId of uniqueStudentIds) {
      if (!foundIds.has(studentId)) {
        result.skipped.push({ studentId, studentName: '(unknown)', reason: 'Student not found' });
        continue;
      }
      const student = students.find((s) => s._id.toString() === studentId)!;

      if (alreadyLinked.has(studentId)) {
        result.skipped.push({
          studentId,
          studentName: student.fullName,
          reason: 'Already has a parent login',
        });
        continue;
      }

      const admissionSlug = slugify(student.admissionNumber) || studentId;

      // Prefer the parent's real email if one is on file and not already in use.
      // Student.email is the parent/guardian's contact address despite the
      // generic name — see the model comment — not the student's own email.
      let email: string | null = null;
      if (student.email) {
        const candidate = student.email.toLowerCase().trim();
        const taken =
          claimedEmails.has(candidate) || (await userRepository.findByEmail(candidate));
        if (!taken) email = candidate;
      }
      if (!email) {
        let candidate = `parent.${admissionSlug}@${GENERATED_EMAIL_DOMAIN}`;
        let suffix = 2;
        while (claimedEmails.has(candidate) || (await userRepository.findByEmail(candidate))) {
          candidate = `parent.${admissionSlug}-${suffix}@${GENERATED_EMAIL_DOMAIN}`;
          suffix += 1;
        }
        email = candidate;
      }
      claimedEmails.add(email);

      let username = `p-${admissionSlug}`;
      let usernameSuffix = 2;
      while (
        claimedUsernames.has(username) ||
        (await userRepository.findByUsername(username))
      ) {
        username = `p-${admissionSlug}-${usernameSuffix}`;
        usernameSuffix += 1;
      }
      claimedUsernames.add(username);

      const user = await userRepository.create({
        firstName: student.fatherName || student.motherName || 'Parent',
        lastName: `of ${student.fullName}`,
        email,
        username,
        passwordHash,
        role: 'parent',
        linkedStudentIds: [studentId],
        schoolId: ctx.schoolId,
        createdBy: ctx.userId,
      });

      result.created.push({
        studentId,
        studentName: student.fullName,
        email: user.email,
        username: user.username!,
      });
    }

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'user.bulk_created_parents',
      resource: 'users',
      resourceId: 'bulk',
      details: { createdCount: result.created.length, skippedCount: result.skipped.length },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return result;
  },

  getRoles(): { id: UserRole; label: string; description: string; permissions: Permission[] }[] {
    return (Object.keys(ROLE_META) as UserRole[]).map((role) => ({
      id: role,
      ...ROLE_META[role],
      permissions: [...ROLE_PERMISSIONS[role]] as Permission[],
    }));
  },

  getPermissions(): { id: Permission; label: string; category: string }[] {
    return (Object.keys(PERMISSION_META) as Permission[]).map((permission) => ({
      id: permission,
      ...PERMISSION_META[permission],
    }));
  },
};
