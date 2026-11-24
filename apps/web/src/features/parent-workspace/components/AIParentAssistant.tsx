import { useState, useRef, useEffect, useId, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowUp, CalendarCheck, Award, Wallet, Sparkles, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SiriMiniOrb, SIRI_ORB_SIZE, useStaticOrbBottom } from '@/features/companion/CompanionBuddy';
import { companionConfigFor } from '@/features/companion/companionConfigs';
import { BEHAVIOUR_REMARK_OPTIONS } from '@schoolos/types';
import { parentWorkspaceApi } from '../api/parent-workspace.api';

const PARENT_CONFIG = companionConfigFor('parent')!;

interface AIParentAssistantProps {
  open: boolean;
  onClose: () => void;
  childId: string;
  childName: string;
}

type RichCard =
  | {
      kind: 'attendance';
      monthRate: number;
      yearRate: number;
      present: number;
      absent: number;
    }
  | {
      kind: 'marks';
      overallAvg: string;
      topSubjects: { subject: string; percent: number }[];
      hasReportCard: boolean;
    }
  | {
      kind: 'fees';
      totalPaid: number;
      totalOutstanding: number;
      recentCount: number;
    }
  | {
      kind: 'personality';
      headline: string;
      traits: { label: string; badge: string }[];
    };

interface ChatTurn {
  _id: string;
  role: 'user' | 'assistant';
  text: string;
  card?: RichCard;
}

