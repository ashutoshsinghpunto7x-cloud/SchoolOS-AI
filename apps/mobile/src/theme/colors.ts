export interface ThemeColors {
  background: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primaryMuted: string;
  success: string;
  successMuted: string;
  warning: string;
  warningMuted: string;
  danger: string;
  dangerMuted: string;
  overlay: string;
}

const light: ThemeColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
  textInverse: '#F8FAFC',
  primary: '#2563EB',
  primaryMuted: '#DBEAFE',
  success: '#16A34A',
  successMuted: '#DCFCE7',
  warning: '#D97706',
  warningMuted: '#FEF3C7',
  danger: '#DC2626',
  dangerMuted: '#FEE2E2',
  overlay: 'rgba(15, 23, 42, 0.4)',
};

const dark: ThemeColors = {
  background: '#0B1220',
  surface: '#131B2E',
  surfaceRaised: '#1B2740',
  border: '#263449',
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  textInverse: '#0F172A',
  primary: '#60A5FA',
  primaryMuted: '#1E3A5F',
  success: '#4ADE80',
  successMuted: '#14532D',
  warning: '#FBBF24',
  warningMuted: '#78350F',
  danger: '#F87171',
  dangerMuted: '#7F1D1D',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export const palette = { light, dark };
