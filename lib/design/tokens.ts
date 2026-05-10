/**
 * ORYZO — typed token constants v2.0
 * Source: styles.refero.design/style/1f204e95-454a-437e-845b-c1b169d35607
 */
import type React from 'react'

// ─── Color ────────────────────────────────────────────────────────────────────

export const color = {
  bg: {
    base:     '#100904',
    primary:  '#100904',
    gradient: 'linear-gradient(180deg, #100904 0%, #0d0702 100%)',
    card:     '#1c1108',
    cardSoft: '#261a0d',
    overlay:  'rgba(16, 9, 4, 0.75)',
  },
  text: {
    primary:  '#ffedd7',
    secondary:'#bbac97',
    tertiary: '#887b6d',
    inverse:  '#100904',
    disabled: 'rgba(255, 237, 215, 0.3)',
  },
  accent: {
    primary:  '#dc5000',
    hover:    '#f05a00',
    pressed:  '#b84200',
    softBg:   'rgba(220, 80, 0, 0.14)',
    gradient: 'linear-gradient(135deg, #dc5000 0%, #f05a00 100%)',
  },
  palette: {
    corkDust:   '#ffedd7',
    lightCork:  '#f6e0c6',
    faintHazel: '#bbac97',
    agedStone:  '#887b6d',
    fadedBark:  '#382416',
    deepMocha:  '#40372e',
    oliveGreen: '#445231',
    subtleMoss: '#5d6c49',
    rust:       '#dc5000',
  },
  divider: 'rgba(255, 237, 215, 0.1)',
  system: {
    success:   '#5d6c49',
    successBg: 'rgba(93, 108, 73, 0.18)',
    warning:   '#887b6d',
    warningBg: 'rgba(136, 123, 109, 0.14)',
    error:     '#e05a00',
    errorBg:   'rgba(220, 80, 0, 0.14)',
  },
  chart: ['#dc5000', '#f6e0c6', '#5d6c49', '#bbac97', '#887b6d'] as const,
} as const

// ─── Typography ───────────────────────────────────────────────────────────────

export const font = {
  primary: "'DM Sans', 'Inter', system-ui, -apple-system, sans-serif",
  text:    "'DM Sans', 'Inter', system-ui, -apple-system, sans-serif",
  serif:   "'Literata', 'Merriweather', Georgia, serif",
  mono:    "'DM Mono', 'ui-monospace', monospace",
} as const

export const type = {
  display:    { fontSize: 49, lineHeight: 1,    fontWeight: 600, letterSpacing: -0.018 },
  h1:         { fontSize: 34, lineHeight: 1.09, fontWeight: 600, letterSpacing: -0.018 },
  h2:         { fontSize: 23, lineHeight: 1.09, fontWeight: 500, letterSpacing: -0.018 },
  h3:         { fontSize: 18, lineHeight: 1.2,  fontWeight: 500, letterSpacing: 0 },
  body:       { fontSize: 16, lineHeight: 1.26, fontWeight: 400, letterSpacing: 0 },
  bodyLg:     { fontSize: 16, lineHeight: 1.26, fontWeight: 400, letterSpacing: 0 },
  bodySm:     { fontSize: 14, lineHeight: 1.33, fontWeight: 400, letterSpacing: 0 },
  caption:    { fontSize: 10, lineHeight: 1.5,  fontWeight: 400, letterSpacing: 0 },
  micro:      { fontSize: 10, lineHeight: 1.5,  fontWeight: 500, letterSpacing: 0.4 },
} as const

// ─── Spacing ──────────────────────────────────────────────────────────────────

export const space = {
  xs:    4,
  sm:    8,
  md:    16,
  lg:    24,
  xl:    32,
  '2xl': 48,
  '3xl': 64,
} as const

// ─── Radius ───────────────────────────────────────────────────────────────────

export const radius = {
  sm:   8,
  md:   12,
  lg:   20,
  xl:   28,
  pill: 999,
} as const

// ─── Shadow — flat per ORYZO ──────────────────────────────────────────────────

export const shadow = {
  soft:       'none',
  hover:      'none',
  modal:      'none',
  accentGlow: '0 0 0 3px rgba(220, 80, 0, 0.25)',
} as const

// ─── Motion ───────────────────────────────────────────────────────────────────

export const duration = {
  instant: 120,
  fast:    200,
  base:    300,
  slow:    500,
} as const

export const easing = {
  standard: 'cubic-bezier(0.22, 1, 0.36, 1)',
  inOut:    'cubic-bezier(0.65, 0, 0.35, 1)',
} as const

// ─── Z-index ──────────────────────────────────────────────────────────────────

export const zIndex = {
  base:          0,
  cardHover:     1,
  sticky:        10,
  dropdown:      100,
  modalBackdrop: 1000,
  modal:         1001,
  toast:         2000,
} as const

// ─── Accessibility ────────────────────────────────────────────────────────────

export const a11y = {
  touchTargetIOS:     44,
  touchTargetAndroid: 48,
  focusRingWidth:     2,
} as const

// ─── CSS var helpers ──────────────────────────────────────────────────────────

export const cssVar = {
  bgBase:         'var(--bg-base)',
  bgPrimary:      'var(--bg-primary)',
  bgCard:         'var(--bg-card)',
  bgCardSoft:     'var(--bg-card-soft)',
  bgOverlay:      'var(--bg-overlay)',
  textPrimary:    'var(--text-primary)',
  textSecondary:  'var(--text-secondary)',
  textTertiary:   'var(--text-tertiary)',
  textInverse:    'var(--text-inverse)',
  textDisabled:   'var(--text-disabled)',
  accentPrimary:  'var(--accent-primary)',
  accentHover:    'var(--accent-hover)',
  accentPressed:  'var(--accent-pressed)',
  accentSoftBg:   'var(--accent-soft-bg)',
  accentGradient: 'var(--accent-gradient)',
  divider:        'var(--divider)',
  success:        'var(--success)',
  successBg:      'var(--success-bg)',
  warning:        'var(--warning)',
  warningBg:      'var(--warning-bg)',
  error:          'var(--error)',
  errorBg:        'var(--error-bg)',
  shadowSoft:     'var(--shadow-soft)',
  shadowModal:    'var(--shadow-modal)',
  shadowGlow:     'var(--shadow-accent-glow)',
} as const

// ─── Legacy re-exports ────────────────────────────────────────────────────────

/** @deprecated use color.accent.primary */
export const colors = {
  ink:      color.text.primary,
  accent:   color.accent.primary,
  inkMuted: color.text.secondary,
  inkFaint: color.bg.cardSoft,
  inputBg:  color.bg.cardSoft,
}

/** @deprecated use radius.* */
export const radii = {
  pill:  `${radius.pill}px`,
  card:  `${radius.md}px`,
  image: `${radius.sm}px`,
  chip:  `${radius.pill}px`,
}

/** @deprecated use shadow.* */
export const shadows = {
  sm: shadow.soft,
  md: shadow.hover,
  lg: shadow.modal,
}

/** @deprecated use .card CSS class */
export const glassCard: React.CSSProperties = {
  background:   color.bg.card,
  borderRadius: `${radius.md}px`,
  border:       `1px solid ${color.divider}`,
  padding:      `${space.md}px`,
}

/** @deprecated use .type-micro CSS class */
export const LABEL: React.CSSProperties = {
  fontFamily:    font.text,
  fontWeight:    500,
  fontSize:      '10px',
  lineHeight:    '1.5',
  letterSpacing: '0.4px',
  textTransform: 'uppercase' as const,
  color:         color.text.tertiary,
}
