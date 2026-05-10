/**
 * Dia Browser — Liquid iOS — design-system v3.0
 * Source: styles.refero.design/style/b458ca1a-70f0-4f85-b745-f879a4d08457
 */
import type React from 'react'

// ─── Color ────────────────────────────────────────────────────────────────────

export const color = {
  bg: {
    base:      '#f8f8f8',
    primary:   '#f8f8f8',
    gradient:  'linear-gradient(180deg, #f8f8f8 0%, #efefef 100%)',
    card:      'rgba(255, 255, 255, 0.85)',
    cardSolid: '#ffffff',
    cardSoft:  '#efefef',
    overlay:   'rgba(0, 0, 0, 0.35)',
  },
  text: {
    primary:  '#000000',
    secondary:'#636363',
    tertiary: '#959595',
    inverse:  '#ffffff',
    disabled: '#aeaeae',
  },
  accent: {
    primary:  '#000000',
    hover:    '#2a2a2a',
    pressed:  '#404040',
    softBg:   'rgba(0, 0, 0, 0.06)',
    gradient: 'linear-gradient(135deg, #000000 0%, #404040 100%)',
  },
  palette: {
    ink:        '#000000',
    snow:       '#ffffff',
    canvas:     '#f8f8f8',
    fog:        '#efefef',
    pebble:     '#d9d9d9',
    graphite:   '#636363',
    slate:      '#959595',
    steel:      '#aeaeae',
    ash:        '#7c7c7c',
    roseQuartz: '#c679c4',
    marigold:   '#ffb005',
    signalBlue: '#0358f7',
  },
  spectrum: 'linear-gradient(90deg, #c679c4 0%, #fa3d1d 25%, #ffb005 50%, #e1e1fe 75%, #0358f7 100%)',
  divider: '#d9d9d9',
  system: {
    success:   '#34c759',
    successBg: 'rgba(52, 199, 89, 0.12)',
    warning:   '#ff9500',
    warningBg: 'rgba(255, 149, 0, 0.12)',
    error:     '#ff3b30',
    errorBg:   'rgba(255, 59, 48, 0.12)',
  },
  chart: ['#0358f7', '#c679c4', '#ffb005', '#34c759', '#959595'] as const,
} as const

// ─── Glass ────────────────────────────────────────────────────────────────────

export const glass = {
  bg:     'rgba(255, 255, 255, 0.72)',
  border: 'rgba(255, 255, 255, 0.85)',
  blur:   'saturate(180%) blur(20px)',
} as const

// ─── Typography ───────────────────────────────────────────────────────────────

export const font = {
  primary: "-apple-system, 'SF Pro Display', 'DM Sans', 'Helvetica Neue', sans-serif",
  text:    "-apple-system, 'SF Pro Text',    'DM Sans', 'Helvetica Neue', sans-serif",
  serif:   "'New York', 'Georgia', serif",
  mono:    "'SF Mono', 'DM Mono', ui-monospace, monospace",
} as const

export const type = {
  display:   { fontSize: 72, lineHeight: 1.11, fontWeight: 300, letterSpacing: -2.88 },
  headingLg: { fontSize: 54, lineHeight: 1.17, fontWeight: 300, letterSpacing: -2.16 },
  heading:   { fontSize: 50, lineHeight: 1.18, fontWeight: 400, letterSpacing: -2    },
  h1:        { fontSize: 22, lineHeight: 1.25, fontWeight: 400, letterSpacing: -0.44 },
  h2:        { fontSize: 18, lineHeight: 1.33, fontWeight: 400, letterSpacing: 0     },
  body:      { fontSize: 16, lineHeight: 1.5,  fontWeight: 400, letterSpacing: 0     },
  bodySm:    { fontSize: 14, lineHeight: 1.5,  fontWeight: 400, letterSpacing: 0     },
  caption:   { fontSize: 10, lineHeight: 1.5,  fontWeight: 400, letterSpacing: 0     },
  micro:     { fontSize: 10, lineHeight: 1.5,  fontWeight: 500, letterSpacing: 0.4   },
} as const

// ─── Spacing — 8px base ───────────────────────────────────────────────────────

export const space = {
  xs:    4,
  sm:    8,
  md:    16,
  lg:    24,
  xl:    32,
  '2xl': 48,
  '3xl': 64,
} as const

// ─── Radius — Dia Browser large-radius ───────────────────────────────────────

export const radius = {
  sm:   16,
  md:   20,
  lg:   30,
  xl:   40,
  pill: 9999,
} as const

// ─── Shadow ───────────────────────────────────────────────────────────────────

export const shadow = {
  soft:       'rgba(0, 0, 0, 0.08) 0px 0px 8px 0px',
  hover:      'rgba(0, 0, 0, 0.12) 0px 0px 16px 0px',
  modal:      'rgba(0, 0, 0, 0.16) 0px 8px 32px 0px',
  accentGlow: '0 0 0 3px rgba(0, 0, 0, 0.12)',
} as const

// ─── Motion ───────────────────────────────────────────────────────────────────

export const duration = { instant: 120, fast: 200, base: 300, slow: 500 } as const

export const easing = {
  standard: 'cubic-bezier(0.22, 1, 0.36, 1)',
  spring:   'cubic-bezier(0.34, 1.56, 0.64, 1)',
  inOut:    'cubic-bezier(0.65, 0, 0.35, 1)',
} as const

// ─── Z-index ──────────────────────────────────────────────────────────────────

export const zIndex = {
  base: 0, cardHover: 1, sticky: 10, dropdown: 100,
  modalBackdrop: 1000, modal: 1001, toast: 2000,
} as const

// ─── Accessibility ────────────────────────────────────────────────────────────

export const a11y = { touchTargetIOS: 44, touchTargetAndroid: 48, focusRingWidth: 2 } as const

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
  accentSoftBg:   'var(--accent-soft-bg)',
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
  spectrum:       'var(--spectrum)',
} as const

// ─── Legacy re-exports ────────────────────────────────────────────────────────

/** @deprecated */
export const colors = {
  ink:      color.text.primary,
  accent:   color.accent.primary,
  inkMuted: color.text.secondary,
  inkFaint: color.bg.cardSoft,
  inputBg:  color.bg.cardSoft,
}

/** @deprecated */
export const radii = {
  pill:  `${radius.pill}px`,
  card:  `${radius.lg}px`,
  image: `${radius.sm}px`,
  chip:  `${radius.pill}px`,
}

/** @deprecated */
export const shadows = { sm: shadow.soft, md: shadow.hover, lg: shadow.modal }

/** @deprecated */
export const glassCard: React.CSSProperties = {
  background:         glass.bg,
  backdropFilter:     glass.blur,
  WebkitBackdropFilter: glass.blur,
  border:             `1px solid ${glass.border}`,
  borderRadius:       `${radius.lg}px`,
  boxShadow:          shadow.soft,
  padding:            `${space.md}px`,
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
