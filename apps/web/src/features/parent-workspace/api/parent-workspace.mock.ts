import type {
  AIChatMessage,
  ChildSummary,
  ParentWorkspaceBundle,
} from '../types';

// ── Mock data ────────────────────────────────────────────────────────────────
// Stands in for a real `/parent-workspace` API. Shaped so the hook layer
// (see hooks/useParentWorkspace.ts) can be repointed at a real endpoint
// later without touching any component.

const CHILDREN: ChildSummary[] = [
  {
    _id: 'child-aarav',
    name: 'Aarav Sharma',
    grade: '8',
    section: 'B',
    status: 'present',
    checkedInAt: '8:04 AM',
    attendancePercent: 96,
    academicAverage: 8.7,
    feeStatus: 'paid',
    nextEvent: { date: '18 Aug', label: 'Parent-teacher meeting' },
  },
  {
    _id: 'child-anaya',
    name: 'Anaya Sharma',
    grade: '5',
    section: 'A',
    status: 'present',
    checkedInAt: '8:11 AM',
    attendancePercent: 92,
    academicAverage: 8.2,
    feeStatus: 'due',
    feeDueAmount: 4500,
    nextEvent: { date: '20 Aug', label: 'Inter-school football' },
  },
];

const BUNDLES: Record<string, Omit<ParentWorkspaceBundle, 'parent' | 'children'>> = {
  'child-aarav': {
    schedule: [
      { _id: 's1', time: '09:00', subject: 'Mathematics', detail: 'Algebra · Room 204', teacher: 'Mrs. Kapoor', isDone: true },
      { _id: 's2', time: '10:30', subject: 'Science', detail: 'Physics Lab · Block A', teacher: 'Mr. Iyer', isCurrent: true },
      { _id: 's3', time: '12:15', subject: 'English', detail: 'Literature · Room 108', teacher: 'Ms. Fernandes' },
      { _id: 's4', time: '14:00', subject: 'History', detail: 'Room 108', teacher: 'Mr. Bose' },
    ],
    subjects: [
      { _id: 'sub1', subject: 'Mathematics', note: 'Strong progress this month', percent: 88, trend: 'up' },
      { _id: 'sub2', subject: 'Science', note: 'Consistent performance', percent: 82, trend: 'steady' },
      { _id: 'sub3', subject: 'English', note: 'Improving steadily', percent: 76, trend: 'up' },
    ],
    attention: [
      { _id: 'a1', title: 'Transport fee receipt', detail: 'Available to download', actionLabel: 'Open', kind: 'document' },
      { _id: 'a2', title: 'Parent-teacher meeting', detail: '18 Aug · 4:30 PM', actionLabel: 'Confirm', kind: 'event' },
    ],
    updates: [
      { _id: 'u1', title: 'Independence Day Assembly', when: 'Tomorrow · 8:30 AM' },
      { _id: 'u2', title: 'Inter-school Football', when: '20 Aug', location: 'Sports Complex' },
    ],
    insight: {
      headline: 'Aarav has improved 11% in Mathematics over the last four weeks.',
      recommendation: 'His teacher recommends around 20 minutes of practice on quadratic equations this weekend.',
    },
    notifications: [
      { _id: 'n1', category: 'important', title: 'PTM confirmation needed', detail: '18 Aug · 4:30 PM with Mrs. Kapoor', when: '2h ago', read: false },
      { _id: 'n2', category: 'academic', title: 'Science test scheduled', detail: 'Physics — 22 Aug', when: '1d ago', read: false },
      { _id: 'n3', category: 'fees', title: 'Transport fee receipt ready', detail: 'Term 2, Aug 2026', when: '2d ago', read: true },
      { _id: 'n4', category: 'school', title: 'Independence Day Assembly', when: '3d ago', detail: '8:30 AM, Main Ground', read: true },
    ],
  },
  'child-anaya': {
    schedule: [
      { _id: 's1', time: '09:00', subject: 'English', detail: 'Grammar · Room 12', teacher: 'Ms. Rao', isDone: true },
      { _id: 's2', time: '10:15', subject: 'Mathematics', detail: 'Fractions · Room 12', teacher: 'Mr. Das', isCurrent: true },
      { _id: 's3', time: '11:45', subject: 'Art', detail: 'Studio · Block C', teacher: 'Ms. Verma' },
      { _id: 's4', time: '13:30', subject: 'Environmental Studies', detail: 'Room 12', teacher: 'Mr. Das' },
    ],
    subjects: [
      { _id: 'sub1', subject: 'Mathematics', note: 'Needs a bit more practice', percent: 68, trend: 'down' },
      { _id: 'sub2', subject: 'English', note: 'Strong progress this month', percent: 85, trend: 'up' },
      { _id: 'sub3', subject: 'Environmental Studies', note: 'Consistent performance', percent: 79, trend: 'steady' },
    ],
    attention: [
      { _id: 'a1', title: 'Term 2 fee due', detail: '₹4,500 · due 25 Aug', actionLabel: 'Pay now', kind: 'fee' },
      { _id: 'a2', title: 'Inter-school football', detail: '20 Aug · Sports Complex', actionLabel: 'Confirm', kind: 'event' },
    ],
    updates: [
      { _id: 'u1', title: 'Independence Day Assembly', when: 'Tomorrow · 8:30 AM' },
      { _id: 'u2', title: 'Art Exhibition', when: '23 Aug', location: 'Block C Gallery' },
    ],
    insight: {
      headline: 'Anaya has been consistent in English, but Mathematics dipped 6% this month.',
      recommendation: 'Her teacher suggests 15 minutes of fraction drills a few evenings this week.',
    },
    notifications: [
      { _id: 'n1', category: 'fees', title: 'Term 2 fee due 25 Aug', detail: '₹4,500 outstanding', when: '4h ago', read: false },
      { _id: 'n2', category: 'important', title: 'Football match confirmation needed', detail: '20 Aug · Sports Complex', when: '1d ago', read: false },
      { _id: 'n3', category: 'academic', title: 'Mathematics needs attention', detail: 'Dipped 6% this month', when: '2d ago', read: true },
    ],
  },
};

