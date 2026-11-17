// JS-side copy of the brand palette, synced with Principal UI (Navy + Cream/Beige).
// Keep in sync with CSS vars in apps/web/src/styles/globals.css.

export const brandPurple = {
  darkest: '#15223E',
  dark: '#1B2A4E',
  hover: '#2C4177',
  active: '#15223E',
  DEFAULT: '#254A9A',
  light: '#254A9A',
} as const;

export const brandPink = '#D9822B';

export const heroGradient = `linear-gradient(135deg, ${brandPurple.dark} 0%, ${brandPurple.DEFAULT} 100%)`;