const PILLAR_CHIPS = [
  {
    id: 'attendance' as const,
    label: 'Attendance Report',
    prompt: 'Show attendance report',
    icon: CalendarCheck,
    cls: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  {
    id: 'marks' as const,
    label: 'Mark Report',
    prompt: 'Show mark report & report card',
    icon: Award,
    cls: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  {
    id: 'fees' as const,
    label: 'Fee History',
    prompt: 'Show fee history & pending dues',
    icon: Wallet,
    cls: 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200',
  },
  {
    id: 'personality' as const,
    label: 'Personality Card',
    prompt: 'Show student personality card',
    icon: Sparkles,
    cls: 'bg-violet-50 hover:bg-violet-100 text-violet-800 border-violet-200',
  },
];

function detectTopic(q: string): 'attendance' | 'marks' | 'fees' | 'personality' | null {
  const s = q.toLowerCase();
  if (s.includes('fee') || s.includes('due') || s.includes('paid') || s.includes('receipt') || s.includes('payment')) {
    return 'fees';
  }
  if (s.includes('attend') || s.includes('present') || s.includes('absent')) {
    return 'attendance';
  }
  if (s.includes('personalit') || s.includes('behavio') || s.includes('habit') || s.includes('conduct') || s.includes('trait')) {
    return 'personality';
  }
  if (s.includes('mark') || s.includes('report card') || s.includes('grade') || s.includes('exam') || s.includes('score') || s.includes('result')) {
    return 'marks';
  }
  return null;
}

export function AIParentAssistant({ open, onClose, childId, childName }: AIParentAssistantProps) {
  const navigate = useNavigate();
  const titleId = useId();
  const orbBottom = useStaticOrbBottom(PARENT_CONFIG);
  const firstName = childName.split(' ')[0];

  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMessages([
        {
          _id: 'welcome',
          role: 'assistant',
          text: `Tap a report below or ask anything about ${firstName}'s attendance, marks, fee history, or personality profile.`,
        },
      ]);
    }
  }, [open, firstName]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  const send = async (text: string, forcedTopic?: 'attendance' | 'marks' | 'fees' | 'personality') => {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    setMessages((prev) => [...prev, { _id: `u-${Date.now()}`, role: 'user', text: trimmed }]);
    setInput('');
    setThinking(true);

    const topic = forcedTopic ?? detectTopic(trimmed);

    try {
      if (topic === 'attendance') {
        const att = await parentWorkspaceApi.getAttendance(childId);
        const monthRate = Math.round(att.monthSummary.attendanceRate || 0);
        const yearRate = Math.round(att.yearSummary.attendanceRate || 0);
        setMessages((prev) => [
          ...prev,
          {
            _id: `a-${Date.now()}`,
            role: 'assistant',
            text: `${firstName} is at ${monthRate}% attendance this month (${att.monthSummary.present} present, ${att.monthSummary.absent} absent) and ${yearRate}% across the year.`,
            card: {
              kind: 'attendance',
              monthRate,
              yearRate,
              present: att.monthSummary.present,
              absent: att.monthSummary.absent,
            },
          },
        ]);
      } else if (topic === 'marks') {
        const [acad, rc] = await Promise.all([
          parentWorkspaceApi.getAcademics(childId),
          parentWorkspaceApi.getReportCard(childId).catch(() => ({ available: false as const })),
        ]);
        const latestExam = acad.exams[0];
        const avg =
          rc.available && rc.reportCard
            ? `${Math.round(rc.reportCard.grandAveragePercent)}%`
            : typeof latestExam?.overallPercentage === 'number'
              ? `${latestExam.overallPercentage}%`
              : acad.subjectTrend.length > 0
                ? `${Math.round(acad.subjectTrend.reduce((s, x) => s + x.percent, 0) / acad.subjectTrend.length)}%`
                : '—';
        const topSubjects = [...acad.subjectTrend].sort((a, b) => b.percent - a.percent).slice(0, 3);
        setMessages((prev) => [
          ...prev,
          {
            _id: `a-${Date.now()}`,
            role: 'assistant',
            text:
              acad.subjectTrend.length > 0
                ? `Here is ${firstName}'s latest mark summary (${avg} overall):`
                : `No exam marks have been published for ${firstName} yet.`,
            card: {
              kind: 'marks',
              overallAvg: avg,
              topSubjects: topSubjects.map((s) => ({ subject: s.subject, percent: s.percent })),
              hasReportCard: !!rc.available,
            },
          },
        ]);
      } else if (topic === 'fees') {
        const fees = await parentWorkspaceApi.getFees(childId);
        const settledCount = fees.records.filter((r) => r.balance <= 0).length;
        setMessages((prev) => [
          ...prev,
          {
            _id: `a-${Date.now()}`,
            role: 'assistant',
            text:
              fees.totalOutstanding > 0
                ? `${firstName} has ₹${fees.totalOutstanding.toLocaleString('en-IN')} in pending dues and ₹${fees.totalPaid.toLocaleString('en-IN')} paid so far.`
                : `All school fees for ${firstName} are cleared (₹${fees.totalPaid.toLocaleString('en-IN')} paid).`,
            card: {
              kind: 'fees',
              totalPaid: fees.totalPaid,
              totalOutstanding: fees.totalOutstanding,
              recentCount: settledCount,
            },
          },
        ]);
      } else if (topic === 'personality') {
        const [ws, rc] = await Promise.all([
          parentWorkspaceApi.getWorkspace(childId),
          parentWorkspaceApi.getReportCard(childId).catch(() => ({ available: false as const })),
        ]);
        const child = ws.children.find((c) => c._id === childId) ?? ws.children[0];
        const remark =
          rc.available && rc.reportCard?.behaviourRemark
            ? BEHAVIOUR_REMARK_OPTIONS.find((o) => o.key === rc.reportCard?.behaviourRemark)?.label
            : undefined;
        const traits =
          rc.available && rc.reportCard && rc.reportCard.skills.length > 0
            ? rc.reportCard.skills.slice(0, 3).map((s) => ({
                label: s.rowLabel,
                badge: `Grade ${s.finalTermGrade ?? s.firstTermGrade ?? 'A'}`,
              }))
            : [
                {
                  label: 'Regularity & Punctuality',
                  badge: (child?.attendancePercent ?? 0) >= 90 ? 'Exemplary' : 'Consistent',
                },
                {
                  label: 'Work Habits & Focus',
                  badge: 'Positive',
                },
                {
                  label: 'Growth Mindset',
                  badge: 'Steady',
                },
              ];
        setMessages((prev) => [
          ...prev,
          {
            _id: `a-${Date.now()}`,
            role: 'assistant',
            text: remark ?? `${firstName}'s holistic classroom habits & personality snapshot:`,
            card: {
              kind: 'personality',
              headline: remark ?? 'Dependable classroom conduct and steady daily engagement.',
              traits,
            },
          },
        ]);
      } else {
        const reply = await parentWorkspaceApi.askAI(childId, trimmed);
        setMessages((prev) => [...prev, { _id: `a-${Date.now()}`, role: 'assistant', text: reply }]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { _id: `a-${Date.now()}`, role: 'assistant', text: "Couldn't reach the server right now — please try again." },
      ]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#1B2A4E]/15 sm:bg-transparent z-40"
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-labelledby={titleId}
            style={{ bottom: `calc(${orbBottom + SIRI_ORB_SIZE + 12}px + env(safe-area-inset-bottom, 0px))` }}
            className="fixed right-4 sm:right-6 z-50 w-[378px] max-w-[calc(100vw-32px)] h-[512px] max-h-[calc(100vh-140px)] p-[2px] rounded-[22px] bg-gradient-to-br from-[#1B2A4E] via-[#254A9A] to-[#D9822B] shadow-[0_14px_42px_rgba(27,42,78,0.18)] flex flex-col font-['DM_Sans','Plus_Jakarta_Sans',sans-serif]"
          >
            <div className="flex-1 min-h-0 bg-white rounded-[20px] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#EFEAE0] shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <SiriMiniOrb />
                <h2 id={titleId} className="text-[14px] font-semibold text-[#1B2A4E] tracking-tight m-0 truncate">
                  Assistant · {firstName}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close assistant"
                className="w-7 h-7 flex items-center justify-center rounded-full text-[#55607A] hover:text-[#1B2A4E] hover:bg-[#F5F1E8] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pinned Colour-Coded Quick Report Strip */}
            <div className="px-3.5 py-2 bg-white border-b border-[#EFEAE0] flex items-center gap-1.5 overflow-x-auto shrink-0">
              {PILLAR_CHIPS.map((chip) => {
                const Icon = chip.icon;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    disabled={thinking}
                    onClick={() => void send(chip.prompt, chip.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-semibold border whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50 ${chip.cls}`}
                  >
                    <Icon className="w-3 h-3" aria-hidden="true" />
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {/* Chat Stream */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FBF8F3]/60 min-h-0">
              {messages.map((m) => (
                <div key={m._id} className={m.role === 'user' ? 'flex justify-end' : 'space-y-2'}>
                  <div
                    className={`max-w-[88%] rounded-[16px] px-3.5 py-2 text-[13px] leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-[#1B2A4E] text-white rounded-br-[4px]'
                        : 'bg-white border border-[#E8E2D6] text-[#1B2A4E] rounded-bl-[4px]'
                    }`}
                  >
                    {m.text}
                  </div>

                  {/* Rich Colour-Coded Report Cards inside the AI Chat */}
                  {m.card?.kind === 'attendance' && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-900">Attendance Summary</span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white tabular-nums">
                          {m.card.monthRate}% Month
                        </span>
                      </div>
                      <progress
                        value={m.card.monthRate}
                        max={100}
                        aria-label={`Monthly attendance: ${m.card.monthRate}%`}
                        className="pw-progress w-full h-1.5 block"
                        style={{ '--pw-fill': '#059669', '--pw-track': '#A7F3D0' } as CSSProperties}
                      />
                      <div className="flex items-center justify-between text-[11.5px] text-emerald-900">
                        <span>Present: <b>{m.card.present}d</b> · Absent: <b>{m.card.absent}d</b></span>
                        <span>Year: <b>{m.card.yearRate}%</b></span>
                      </div>
                      <button
                        type="button"
                        onClick={() => go('/parent/attendance')}
                        className="w-full inline-flex items-center justify-between px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100/60 border border-emerald-200 text-emerald-900 text-xs font-semibold cursor-pointer"
                      >
                        <span>Full Attendance Calendar</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {m.card?.kind === 'marks' && (
                    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/90 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-950">Mark Report</span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-600 text-white tabular-nums">
                          Avg {m.card.overallAvg}
                        </span>
                      </div>
                      {m.card.topSubjects.length > 0 && (
                        <div className="space-y-1.5">
                          {m.card.topSubjects.map((s) => (
                            <div key={s.subject} className="flex items-center justify-between text-xs text-indigo-950 bg-white/80 rounded-lg px-2.5 py-1">
                              <span className="font-medium truncate">{s.subject}</span>
                              <span className="font-bold tabular-nums">{s.percent}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => go('/parent/academics/report-card')}
                        className="w-full inline-flex items-center justify-between px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        <span>{m.card.hasReportCard ? 'Open Published Report Card' : 'Open Digital Report Card'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {m.card?.kind === 'fees' && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-950">Fee History &amp; Dues</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            m.card.totalOutstanding > 0
                              ? 'bg-amber-500 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {m.card.totalOutstanding > 0 ? 'Payment Due' : 'Cleared'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-white/90 px-2.5 py-1.5 border border-emerald-200">
                          <span className="text-[10.5px] text-emerald-800 block">Paid</span>
                          <b className="text-emerald-950 tabular-nums">₹{m.card.totalPaid.toLocaleString('en-IN')}</b>
                        </div>
                        <div className="rounded-lg bg-white/90 px-2.5 py-1.5 border border-amber-200">
                          <span className="text-[10.5px] text-amber-800 block">Due</span>
                          <b className="text-amber-950 tabular-nums">₹{m.card.totalOutstanding.toLocaleString('en-IN')}</b>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => go('/parent/fees')}
                        className="w-full inline-flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold cursor-pointer"
                      >
                        <span>{m.card.totalOutstanding > 0 ? 'Pay Dues / Fee History' : `View ${m.card.recentCount} Receipts`}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {m.card?.kind === 'personality' && (
                    <div className="rounded-2xl border border-violet-200 bg-violet-50/90 p-3.5 space-y-2">
                      <span className="text-xs font-bold text-violet-950 block">Personality &amp; Habits</span>
                      <div className="space-y-1">
                        {m.card.traits.map((t) => (
                          <div key={t.label} className="flex items-center justify-between text-xs bg-white/85 rounded-lg px-2.5 py-1">
                            <span className="text-violet-950 font-medium truncate">{t.label}</span>
                            <span className="text-[11px] font-semibold text-violet-700">{t.badge}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {thinking && (
                <div className="inline-flex items-center gap-1.5 bg-white border border-[#E8E2D6] text-[#55607A] rounded-2xl px-3.5 py-2 text-[12px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1B2A4E]/60 animate-pulse" />
                  Thinking…
                </div>
              )}
            </div>

            {/* Minimalist Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
              className="p-2.5 bg-white border-t border-[#EFEAE0] shrink-0"
            >
              <div className="flex items-center gap-1.5 bg-[#FBF8F3] border border-[#E8E2D6] focus-within:border-[#1B2A4E]/40 focus-within:bg-white rounded-full pl-3.5 pr-1.5 py-1 transition-colors">
                <input
                  type="text"
                  autoFocus
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Ask about ${firstName}'s marks, fees, attendance…`}
                  aria-label="Ask SchoolOS AI a question"
                  className="flex-1 min-w-0 bg-transparent py-1 text-[13px] text-[#1B2A4E] placeholder:text-[#8A93A8] outline-none"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || thinking}
                  aria-label="Send"
                  className="w-7 h-7 shrink-0 rounded-full bg-[#1B2A4E] text-white flex items-center justify-center disabled:opacity-25 transition-opacity cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" strokeWidth={2.2} />
                </button>
              </div>
            </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
