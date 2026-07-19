// ── Timetable module design tokens ──────────────────────────────────────────
// Single source for the module's dark palette so every page/component stays
// visually consistent. Do not introduce new colors here — only reuse these.

export const TT_COLORS = {
  bg: '#0B0C12',
  bgSecondary: '#12141D',
  card: '#181B26',
  border: 'rgba(255,255,255,0.08)',
  purple: '#7C5CFF',
  pink: '#E954B8',
  success: '#2ED47A',
  warning: '#F5A524',
  danger: '#FF5B6A',
  textPrimary: '#FFFFFF',
  textSecondary: '#A8AFBF',
  textMuted: '#6D7485',
} as const;

export const TT_GRADIENT = `linear-gradient(135deg, ${TT_COLORS.purple} 0%, ${TT_COLORS.pink} 100%)`;

/** Soft per-subject accent backgrounds — all derived from the same 5 palette
 *  hues (purple/pink/success/warning/danger) at low alpha, rotated by a hash
 *  of the subject name so the grid reads as varied without new colors. */
const SUBJECT_ACCENTS = [
  { bg: 'rgba(124,92,255,0.14)', border: 'rgba(124,92,255,0.30)', text: '#B9A9FF' },
  { bg: 'rgba(233,84,184,0.14)', border: 'rgba(233,84,184,0.30)', text: '#F3A8DE' },
  { bg: 'rgba(46,212,122,0.14)', border: 'rgba(46,212,122,0.30)', text: '#8CEBB4' },
  { bg: 'rgba(245,165,36,0.14)', border: 'rgba(245,165,36,0.30)', text: '#F8CB86' },
  { bg: 'rgba(255,91,106,0.14)', border: 'rgba(255,91,106,0.30)', text: '#FFA8B1' },
];

export function subjectAccent(subjectName: string) {
  const hash = [...subjectName.trim().toLowerCase()].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return SUBJECT_ACCENTS[hash % SUBJECT_ACCENTS.length];
}
