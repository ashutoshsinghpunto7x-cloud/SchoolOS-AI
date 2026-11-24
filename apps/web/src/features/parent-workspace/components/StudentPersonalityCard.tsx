import type { CSSProperties } from 'react';
import {
  Award,
  BookOpen,
  CalendarCheck,
  Heart,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { BEHAVIOUR_REMARK_OPTIONS, type TermReportCard, type ReportCardTemplate } from '@schoolos/types';
import type { ChildSummary, SubjectSnapshot } from '../types';

interface PersonalityTrait {
  id: string;
  label: string;
  category: string;
  badge: string;
  score: number;
  tone: 'violet' | 'emerald' | 'indigo' | 'amber' | 'rose' | 'teal';
}

const TONE_STYLES: Record<
  PersonalityTrait['tone'],
  { card: string; badge: string; fill: string; track: string; iconBg: string }
> = {
  violet: {
    card: 'bg-violet-50/70 border-violet-200/80',
    badge: 'bg-violet-100 text-violet-800 border-violet-200',
    fill: '#7C3AED',
    track: '#EDE9FE',
    iconBg: 'bg-violet-100 text-violet-700',
  },
  emerald: {
    card: 'bg-emerald-50/70 border-emerald-200/80',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    fill: '#059669',
    track: '#D1FAE5',
    iconBg: 'bg-emerald-100 text-emerald-700',
  },
  indigo: {
    card: 'bg-indigo-50/70 border-indigo-200/80',
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    fill: '#4F46E5',
    track: '#E0E7FF',
    iconBg: 'bg-indigo-100 text-indigo-700',
  },
  amber: {
    card: 'bg-amber-50/70 border-amber-200/80',
    badge: 'bg-amber-100 text-amber-900 border-amber-200',
    fill: '#D97706',
    track: '#FEF3C7',
    iconBg: 'bg-amber-100 text-amber-800',
  },
  rose: {
    card: 'bg-rose-50/70 border-rose-200/80',
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
    fill: '#E11D48',
    track: '#FFE4E6',
    iconBg: 'bg-rose-100 text-rose-700',
  },
  teal: {
    card: 'bg-teal-50/70 border-teal-200/80',
    badge: 'bg-teal-100 text-teal-800 border-teal-200',
    fill: '#0D9488',
    track: '#CCFBF1',
    iconBg: 'bg-teal-100 text-teal-700',
  },
};

const TONE_CYCLE: PersonalityTrait['tone'][] = ['violet', 'emerald', 'indigo', 'teal', 'amber', 'rose'];

function gradeToScore(grade?: string): { score: number; badge: string } {
  const g = (grade ?? '').trim().toUpperCase();
  if (g === 'A+' || g === 'A1') return { score: 96, badge: `Grade ${g}` };
  if (g === 'A' || g === 'A2') return { score: 90, badge: `Grade ${g}` };
  if (g === 'B+' || g === 'B1') return { score: 82, badge: `Grade ${g}` };
  if (g === 'B' || g === 'B2') return { score: 76, badge: `Grade ${g}` };
  if (g === 'C' || g === 'C1') return { score: 65, badge: `Grade ${g}` };
  if (g) return { score: 70, badge: `Grade ${g}` };
  return { score: 84, badge: 'Assessed' };
}

interface StudentPersonalityCardProps {
  child: Pick<ChildSummary, 'name' | 'grade' | 'section' | 'attendancePercent' | 'academicAverage'>;
  subjects?: SubjectSnapshot[];
  reportCard?: TermReportCard;
  template?: ReportCardTemplate;
  onOpenReportCard?: () => void;
}

export function StudentPersonalityCard({
  child,
  subjects = [],
  reportCard,
  template,
  onOpenReportCard,
}: StudentPersonalityCardProps) {
  const firstName = child.name.split(' ')[0];

  // 1. If a published TermReportCard has teacher-graded skills/habits, surface them directly
  let traits: PersonalityTrait[] = [];
  if (reportCard && reportCard.skills && reportCard.skills.length > 0) {
    const validIds = template
      ? new Set(template.skillSections.flatMap((sec) => sec.rows.map((r) => r._id)))
      : null;

    const visibleSkills = reportCard.skills.filter((s) => !validIds || validIds.has(s.rowId));
    traits = visibleSkills.slice(0, 6).map((s, idx) => {
      const latestGrade = s.finalTermGrade ?? s.firstTermGrade;
      const { score, badge } = gradeToScore(latestGrade);
      return {
        id: s.rowId || `${s.sectionId}-${idx}`,
        label: s.rowLabel,
        category: s.sectionName || 'Personal & Social Habits',
        badge,
        score,
        tone: TONE_CYCLE[idx % TONE_CYCLE.length],
      };
    });
  }

  // 2. Otherwise derive holistic habits & strengths from real attendance + subject momentum
  if (traits.length === 0) {
    const att = Math.max(0, Math.min(100, Math.round(child.attendancePercent || 0)));
    const avgPct = Math.max(0, Math.min(100, Math.round((child.academicAverage || 0) * 10)));
    const strongest = subjects.length > 0 ? [...subjects].sort((a, b) => b.percent - a.percent)[0] : undefined;
    const improvingCount = subjects.filter((s) => s.trend === 'up').length;
    const consistencyScore = subjects.length > 0
      ? Math.min(96, Math.max(68, Math.round(avgPct * 0.6 + att * 0.4)))
      : Math.max(75, att);

    traits = [
      {
        id: 'punctuality',
        label: 'Regularity & Punctuality',
        category: 'Daily Discipline',
        badge: att >= 90 ? 'Exemplary' : att >= 80 ? 'Consistent' : 'Building',
        score: att > 0 ? att : 85,
        tone: 'emerald',
      },
      {
        id: 'curiosity',
        label: strongest ? `Strength in ${strongest.subject}` : 'Academic Curiosity',
        category: 'Learning Aptitude',
        badge: strongest ? `${strongest.percent}% Mastery` : 'Active Learner',
        score: strongest ? strongest.percent : avgPct > 0 ? avgPct : 82,
        tone: 'indigo',
      },
      {
        id: 'habits',
        label: 'Work Habits & Focus',
        category: 'Classroom Conduct',
        badge: consistencyScore >= 85 ? 'Strong' : 'Steady',
        score: consistencyScore,
        tone: 'violet',
      },
      {
        id: 'growth',
        label: 'Growth Mindset & Effort',
        category: 'Term Momentum',
        badge: improvingCount > 0 ? `${improvingCount} Rising` : 'Steady Pace',
        score: improvingCount > 0 ? Math.min(95, 78 + improvingCount * 6) : 80,
        tone: 'amber',
      },
    ];
  }

  const behaviourOption = reportCard?.behaviourRemark
    ? BEHAVIOUR_REMARK_OPTIONS.find((o) => o.key === reportCard.behaviourRemark)
    : undefined;

  const remarkText =
    reportCard?.teacherRemark ||
    behaviourOption?.label ||
    (child.attendancePercent >= 88
      ? `${firstName} shows dependable classroom habits, regular attendance, and steady engagement across subjects.`
      : `${firstName} is building steady classroom routines and benefits from regular daily revision.`);

  const badgeLabel =
    reportCard?.behaviourRemark === 'excellent'
      ? 'Role Model'
      : reportCard?.behaviourRemark === 'very_good'
        ? 'Positive Attitude'
        : child.attendancePercent >= 90
          ? 'Consistent Star'
          : 'Holistic Profile';

  return (
    <section
      aria-labelledby="personality-card-heading"
      className="rounded-2xl border border-violet-200/80 bg-gradient-to-br from-white via-[#FCFaff] to-[#F5F3FF]/70 shadow-sm p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white flex items-center justify-center shadow-sm shrink-0">
            <Sparkles className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="personality-card-heading" className="text-lg font-bold text-[#1B2A4E] m-0">
                Student Personality Card
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-800 border border-violet-200">
                <Star className="w-3 h-3 fill-current" aria-hidden="true" />
                {badgeLabel}
              </span>
            </div>
            <p className="text-sm text-[#55607A] m-0 mt-0.5">
              {firstName}&apos;s character traits, classroom habits &amp; strengths
            </p>
          </div>
        </div>

        {onOpenReportCard && (
          <button
            type="button"
            onClick={onOpenReportCard}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white hover:bg-violet-50 text-violet-800 border border-violet-200 transition-colors cursor-pointer"
          >
            Full Report Card →
          </button>
        )}
      </div>

      {/* Trait Cards Grid */}
      <div className="grid sm:grid-cols-2 gap-3 mt-5">
        {traits.map((t, idx) => {
          const style = TONE_STYLES[t.tone];
          const Icon = idx % 4 === 0 ? CalendarCheck : idx % 4 === 1 ? BookOpen : idx % 4 === 2 ? Users : Award;
          return (
            <div key={t.id} className={`rounded-xl border p-3.5 ${style.card}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${style.iconBg}`}>
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1B2A4E] truncate m-0">{t.label}</p>
                    <p className="text-xs text-[#55607A] truncate m-0">{t.category}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${style.badge}`}>
                  {t.badge}
                </span>
              </div>

              <progress
                value={t.score}
                max={100}
                aria-label={`${t.label}: ${t.badge}`}
                className="pw-progress w-full h-1.5 mt-3 block"
                style={
                  {
                    '--pw-fill': style.fill,
                    '--pw-track': style.track,
                  } as CSSProperties
                }
              />
            </div>
          );
        })}
      </div>

      {/* Teacher / Character Remark Footer */}
      <div className="mt-4 rounded-xl bg-white/90 border border-violet-100 px-4 py-3 flex items-start gap-3">
        <span className="w-7 h-7 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
          <Heart className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-700 m-0">
            Teacher&apos;s Observation
          </p>
          <p className="text-sm text-[#1B2A4E] leading-relaxed m-0 mt-0.5">{remarkText}</p>
        </div>
      </div>
    </section>
  );
}
