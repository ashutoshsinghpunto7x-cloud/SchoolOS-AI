// JS-side copy of the brand palette, for places that need actual values
// (inline styles, SVG fill/stroke) rather than Tailwind classes. For Tailwind
// utility classes, use the --brand-purple-*/--brand-pink CSS vars in
// globals.css instead (arbitrary-value classes need a literal string for
// Tailwind's JIT scanner, so they can't reference these constants directly).
// Keep both copies in sync when the palette changes.

export const brandPurple = {
  darkest: '#4C1D95',
  dark: '#5B21B6',
  hover: '#4C1D95',
  active: '#3f1a94',
  DEFAULT: '#7C3AED',
  light: '#A855F7',
} as const;

export const brandPink = '#DB2777';

export const heroGradient = `linear-gradient(160deg, ${brandPurple.darkest} 0%, ${brandPurple.DEFAULT} 45%, ${brandPink} 100%)`;