function delay<T>(value: T, ms = 260): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const parentWorkspaceApi = {
  async getWorkspace(childId?: string): Promise<ParentWorkspaceBundle> {
    const activeId = childId ?? CHILDREN[0]._id;
    const bundle = BUNDLES[activeId] ?? BUNDLES[CHILDREN[0]._id];
    return delay({
      parent: { _id: 'parent-1', name: 'Ekansh Sharma' },
      children: CHILDREN,
      ...bundle,
    });
  },

  async askAI(childId: string, question: string): Promise<AIChatMessage> {
    const child = CHILDREN.find((c) => c._id === childId) ?? CHILDREN[0];
    const bundle = BUNDLES[child._id];
    const q = question.toLowerCase();

    let text: string;
    if (q.includes('attend')) {
      text = `${child.name} has attended ${child.attendancePercent}% of school days this term — well within a healthy range.`;
    } else if (q.includes('academ') || q.includes('doing') || q.includes('progress')) {
      text = `${child.name}'s current academic average is ${child.academicAverage}/10. ${bundle.insight.headline}`;
    } else if (q.includes('help') || q.includes('weak') || q.includes('practice') || q.includes('subject')) {
      const weakest = [...bundle.subjects].sort((a, b) => a.percent - b.percent)[0];
      text = `${weakest.subject} could use the most attention right now (${weakest.percent}%). ${bundle.insight.recommendation}`;
    } else if (q.includes('ptm') || q.includes('meeting')) {
      text = child.nextEvent
        ? `The next scheduled event is "${child.nextEvent.label}" on ${child.nextEvent.date}.`
        : `There's nothing scheduled for ${child.name} right now.`;
    } else if (q.includes('event') || q.includes('upcoming')) {
      text = bundle.updates.map((u) => `${u.title} — ${u.when}`).join('. ');
    } else {
      text = `${bundle.insight.headline} ${bundle.insight.recommendation}`;
    }

    const msg = await delay({ _id: `a-${Date.now()}`, role: 'assistant' as const, text }, 500);
    return msg;
  },
};
