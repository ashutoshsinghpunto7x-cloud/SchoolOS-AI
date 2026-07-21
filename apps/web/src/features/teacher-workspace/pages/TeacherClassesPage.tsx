import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, ArrowUpRight, AlertCircle, CalendarCheck2 } from 'lucide-react';
import { useTeacherWorkspace } from '../hooks/useTeacherWorkspace';
import { useTeacherTheme } from '../context/TeacherThemeContext';
import { cn } from '@/lib/utils';
import bagIllustration from '@/assets/illustrations/teacher/bag.png';

interface ClassEntry {
  cls: string;
  section: string;
  subjectCount: number;
  isClassTeacher: boolean;
}

const ACCENTS = [
  { bar: 'bg-[#6D4AFF]', icon: 'bg-[#F3EEFF] text-[#6D4AFF]', badge: 'bg-[#F3EEFF] text-[#6D4AFF]' },
  { bar: 'bg-[#4A90FF]', icon: 'bg-blue-50 text-[#4A90FF]', badge: 'bg-blue-50 text-[#4A90FF]' },
  { bar: 'bg-[#20C997]', icon: 'bg-emerald-50 text-[#20C997]', badge: 'bg-emerald-50 text-[#20C997]' },
  { bar: 'bg-[#FFB547]', icon: 'bg-amber-50 text-[#FFB547]', badge: 'bg-amber-50 text-[#FFB547]' },
];

// ── Class card ───────────────────────────────────────────────────────────────

function ClassCard({ entry, accent, index, onPress }: {
  entry: ClassEntry;
  accent: (typeof ACCENTS)[number];
  index: number;
  onPress: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onPress}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="w-full text-left relative flex items-center gap-4 bg-white dark:bg-[#150C29] rounded-[24px] shadow-[0_8px_24px_rgba(17,12,46,0.06)] dark:shadow-none dark:border dark:border-white/10 hover:shadow-[0_16px_36px_rgba(17,12,46,0.1)] dark:hover:border-[#A855F7]/30 transition-shadow duration-300 overflow-hidden pl-5 pr-4 py-5"
    >
      {/* Left accent strip */}
      <span className={cn('absolute left-0 top-0 bottom-0 w-1.5 rounded-l-[24px]', accent.bar)} />

      <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center shrink-0', accent.icon)}>
        <BookOpen className="w-6 h-6" strokeWidth={2} />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-[19px] font-bold text-gray-900 dark:text-white tracking-tight truncate">
          Class {entry.cls} – {entry.section}
        </h3>
      </div>

      <motion.span
        whileHover={{ rotate: -45 }}
        className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/10 flex items-center justify-center shrink-0"
      >
        <ArrowUpRight className="w-4 h-4 text-gray-500 dark:text-white/50" />
      </motion.span>
    </motion.button>
  );
}

