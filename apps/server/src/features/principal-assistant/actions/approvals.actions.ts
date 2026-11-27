import { z } from 'zod';
import { ActionDefinition, ActionPreview, ActionResultSummary } from '../action-registry';
import { AuthContext } from '../../../lib/auth-context';
import { PERMISSIONS } from '../../../lib/permissions';
import { ValidationError } from '../../../middlewares/errorHandler';
import { escapeRegex } from '../query-params';
import { PurchaseRequest } from '../../purchases/purchase-request.model';
import { purchaseService } from '../../purchases/purchase.service';
import { ExpenseRecord } from '../../expenses/expense.model';
import { expenseService } from '../../expenses/expense.service';
import { MockTest } from '../../mock-tests/mock-test.model';
import { mockTestService } from '../../mock-tests/mock-test.service';
import { StudentChangeRequest } from '../../student-change-requests/student-change-request.model';
import { studentChangeRequestService } from '../../student-change-requests/student-change-request.service';

// ── Approve / reject actions for items the assistant already lists ────────────
// All four follow the leave-review pattern in office.actions.ts: the preview
// resolves exactly ONE pending item (or warns when none / several match), and
// execute re-resolves it and calls the real feature service, so every
// existing rule and audit entry of that service still applies.

interface Candidate { id: string; label: string; details: { key: string; label: string; value: string }[] }

const reviewSchema = z.object({
  query: z.string().trim().max(120).default(''),
  decision: z.enum(['approve', 'reject']).default('approve'),
  note: z.string().trim().max(500).default(''),
});
type ReviewParams = z.infer<typeof reviewSchema>;

const PARAMS_SHAPE = (what: string, queryHelp: string) => `
Fields:
- query (string): ${queryHelp}. Empty string if not stated.
- decision ("approve" | "reject"): "approve" only if the Principal said approve/accept/sanction/pass; "reject" if they said reject/decline/refuse.
- note (string): the reason for a rejection, else empty. (${what})`.trim();

