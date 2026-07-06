import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      // ── Shadows (override built-ins for a consistent, subtle elevation system)
      boxShadow: {
        sm: '0 1px 4px 0 rgba(0,0,0,0.05), 0 1px 2px -1px rgba(0,0,0,0.04)',
        DEFAULT: '0 2px 8px 0 rgba(0,0,0,0.06), 0 1px 3px -1px rgba(0,0,0,0.04)',
        md: '0 4px 16px 0 rgba(0,0,0,0.08), 0 2px 6px -2px rgba(0,0,0,0.04)',
        lg: '0 10px 30px -5px rgba(0,0,0,0.10), 0 4px 10px -4px rgba(0,0,0,0.05)',
        xl: '0 20px 48px -12px rgba(0,0,0,0.14)',
        '2xl': '0 25px 64px -12px rgba(0,0,0,0.18)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'splash-float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'splash-zoom': {
          from: { transform: 'scale(1)' },
          to: { transform: 'scale(1.02)' },
        },
        'splash-glow': {
          '0%, 100%': { opacity: '0.25', transform: 'translate(-50%, -50%) scale(1)' },
          '50%': { opacity: '0.45', transform: 'translate(-50%, -50%) scale(1.08)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-up': 'fade-up 0.2s ease-out',
        'fade-in': 'fade-in 0.15s ease-out',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'splash-float': 'splash-float 4s ease-in-out infinite',
        'splash-zoom': 'splash-zoom 20s ease-out forwards',
        'splash-glow': 'splash-glow 3s ease-in-out infinite',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"Segoe UI Variable"',
          '"Segoe UI"',
          'system-ui',
          'sans-serif',
        ],
      },
      // ── Spacing additions
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
