import bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { SchoolSettings } from '../school-settings/school-settings.model';
import { User } from '../users/user.model';
import { isKnownTestSchoolId } from '../../lib/test-tenant';
import { ValidationError } from '../../middlewares/errorHandler';
import { auditService } from '../audit/audit.service';
import { AuthContext } from '../../lib/auth-context';
import { createSchoolSchema } from './ops-schools.validation';

const SALT_ROUNDS = 12;
const TEMP_PASSWORD_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

const generateTempPassword = (): string => {
  let out = '';
  for (let i = 0; i < 12; i++) out += PASSWORD_CHARS[randomInt(PASSWORD_CHARS.length)];
  return out;
};

const deriveCode = (name: string): string => {
  const code = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
  return code.length >= 2 ? code : `s${randomInt(1000, 9999)}`;
};

export const opsSchoolsService = {
  /**
   * Creates a new tenant: one SchoolSettings document (which is what makes a school
   * appear in Ops Center) and one admin login. Never touches any existing school.
   * The temp password is returned once and the school admin must change it at first login.
   */
  async createSchool(rawInput: unknown, ctx: AuthContext) {
    const data = createSchoolSchema.parse(rawInput);

    const schoolId = `school_${data.schoolCode ?? deriveCode(data.schoolName)}`;

    // Guard: must not look like a test/internal tenant (those are hidden from Ops).
    if (isKnownTestSchoolId(schoolId)) {
      throw new ValidationError('This school code is reserved. Please choose a different one.');
    }

    // Guard: never reuse a schoolId that already has ANY data (settings or users).
    const [existingSettings, existingUserInSchool, existingEmail] = await Promise.all([
      SchoolSettings.exists({ schoolId }),
      User.exists({ schoolId }),
      // Query the model directly (not the repository) so soft-deleted users still block,
      // matching the unique index on email.
      User.exists({ email: data.adminEmail }),
    ]);
    if (existingSettings || existingUserInSchool) {
      throw new ValidationError(`A school with code "${schoolId.replace('school_', '')}" already exists. Choose a different school code.`);
    }
    if (existingEmail) {
      throw new ValidationError('A user with this admin email already exists.');
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    const settings = await SchoolSettings.create({
      schoolId,
      schoolName: data.schoolName,
      isTestTenant: false,
      updatedBy: ctx.displayName,
    });

    try {
      const admin = await User.create({
        firstName: data.adminFirstName,
        lastName: data.adminLastName,
        email: data.adminEmail,
        phone: data.adminPhone,
        passwordHash,
        role: 'admin',
        schoolId,
        mustResetPassword: true,
        tempPasswordExpiresAt: new Date(Date.now() + TEMP_PASSWORD_TTL_MS),
        createdBy: ctx.userId,
      });

      auditService.log({
        userId: ctx.userId,
        userDisplayName: ctx.displayName,
        action: 'user.created',
        resource: 'schools',
        resourceId: schoolId,
        details: { event: 'school.created', schoolName: data.schoolName, adminEmail: data.adminEmail },
        ip: ctx.ip,
        schoolId,
      });

      return {
        schoolId,
        schoolName: settings.schoolName,
        admin: {
          _id: admin._id.toString(),
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
        },
        // Shown exactly once — never stored in plain text, never logged.
        temporaryPassword: tempPassword,
        temporaryPasswordExpiresAt: admin.tempPasswordExpiresAt,
      };
    } catch (err) {
      // Roll back the brand-new settings doc so a failed admin insert can't leave a half-made tenant.
      await SchoolSettings.deleteOne({ _id: settings._id });
      throw err;
    }
  },
};