function makeReviewAction(cfg: {
  id: string;
  title: string; // "purchase request"
  description: string;
  queryHelp: string;
  canReject: boolean;
  find: (ctx: AuthContext, query: string) => Promise<Candidate[]>;
  approve: (ctx: AuthContext, id: string) => Promise<void>;
  reject?: (ctx: AuthContext, id: string, note: string) => Promise<void>;
}): ActionDefinition<ReviewParams, { matches: Candidate[] }, { summary: string }> {
  return {
    id: cfg.id,
    description: cfg.description,
    requiredPermission: PERMISSIONS.ADMINISTRATION_MANAGE,
    paramsSchema: reviewSchema,
    paramsShapeDescription: PARAMS_SHAPE(cfg.title, cfg.queryHelp),
    async buildPreview(ctx, params) { return { matches: await cfg.find(ctx, params.query) }; },
    describePreview(preview, params): ActionPreview {
      const m = preview.matches;
      const warnings: string[] = [];
      if (!params.query) warnings.push(`Tell me which ${cfg.title} (${cfg.queryHelp}).`);
      else if (!m.length) warnings.push(`No pending ${cfg.title} found for "${params.query}".`);
      else if (m.length > 1) warnings.push(`${m.length} pending ${cfg.title}s match: ${m.map((x) => x.label).join('; ')}. Be more specific.`);
      if (params.decision === 'reject' && !cfg.canReject) warnings.push(`Rejecting a ${cfg.title} is not supported here — use the normal screen.`);
      const one = m.length === 1 ? m[0] : null;
      return {
        title: `${params.decision === 'approve' ? 'Approve' : 'Reject'} ${cfg.title}`,
        fields: [
          { key: 'query', label: 'Which one', value: one?.label ?? params.query, type: 'text', editable: true },
          { key: 'decision', label: 'Decision', value: params.decision, type: 'text', editable: true },
          ...(one ? one.details.map((d) => ({ key: d.key, label: d.label, value: d.value, type: 'text' as const, editable: false })) : []),
          ...(params.decision === 'reject' && cfg.canReject
            ? [{ key: 'note', label: 'Reason', value: params.note, type: 'textarea' as const, editable: true }] : []),
        ],
        warnings: warnings.length ? warnings : undefined,
      };
    },
    async execute(ctx, params) {
      const m = await cfg.find(ctx, params.query);
      if (m.length !== 1) throw new ValidationError(m.length ? `More than one ${cfg.title} matches — be more specific.` : `No pending ${cfg.title} found.`);
      if (params.decision === 'reject') {
        if (!cfg.reject) throw new ValidationError(`Rejecting a ${cfg.title} is not supported here.`);
        await cfg.reject(ctx, m[0].id, params.note);
      } else {
        await cfg.approve(ctx, m[0].id);
      }
      return { summary: `${cfg.title[0].toUpperCase()}${cfg.title.slice(1)} "${m[0].label}" ${params.decision === 'approve' ? 'approved' : 'rejected'}.` };
    },
    describeResult: (r): ActionResultSummary => ({ summary: r.summary }),
  };
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

// ── Purchase requests ────────────────────────────────────────────────────────
export const reviewPurchaseAction = makeReviewAction({
  id: 'REVIEW_PURCHASE_REQUEST',
  title: 'purchase request',
  description: 'Approve or reject a pending PURCHASE request — "approve purchase request PR-0012", "reject the projector purchase", "stationery wali purchase approve karo".',
  queryHelp: 'the request number (like PR-0012), who raised it, or an item / category word',
  canReject: true,
  async find(ctx, query) {
    if (!query) return [];
    const rx = new RegExp(escapeRegex(query), 'i');
    const rows = await PurchaseRequest.find({
      schoolId: ctx.schoolId, isDeleted: false, status: 'pending',
      $or: [{ requestNo: rx }, { raisedByName: rx }, { category: rx }, { 'items.name': rx }],
    }).limit(6).lean<{ _id: unknown; requestNo: string; raisedByName: string; category: string; items: { name: string; quantity: number; estimatedCost?: number }[] }[]>();
    return rows.map((r) => ({
      id: String(r._id), label: r.requestNo,
      details: [
        { key: 'by', label: 'Raised by', value: r.raisedByName },
        { key: 'items', label: 'Items', value: r.items.map((i) => `${i.quantity} × ${i.name}`).join(', ') },
        { key: 'total', label: 'Estimated total', value: inr(r.items.reduce((s, i) => s + (i.estimatedCost ?? 0) * i.quantity, 0)) },
      ],
    }));
  },
  async approve(ctx, id) { await purchaseService.decideRequest(id, 'approved', {}, ctx); },
  async reject(ctx, id, note) { await purchaseService.decideRequest(id, 'rejected', { rejectionReason: note || undefined }, ctx); },
});

// ── Expenses (the system only has pending → approved) ────────────────────────
export const reviewExpenseAction = makeReviewAction({
  id: 'REVIEW_EXPENSE',
  title: 'expense',
  description: 'Approve a pending EXPENSE entry — "approve the electricity bill expense", "fuel expense approve karo". (Expenses can only be approved, not rejected.)',
  queryHelp: 'the expense title or category word',
  canReject: false,
  async find(ctx, query) {
    if (!query) return [];
    const rx = new RegExp(escapeRegex(query), 'i');
    const rows = await ExpenseRecord.find({
      schoolId: ctx.schoolId, isDeleted: false, status: 'pending', $or: [{ title: rx }, { category: rx }],
    }).limit(6).lean<{ _id: unknown; title: string; category: string; amount: number; date: Date }[]>();
    return rows.map((r) => ({
      id: String(r._id), label: r.title,
      details: [
        { key: 'amount', label: 'Amount', value: inr(r.amount) },
        { key: 'category', label: 'Category', value: r.category },
        { key: 'date', label: 'Date', value: r.date.toISOString().slice(0, 10) },
      ],
    }));
  },
  async approve(ctx, id) { await expenseService.updateExpenseRecord(id, { status: 'approved' }, ctx); },
});

// ── Mock tests ───────────────────────────────────────────────────────────────
export const reviewMockTestAction = makeReviewAction({
  id: 'REVIEW_MOCK_TEST',
  title: 'mock test',
  description: 'Approve or reject a MOCK TEST / question paper waiting for the Principal — "approve the class 8 maths mock test", "reject the science test".',
  queryHelp: 'the test title, subject or class',
  canReject: true,
  async find(ctx, query) {
    if (!query) return [];
    const rx = new RegExp(escapeRegex(query), 'i');
    const rows = await MockTest.find({
      schoolId: ctx.schoolId, status: 'pending_approval', $or: [{ title: rx }, { subject: rx }, { class: rx }],
    }).limit(6).lean<{ _id: unknown; title: string; class: string; subject: string }[]>();
    return rows.map((r) => ({
      id: String(r._id), label: r.title,
      details: [{ key: 'class', label: 'Class', value: r.class }, { key: 'subject', label: 'Subject', value: r.subject }],
    }));
  },
  async approve(ctx, id) { await mockTestService.approve(id, ctx); },
  async reject(ctx, id, note) { await mockTestService.reject(id, note || undefined, ctx); },
});

// ── Student profile change requests ──────────────────────────────────────────
export const reviewChangeRequestAction = makeReviewAction({
  id: 'REVIEW_STUDENT_CHANGE_REQUEST',
  title: 'student change request',
  description: 'Approve or reject a teacher\'s pending request to EDIT a student\'s details — "approve the change request for Riya", "reject Aman\'s profile edit".',
  queryHelp: 'the student\'s name',
  canReject: true,
  async find(ctx, query) {
    if (!query) return [];
    const rows = await StudentChangeRequest.find({
      schoolId: ctx.schoolId, status: 'pending', studentName: new RegExp(escapeRegex(query), 'i'),
    }).limit(6).lean<{ _id: unknown; studentName: string; requestedByName: string; changes: Record<string, unknown> }[]>();
    return rows.map((r) => ({
      id: String(r._id), label: r.studentName,
      details: [
        { key: 'by', label: 'Requested by', value: r.requestedByName },
        { key: 'changes', label: 'Changes', value: Object.entries(r.changes).map(([k, v]) => `${k}: ${String(v)}`).join('; ') },
      ],
    }));
  },
  async approve(ctx, id) { await studentChangeRequestService.approve(id, ctx); },
  async reject(ctx, id, note) { await studentChangeRequestService.reject(id, { reviewNote: note || undefined }, ctx); },
});
