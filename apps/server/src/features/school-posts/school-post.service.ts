import { SchoolPost, ISchoolPost, SchoolPostKind, PostClass } from './school-post.model';
import { createSchoolPostSchema } from './school-post.validation';
import { User } from '../users/user.model';
import { Teacher } from '../teachers/teacher.model';
import { Student } from '../students/student.model';
import { ClassTeacherAssignment } from '../classes/class-teacher.model';
import { timetableRepository } from '../timetable/timetable.repository';
import { auditService } from '../audit/audit.service';
import { saveImage, readImage, deleteImage, SCHOOL_POST_BUCKET } from '../../lib/image-store';
import { classNameKey } from '../../lib/class-name';
import { ForbiddenError, NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';

export interface SchoolPostView {
  _id: string;
  kind: SchoolPostKind;
  title: string;
  description?: string;
  classes: PostClass[];
  subject?: string;
  dueDate?: string;
  category?: string;
  activityDate?: string;
  photoIds: string[];
  createdByName: string;
  createdByRole: string;
  createdAt: string;
  canDelete: boolean;
}

export interface PostTarget {
  class: string;
  section: string;
  /** Subjects this user may set homework for in the class (teachers only). */
  subjects: string[];
}

export interface PostTargets {
  classes: PostTarget[];
  kinds: SchoolPostKind[];
  canPostSchoolWide: boolean;
}

/** Roles that manage posts for the whole school. `incharge` mirrors principal (see middlewares/authorize). */
const isManager = (role: string): boolean => role === 'admin' || role === 'principal' || role === 'incharge';

const keyOf = (c: PostClass): string => `${classNameKey(c.class)}|${c.section.trim().toUpperCase()}`;

/** True when a post is meant for a student of this class: school-wide, or the class is listed. */
export function isPostForClass(post: { classes: PostClass[] }, cls: string, section: string): boolean {
  if (post.classes.length === 0) return true;
  const wanted = keyOf({ class: cls, section });
  return post.classes.some((c) => keyOf(c) === wanted);
}

export function toPostView(post: ISchoolPost, ctx: AuthContext): SchoolPostView {
  return {
    _id: String(post._id),
    kind: post.kind,
    title: post.title,
    description: post.description,
    classes: post.classes.map((c) => ({ class: c.class, section: c.section })),
    subject: post.subject,
    dueDate: post.dueDate,
    category: post.category,
    activityDate: post.activityDate,
    photoIds: post.photoIds,
    createdByName: post.createdByName,
    createdByRole: post.createdByRole,
    createdAt: new Date(post.createdAt).toISOString(),
    canDelete: isManager(ctx.role) || post.createdBy === ctx.userId,
  };
}

/** A teacher's classes: what the timetable says they teach, plus classes they are class teacher of
 *  (same sources attendance and the planner trust — Teacher.assignedClasses drifts). */
async function teacherTargets(ctx: AuthContext): Promise<PostTarget[]> {
  const user = (await User.findById(ctx.userId).select('email').lean()) as { email?: string } | null;
  if (!user?.email) throw new ForbiddenError('Your account has no email — cannot find your teacher profile');
  const teacher = (await Teacher.findOne({ schoolId: ctx.schoolId, email: user.email, isDeleted: false })
    .select('_id')
    .lean()) as { _id: { toString(): string } } | null;
  if (!teacher) throw new ForbiddenError('Teacher profile not found');
  const teacherId = String(teacher._id);

  const [timetables, classTeacherOf] = await Promise.all([
    timetableRepository.getTeacherSchedule(ctx.schoolId, teacherId),
    ClassTeacherAssignment.find({ schoolId: ctx.schoolId, teacherId }).lean<PostClass[]>(),
  ]);

  const targets = new Map<string, { class: string; section: string; subjects: Set<string> }>();
  const add = (cls: string, section: string) => {
    const key = keyOf({ class: cls, section });
    if (!targets.has(key)) targets.set(key, { class: cls, section, subjects: new Set() });
    return targets.get(key)!;
  };
  for (const tt of timetables) {
    for (const e of tt.entries) {
      if (e.teacherId === teacherId) add(tt.class, tt.section).subjects.add(e.subjectName);
    }
  }
  for (const a of classTeacherOf) add(a.class, a.section);

  return sortTargets([...targets.values()].map((t) => ({ ...t, subjects: [...t.subjects].sort() })));
}

async function schoolTargets(schoolId: string): Promise<PostTarget[]> {
  const rows = await Student.aggregate<{ _id: PostClass }>([
    { $match: { schoolId, admissionStatus: 'active', isDeleted: false } },
    { $group: { _id: { class: '$class', section: '$section' } } },
  ]);
  return sortTargets(
    rows.filter((r) => r._id.class && r._id.section).map((r) => ({ class: r._id.class, section: r._id.section, subjects: [] }))
  );
}

const sortTargets = (targets: PostTarget[]): PostTarget[] =>
  targets.sort(
    (a, b) =>
      classNameKey(a.class).localeCompare(classNameKey(b.class), undefined, { numeric: true }) ||
      a.section.localeCompare(b.section)
  );

export const schoolPostService = {
  async getTargets(ctx: AuthContext): Promise<PostTargets> {
    if (isManager(ctx.role)) {
      return { classes: await schoolTargets(ctx.schoolId), kinds: ['news', 'activity'], canPostSchoolWide: true };
    }
    return { classes: await teacherTargets(ctx), kinds: ['homework', 'activity'], canPostSchoolWide: false };
  },

  async list(ctx: AuthContext, kind?: SchoolPostKind): Promise<SchoolPostView[]> {
    const query: Record<string, unknown> = { schoolId: ctx.schoolId, isDeleted: false };
    if (kind) query.kind = kind;
    // Teachers manage their own posts; principal and admin see everything.
    if (!isManager(ctx.role)) query.createdBy = ctx.userId;
    const posts = await SchoolPost.find(query).sort({ createdAt: -1 }).limit(100).lean<ISchoolPost[]>();
    return posts.map((p) => toPostView(p, ctx));
  },

  async create(body: unknown, files: Express.Multer.File[], ctx: AuthContext): Promise<SchoolPostView> {
    const data = createSchoolPostSchema.parse(body);
    const targets = await this.getTargets(ctx);

    if (!targets.kinds.includes(data.kind)) {
      throw new ForbiddenError(
        data.kind === 'news' ? 'Only the principal or admin can post school news' : 'Homework is posted by the class teacher'
      );
    }
    if (data.classes.length === 0 && !targets.canPostSchoolWide) {
      throw new ValidationError('Choose at least one of your classes');
    }
    const allowed = new Map(targets.classes.map((t) => [keyOf(t), t]));
    for (const c of data.classes) {
      const target = allowed.get(keyOf(c));
      if (!target) throw new ForbiddenError(`You cannot post to class ${c.class}-${c.section}`);
      if (data.kind === 'homework' && !target.subjects.includes(data.subject!)) {
        throw new ForbiddenError(`You do not teach ${data.subject} in class ${c.class}-${c.section}`);
      }
    }

    const photoIds: string[] = [];
    try {
      for (const file of files) {
        photoIds.push(
          await saveImage(file.buffer, { schoolId: ctx.schoolId, contentType: file.mimetype }, SCHOOL_POST_BUCKET)
        );
      }
      const post = await SchoolPost.create({
        schoolId: ctx.schoolId,
        kind: data.kind,
        title: data.title,
        description: data.description,
        classes: data.classes,
        subject: data.kind === 'homework' ? data.subject : undefined,
        dueDate: data.kind === 'homework' ? data.dueDate : undefined,
        category: data.kind === 'activity' ? data.category : undefined,
        activityDate: data.kind === 'activity' ? data.activityDate : undefined,
        photoIds,
        createdBy: ctx.userId,
        createdByName: ctx.displayName,
        createdByRole: ctx.role,
      });
      auditService.log({
        schoolId: ctx.schoolId,
        userId: ctx.userId,
        userDisplayName: ctx.displayName,
        action: 'school_post.created',
        resource: 'SchoolPost',
        resourceId: String(post._id),
        details: { kind: post.kind, title: post.title, photos: photoIds.length },
        ip: ctx.ip,
      });
      return toPostView(post.toObject() as ISchoolPost, ctx);
    } catch (err) {
      // Don't leave orphaned photos behind when the post itself could not be saved.
      await Promise.all(photoIds.map((id) => deleteImage(id, SCHOOL_POST_BUCKET)));
      throw err;
    }
  },

  async remove(id: string, ctx: AuthContext): Promise<void> {
    const post = await SchoolPost.findOne({ _id: id, schoolId: ctx.schoolId, isDeleted: false });
    if (!post) throw new NotFoundError('Post');
    if (!isManager(ctx.role) && post.createdBy !== ctx.userId) {
      throw new ForbiddenError('You can only delete your own posts');
    }
    post.isDeleted = true;
    post.deletedAt = new Date();
    post.deletedBy = ctx.userId;
    await post.save();
    auditService.log({
      schoolId: ctx.schoolId,
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'school_post.deleted',
      resource: 'SchoolPost',
      resourceId: id,
      details: { kind: post.kind, title: post.title },
      ip: ctx.ip,
    });
  },

  /** Posts a parent should see for one child: school-wide ones plus those naming the child's class. */
  async listForClass(schoolId: string, cls: string, section: string, kind: SchoolPostKind, limit = 40): Promise<ISchoolPost[]> {
    // Class names can be stored as digits or Roman numerals, so the class match runs in code
    // over a bounded, newest-first window.
    const posts = await SchoolPost.find({ schoolId, kind, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(300)
      .lean<ISchoolPost[]>();
    return posts.filter((p) => isPostForClass(p, cls, section)).slice(0, limit);
  },

  /** Photo bytes. Parents only get photos of posts meant for one of their own children. */
  async getPhoto(postId: string, photoId: string, ctx: AuthContext): Promise<{ buffer: Buffer; contentType: string }> {
    const post = await SchoolPost.findOne({ _id: postId, schoolId: ctx.schoolId, isDeleted: false }).lean<ISchoolPost>();
    if (!post || !post.photoIds.includes(photoId)) throw new NotFoundError('Photo');

    if (ctx.role === 'parent') {
      const user = await User.findOne({ _id: ctx.userId, schoolId: ctx.schoolId }).lean();
      const children = await Student.find({
        _id: { $in: user?.linkedStudentIds ?? [] },
        schoolId: ctx.schoolId,
        isDeleted: false,
      })
        .select('class section')
        .lean<PostClass[]>();
      if (!children.some((c) => isPostForClass(post, c.class, c.section))) throw new NotFoundError('Photo');
    }

    const image = await readImage(photoId, ctx.schoolId, SCHOOL_POST_BUCKET);
    if (!image) throw new NotFoundError('Photo');
    return image;
  },
};
