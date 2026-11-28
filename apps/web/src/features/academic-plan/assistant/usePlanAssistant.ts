import { useCallback, useEffect, useRef, useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { academicPlanKeys } from '../hooks/useAcademicPlan';
import {
  planAssistantApi, PlanAssistantTarget, PlanInterpretPayload, PlanProposal,
} from './plan-assistant.api';
import { parseConfirmation } from './confirmation';

export type PlanReply =
  | { kind: 'text'; text: string; options?: string[] }
  | { kind: 'proposal'; id: string; text: string; proposal: PlanProposal };

export type ProposalStatus = 'pending' | 'applying' | 'applied' | 'cancelled' | 'replaced' | 'failed';

export interface PlanAssistantControls {
  statuses: Record<string, ProposalStatus>;
  /** Apply / cancel from the card's buttons; resolves with what to say next. */
  apply: (id: string) => Promise<PlanReply | null>;
  cancel: (id: string) => PlanReply | null;
}

const isHindi = (s: string) => /[ऀ-ॿ]/.test(s);

/** Which planner screen is open, if any — and which plan it shows. */
function plannerTarget(pathname: string, role: string | undefined): PlanAssistantTarget | null {
  const match = (pattern: string) => matchPath(pattern, pathname)?.params;
  const clean = (v: string | undefined) => (v ? decodeURIComponent(v) : undefined);

  if (role === 'teacher') {
    const plan = match('/teacher/academic-plan/:cls/:section/:subject');
    if (plan) return { class: clean(plan.cls), section: clean(plan.section), subject: clean(plan.subject) };
    return match('/teacher/academic-plan') ? {} : null;
  }
  if (role === 'principal') {
    const plan = match('/principal/academic-plan/:teacherId/:cls/:section/:subject');
    const teacher = match('/principal/academic-plan/teacher/:teacherId');
    if (teacher) return { teacherId: teacher.teacherId };
    if (plan) {
      return { teacherId: plan.teacherId, class: clean(plan.cls), section: clean(plan.section), subject: clean(plan.subject) };
    }
    return match('/principal/academic-plan') ? {} : null;
  }
  return null;
}

function localToday(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/**
 * Conversation state for changing the Academic Plan by voice or text. It asks
 * when the server is unsure, holds one proposal at a time, and saves only after
 * the user approves it.
 */
export function usePlanAssistant() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const target = plannerTarget(pathname, user?.role);
  const targetKey = target ? JSON.stringify(target) : '';

  const [statuses, setStatuses] = useState<Record<string, ProposalStatus>>({});
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const historyRef = useRef<PlanInterpretPayload['history']>([]);
  const pendingRef = useRef<{ id: string; proposal: PlanProposal; hindi: boolean } | null>(null);

  const setStatus = useCallback((id: string, status: ProposalStatus) => {
    setStatuses((s) => ({ ...s, [id]: status }));
  }, []);

  const remember = (role: 'user' | 'assistant', content: string) => {
    historyRef.current = [...historyRef.current, { role, content: content.slice(0, 2000) }].slice(-12);
  };

  // A different plan on screen starts a fresh conversation, so a "yes" can never
  // approve changes to a plan the user has already left.
  useEffect(() => {
    historyRef.current = [];
    const pending = pendingRef.current;
    if (pending) {
      pendingRef.current = null;
      setStatus(pending.id, 'cancelled');
    }
  }, [targetKey, setStatus]);

  const cancel = useCallback((id: string): PlanReply | null => {
    const pending = pendingRef.current;
    if (pending?.id !== id) return null;
    pendingRef.current = null;
    historyRef.current = [];
    setStatus(id, 'cancelled');
    return { kind: 'text', text: pending.hindi ? 'ठीक है, मैंने कुछ नहीं बदला।' : "Okay, I haven't changed anything." };
  }, [setStatus]);

  const apply = useCallback(async (id: string): Promise<PlanReply | null> => {
    const pending = pendingRef.current;
    if (pending?.id !== id || busyRef.current) return null;
    busyRef.current = true;
    setBusy(true);
    setStatus(id, 'applying');
    try {
      const { changedCount } = await planAssistantApi.apply(pending.proposal, new Date().getTimezoneOffset());
      pendingRef.current = null;
      historyRef.current = [];
      setStatus(id, 'applied');
      await queryClient.invalidateQueries({ queryKey: academicPlanKeys.all });
      return {
        kind: 'text',
        text: pending.hindi
          ? 'हो गया, प्लान अपडेट कर दिया है।'
          : `Done. I made ${changedCount} change${changedCount === 1 ? '' : 's'} to the plan.`,
      };
    } catch (err) {
      pendingRef.current = null;
      setStatus(id, 'failed');
      return { kind: 'text', text: (err as Error).message };
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [queryClient, setStatus]);

  /** Resolves to null when the message is not about the planner, so the caller handles it as usual. */
  const handle = useCallback(async (message: string): Promise<PlanReply | null> => {
    if (!targetKey) return null;

    const pending = pendingRef.current;
    if (pending) {
      const answer = parseConfirmation(message);
      if (answer === 'yes') return apply(pending.id);
      if (answer === 'no') return cancel(pending.id);
    }
    if (busyRef.current) return null;

    busyRef.current = true;
    setBusy(true);
    try {
      const result = await planAssistantApi.interpret({
        message: message.slice(0, 1000),
        target: JSON.parse(targetKey) as PlanAssistantTarget,
        history: historyRef.current,
        pendingOperations: pending?.proposal.operations,
        today: localToday(),
        tzOffsetMinutes: new Date().getTimezoneOffset(),
      });
      if (result.type === 'not_plan') return null;

      remember('user', message);
      remember('assistant', result.message);

      if (result.type === 'proposal') {
        const { type: _type, message: text, ...proposal } = result;
        const id = crypto.randomUUID();
        if (pending) setStatus(pending.id, 'replaced');
        pendingRef.current = { id, proposal, hindi: isHindi(message) };
        setStatus(id, 'pending');
        return { kind: 'proposal', id, text, proposal };
      }
      return { kind: 'text', text: result.message, options: result.type === 'clarify' ? result.options : undefined };
    } catch (err) {
      return { kind: 'text', text: (err as Error).message };
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [targetKey, apply, cancel, setStatus]);

  return { active: !!targetKey, busy, handle, statuses, apply, cancel };
}

/** What to read aloud for a reply. */
export function spokenPlanReply(reply: PlanReply): string {
  if (reply.kind === 'text') return reply.text;
  return isHindi(reply.text)
    ? `${reply.text} लागू करने के लिए हाँ कहिए, या रद्द करने के लिए नहीं।`
    : `${reply.text} Say yes to apply, or no to cancel.`;
}

export const PLAN_SUGGESTIONS = [
  'What is planned this week?',
  "Mark today's lesson completed",
  'Add homework for tomorrow',
  "Push today's lesson forward by one",
];
