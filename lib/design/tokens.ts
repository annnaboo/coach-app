/**
 * Lux Minimal / Liquid — typed token constants
 * Source of truth: design-system.md + design-tokens.json v1.0
 * Do not add hardcoded hex values here — all values must match design-tokens.json.
 */
import type React from 'react'

// ─── Color ────────────────────────────────────────────────────────────────────

export const color = {
  bg: {
    primary:  '#F7F3EE',
    gradient: 'linear-gradient(180deg, #F7F3EE 0%, #EFE7DE 100%)',
    card:     '#FFFFFF',
    cardSoft: '#FBF8F5',
    overlay:  'rgba(28, 26, 25, 0.4)',
  },
  text: {
    primary:  '#1C1A19',
    secondary:'#8A817C',
    tertiary: '#B7ADA7',
    inverse:  '#FFFFFF',
    disabled: 'rgba(28, 26, 25, 0.35)',
  },
  accent: {
    primary:  '#8B1E3F',
    hover:    '#A62C52',
    pressed:  '#6E1832',
    softBg:   '#F3D6DD',
    gradient: 'linear-gradient(135deg, #8B1E3F 0%, #A62C52 100%)',
  },
  lux: {
    brown:  '#6B3E2E',
    gold:   '#C6A27E',
  },
  divider: '#E8E1DA',
  system: {
    success:   '#4A8F6E',
    successBg: '#E2EEE8',
    warning:   '#D4A373',
    warningBg: '#F6EADC',
    error:     '#B23A48',
    errorBg:   '#F5DADE',
  },
  /** Data-viz palette — use in this order for multi-series charts */
  chart: ['#8B1E3F', '#6B3E2E', '#C6A27E', '#4A8F6E', '#8A817C'] as const,
} as const

// ─── Typography ───────────────────────────────────────────────────────────────

export const font = {
  primary: "'SF Pro Display', 'Inter', system-ui, -apple-system, sans-serif",
  text:    "'SF Pro Text',    'Inter', system-ui, -apple-system, sans-serif",
} as const

export const type = {
  display:    { fontSize: 34, lineHeight: 40, fontWeight: 700, letterSpacing: -0.8 },
  h1:         { fontSize: 28, lineHeight: 34, fontWeight: 700, letterSpacing: -0.5 },
  h2:         { fontSize: 22, lineHeight: 28, fontWeight: 600, letterSpacing: -0.3 },
  h3:         { fontSize: 18, lineHeight: 24, fontWeight: 600, letterSpacing: -0.2 },
  body:       { fontSize: 16, lineHeight: 24, fontWeight: 400, letterSpacing:  0   },
  bodyMedium: { fontSize: 16, lineHeight: 24, fontWeight: 500, letterSpacing:  0   },
  caption:    { fontSize: 13, lineHeight: 18, fontWeight: 500, letterSpacing:  0   },
  micro:      { fontSize: 11, lineHeight: 14, fontWeight: 600, letterSpacing:  0.4 },
} as const

// ─── Spacing (4px grid) ───────────────────────────────────────────────────────

export const space = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  '2xl': 48,
  '3xl': 64,
} as const

// ─── Radius ───────────────────────────────────────────────────────────────────

export const radius = {
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  pill: 999,
} as const

// ─── Shadow ───────────────────────────────────────────────────────────────────

export const shadow = {
  soft:       '0 4px 12px rgba(0, 0, 0, 0.04)',
  hover:      '0 8px 20px rgba(0, 0, 0, 0.08)',
  modal:      '0 24px 48px rgba(0, 0, 0, 0.12)',
  accentGlow: '0 0 0 6px rgba(139, 30, 63, 0.12)',
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

// ─── CSS var helpers (for inline styles that reference custom properties) ─────

export const cssVar = {
  bgPrimary:      'var(--bg-primary)',
  bgGradient:     'var(--bg-gradient)',
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
  luxBrown:       'var(--lux-brown)',
  luxGold:        'var(--lux-gold)',
  divider:        'var(--divider)',
  success:        'var(--success)',
  successBg:      'var(--success-bg)',
  warning:        'var(--warning)',
  warningBg:      'var(--warning-bg)',
  error:          'var(--error)',
  errorBg:        'var(--error-bg)',
  shadowSoft:     'var(--shadow-soft)',
  shadowHover:    'var(--shadow-hover)',
  shadowModal:    'var(--shadow-modal)',
  shadowGlow:     'var(--shadow-accent-glow)',
} as const

// ─── Legacy re-exports (remove once all consumers are migrated) ───────────────
// TODO: delete these after Phase 3 is complete

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

/** @deprecated use .card CSS class or bg/radius/shadow tokens */
export const glassCard: React.CSSProperties = {
  background:   color.bg.card,
  borderRadius: `${radius.md}px`,
  boxShadow:    shadow.soft,
  padding:      `${space.md}px`,
}

/** @deprecated use .type-micro CSS class */
export const LABEL: React.CSSProperties = {
  fontFamily:    font.text,
  fontWeight:    600,
  fontSize:      '11px',
  lineHeight:    '14px',
  letterSpacing: '0.4px',
  textTransform: 'uppercase' as const,
  color:         color.text.secondary,
}
