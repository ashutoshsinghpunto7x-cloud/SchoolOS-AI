import { candidateRepository, PaginatedCandidates } from './candidate.repository';
import { ICandidate, CandidateStatus } from './candidate.model';
import {
  createCandidateSchema,
  forwardCandidateSchema,
  rejectCandidateSchema,
  setFinalDecisionSchema,
  listCandidatesSchema,
  checkDuplicateSchema,
} from './candidate.validation';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { uploadToR2 } from '../../lib/r2-storage';
import { userRepository } from '../users/user.repository';
import { notificationService } from '../notifications/notification.service';

// Reception Management Module SRD, Module 5 — "Forward to Principal or HR
// with one action... reception's job ends at 'forwarded.'" HR has no
// dedicated role in SchoolOS (per the SRD's resolved role mapping, §11) —
// HR duties are performed by `admin` users, so "forward to HR" notifies
// every admin.
async function notifyRole(role: 'admin' | 'principal', schoolId: string, title: string, body: string, ctx: AuthContext): Promise<void> {
  const { data: recipients } = await userRepository.findAll(schoolId, { role, limit: 100 });
  await Promise.all(
    recipients.map((u) =>
      notificationService.sendToUser({ recipientUserId: String(u._id), type: 'message', title, body }, ctx).catch(() => {})
    ),
  );
}

export const candidateService = {
  async createCandidate(rawInput: unknown, ctx: AuthContext, file: Express.Multer.File): Promise<ICandidate> {
    const data = createCandidateSchema.parse(rawInput);

    const { key, url } = await uploadToR2(file.buffer, file.mimetype, 'candidates/resumes', ctx.schoolId);

    const candidate = await candidateRepository.create({
      schoolId:        ctx.schoolId,
      name:            data.name,
      mobile:          data.mobile,
      email:           data.email || undefined,
      positionApplied: data.positionApplied,
      department:      data.department,
      qualification:   data.qualification,
      experienceYears: data.experienceYears,
      resumeUrl:       url,
      resumeKey:       key,
      source:          data.source,
      dateReceived:    data.dateReceived ? new Date(data.dateReceived) : new Date(),
      receivedById:    ctx.userId,
      receivedByName:  ctx.displayName,
    });

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'candidate.created',
      resource: 'candidates', resourceId: candidate._id.toString(),
      details: { name: data.name, positionApplied: data.positionApplied }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return candidate;
  },

  /** Informational duplicate check — never blocks logging a new CV, since a
   *  genuine second application (different role, months later) is normal;
   *  reception just gets to see it before deciding. */
  async checkDuplicate(rawQuery: unknown, ctx: AuthContext): Promise<ICandidate[]> {
    const { mobile, email } = checkDuplicateSchema.parse(rawQuery);
    return candidateRepository.findActiveDuplicates(ctx.schoolId, mobile, email);
  },

  async listCandidates(rawQuery: unknown, ctx: AuthContext): Promise<PaginatedCandidates> {
    const opts = listCandidatesSchema.parse(rawQuery);
    return candidateRepository.findAll(ctx.schoolId, opts);
  },

  async getCandidate(id: string, ctx: AuthContext): Promise<ICandidate> {
    const candidate = await candidateRepository.findById(id, ctx.schoolId);
    if (!candidate) throw new NotFoundError('Candidate');
    return candidate;
  },

  async forwardCandidate(id: string, rawInput: unknown, ctx: AuthContext): Promise<ICandidate> {
    const { to } = forwardCandidateSchema.parse(rawInput);
    const existing = await candidateService.getCandidate(id, ctx);
    if (existing.status === 'rejected') throw new ValidationError('This candidate has already been rejected.');

    const status: CandidateStatus = to === 'hr' ? 'forwarded_to_hr' : 'forwarded_to_principal';
    const candidate = await candidateRepository.setStatus(id, ctx.schoolId, {
      status, forwardedTo: to, forwardedToName: to === 'hr' ? 'HR' : 'Principal', forwardedAt: new Date(),
    });
    if (!candidate) throw new NotFoundError('Candidate');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'candidate.forwarded',
      resource: 'candidates', resourceId: id, details: { to, positionApplied: existing.positionApplied }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    void notifyRole(
      to === 'hr' ? 'admin' : 'principal', ctx.schoolId,
      'New CV forwarded to you',
      `${existing.name} — ${existing.positionApplied}`,
      ctx,
    ).catch(() => {});

    return candidate;
  },

  async rejectCandidate(id: string, rawInput: unknown, ctx: AuthContext): Promise<ICandidate> {
    const { rejectionReason } = rejectCandidateSchema.parse(rawInput);
    const existing = await candidateService.getCandidate(id, ctx);
    if (existing.status === 'rejected') throw new ValidationError('This candidate has already been rejected.');

    const candidate = await candidateRepository.setStatus(id, ctx.schoolId, { status: 'rejected', rejectionReason });
    if (!candidate) throw new NotFoundError('Candidate');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'candidate.rejected',
      resource: 'candidates', resourceId: id, details: { rejectionReason }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return candidate;
  },

  /** Principal/HR pulling a forwarded CV in to actually look at it, distinct
   *  from "forwarded" (sitting in an inbox) — matches the SRD's status flow
   *  (Applied → Under Review → ...). */
  async markUnderReview(id: string, ctx: AuthContext): Promise<ICandidate> {
    const existing = await candidateService.getCandidate(id, ctx);
    if (!['forwarded_to_hr', 'forwarded_to_principal'].includes(existing.status)) {
      throw new ValidationError(`Cannot move a candidate from "${existing.status}" to "under_review".`);
    }
    const candidate = await candidateRepository.setStatus(id, ctx.schoolId, { status: 'under_review' });
    if (!candidate) throw new NotFoundError('Candidate');
    return candidate;
  },

  /** Module 6 — Principal's final call, normally made after an interview
   *  round reaches `interview_completed`, but not hard-gated to it: a
   *  candidate can also be rejected/held straight out of review without an
   *  interview ever happening. */
  async setFinalDecision(id: string, rawInput: unknown, ctx: AuthContext): Promise<ICandidate> {
    const data = setFinalDecisionSchema.parse(rawInput);
    const existing = await candidateService.getCandidate(id, ctx);
    if (existing.status === 'selected' || existing.status === 'rejected') {
      throw new ValidationError(`This candidate's status is already final ("${existing.status}").`);
    }

    const candidate = await candidateRepository.setFinalDecision(id, ctx.schoolId, {
      status: data.decision,
      salaryDiscussionNotes: data.decision === 'selected' ? data.salaryDiscussionNotes : undefined,
      offeredSalary:         data.decision === 'selected' ? data.offeredSalary : undefined,
      joiningDate:           data.decision === 'selected' && data.joiningDate ? new Date(data.joiningDate) : undefined,
      rejectionReason:       data.decision === 'rejected' ? data.rejectionReason : undefined,
    });
    if (!candidate) throw new NotFoundError('Candidate');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'candidate.final_decision',
      resource: 'candidates', resourceId: id, details: { decision: data.decision }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return candidate;
  },

  async deleteCandidate(id: string, ctx: AuthContext): Promise<void> {
    const existing = await candidateService.getCandidate(id, ctx);
    const deleted = await candidateRepository.softDelete(id, ctx.schoolId, ctx.displayName);
    if (!deleted) throw new NotFoundError('Candidate');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'candidate.deleted',
      resource: 'candidates', resourceId: id, details: { name: existing.name }, ip: ctx.ip, schoolId: ctx.schoolId,
    });
  },
};