function SkeletonCard() {
  return <div className="h-28 rounded-[24px] bg-white dark:bg-[#150C29] shadow-sm dark:shadow-none animate-pulse" />;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function TeacherClassesPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useTeacherWorkspace();
  const { theme } = useTeacherTheme();
  const isDark = theme === 'dark';

  const classes = useMemo<ClassEntry[]>(() => {
    if (!data) return [];

    const classTeacherKeys = new Set(
      (data.classTeacherOf ?? []).map((c) => `${c.class}||${c.section}`),
    );

    const subjectsByKey = new Map<string, Set<string>>();
    for (const dayGroup of data.weekSchedule) {
      for (const entry of dayGroup.entries) {
        const key = `${entry.class}||${entry.section}`;
        const set = subjectsByKey.get(key) ?? new Set<string>();
        set.add(entry.subjectName);
        subjectsByKey.set(key, set);
      }
    }

    const seen = new Map<string, ClassEntry>();
    for (const key of subjectsByKey.keys()) {
      const [cls, section] = key.split('||');
      seen.set(key, {
        cls, section,
        subjectCount: subjectsByKey.get(key)?.size ?? 0,
        isClassTeacher: classTeacherKeys.has(key),
      });
    }
    for (const { class: cls, section } of data.classTeacherOf ?? []) {
      const key = `${cls}||${section}`;
      if (!seen.has(key)) {
        seen.set(key, { cls, section, subjectCount: 0, isClassTeacher: true });
      }
    }

    return Array.from(seen.values()).sort((a, b) =>
      `${a.cls}${a.section}`.localeCompare(`${b.cls}${b.section}`),
    );
  }, [data]);

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-[#0B0518]">
      <div className="px-5 pt-6 pb-4 max-w-3xl mx-auto">
        {/* Back + title */}
        <button
          onClick={() => navigate('/teacher')}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white transition-colors mb-4 -ml-1 p-1"
          type="button"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Hero */}
        <div className="relative mb-6 overflow-visible">
          {/* Decorative floating blur circles */}
          <div className="absolute -top-6 right-6 w-28 h-28 rounded-full bg-[#6D4AFF]/10 blur-2xl pointer-events-none" />
          <div className="absolute top-10 right-24 w-14 h-14 rounded-full bg-[#20C997]/10 blur-xl pointer-events-none" />

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[32px] sm:text-[44px] font-bold text-gray-900 dark:text-white tracking-tight leading-none">My Classes</h1>
              <p className="text-base sm:text-lg text-gray-500 dark:text-white/50 mt-2">
                {classes.length} class{classes.length !== 1 ? 'es' : ''} assigned to you
              </p>
            </div>
            {/* mix-blend-multiply erases the illustration's faint square
                background (near-white) against this section's light page
                background, so it reads as a floating icon instead of a
                tile with a visible edge. That trick only works against a
                light backdrop — against the dark page background it's wrapped
                in an actual light rounded tile instead, since "lighten" blend
                modes just force the white backdrop back through. */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: -4 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="shrink-0 dark:bg-white dark:rounded-[24px] dark:p-2 dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
            >
              <img
                src={bagIllustration}
                alt=""
                className="w-32 sm:w-44 h-auto select-none pointer-events-none mix-blend-multiply dark:mix-blend-normal"
                draggable={false}
              />
            </motion.div>
          </div>
        </div>

        {/* Class cards */}
        <div className="flex flex-col gap-4">
          {isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : isError ? (
            <div className="bg-red-50 dark:bg-red-400/10 border border-red-100 dark:border-red-400/20 rounded-2xl p-5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">Failed to load classes</p>
                <p className="text-xs text-red-500 dark:text-red-400/80 mt-0.5">Please refresh the page and try again.</p>
              </div>
            </div>
          ) : classes.length === 0 ? (
            <div className="bg-white dark:bg-[#150C29] rounded-[24px] border border-gray-100 dark:border-white/10 p-10 text-center">
              <div className="w-14 h-14 bg-gray-100 dark:bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-7 h-7 text-gray-400 dark:text-white/40" />
              </div>
              <p className="text-base font-semibold text-gray-700 dark:text-white/80">No classes assigned</p>
              <p className="text-sm text-gray-400 dark:text-white/40 mt-1">Your principal hasn't assigned you to any classes yet.</p>
            </div>
          ) : (
            classes.map((entry, i) => (
              <ClassCard
                key={`${entry.cls}||${entry.section}`}
                entry={entry}
                accent={ACCENTS[i % ACCENTS.length]}
                index={i}
                onPress={() => navigate(`/teacher/classes/${entry.cls}/${entry.section}`)}
              />
            ))
          )}
        </div>

        {/* Bottom info card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="relative mt-6 rounded-[24px] p-6 overflow-hidden dark:border dark:border-white/10"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, rgba(109,74,255,0.16) 0%, rgba(76,29,149,0.20) 100%)'
              : 'linear-gradient(135deg, #F3EEFF 0%, #EFE9FF 100%)',
          }}
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/40 dark:bg-white/5 blur-xl pointer-events-none" />
          <div className="absolute right-10 bottom-0 w-16 h-16 rounded-full bg-[#6D4AFF]/10 blur-lg pointer-events-none" />
          <div className="relative flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/10 flex items-center justify-center shrink-0 shadow-sm dark:shadow-none">
              <CalendarCheck2 className="w-6 h-6 text-[#6D4AFF] dark:text-violet-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Stay organized</h3>
              <p className="text-sm text-gray-500 dark:text-white/50 mt-1">
                View class details, manage students, take attendance and more.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
