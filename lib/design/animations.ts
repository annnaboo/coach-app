/**
 * Lux Minimal / Liquid — motion tokens + CSS animation strings
 * Source of truth: design-system.md §6
 * All durations/easings must match tokens.ts motion values.
 */

// ─── Transition shorthand helpers (for inline style.transition) ───────────────

export const transition = {
  /** Hover lift on interactive cards */
  cardHover:   'transform 300ms cubic-bezier(0.22,1,0.36,1), box-shadow 300ms cubic-bezier(0.22,1,0.36,1)',
  /** Press scale on all tappable elements */
  press:       'transform 120ms cubic-bezier(0.22,1,0.36,1)',
  /** Color / bg swap (buttons, day picker) */
  color:       'background 120ms cubic-bezier(0.22,1,0.36,1), color 120ms cubic-bezier(0.22,1,0.36,1)',
  /** Focus ring */
  focus:       'box-shadow 200ms cubic-bezier(0.22,1,0.36,1), border-color 200ms cubic-bezier(0.22,1,0.36,1)',
  /** Progress bar width fill */
  progressFill:'width 500ms cubic-bezier(0.22,1,0.36,1)',
  /** Slider thumb scale + glow */
  sliderThumb: 'transform 120ms cubic-bezier(0.22,1,0.36,1), box-shadow 120ms cubic-bezier(0.22,1,0.36,1)',
  /** Generic fade */
  fade:        'opacity 200ms cubic-bezier(0.22,1,0.36,1)',
  /** Day selector selection */
  selection:   'transform 300ms cubic-bezier(0.22,1,0.36,1), background 300ms cubic-bezier(0.22,1,0.36,1), color 300ms cubic-bezier(0.22,1,0.36,1)',
} as const

// ─── Inline-style state objects ───────────────────────────────────────────────

export const motionStyle = {
  /** Resting card */
  cardRest: {
    transition: transition.cardHover,
    transform:  'translateY(0)',
    boxShadow:  '0 4px 12px rgba(0,0,0,0.04)',
  },
  /** Hovered card */
  cardHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
  },
  /** Pressed element */
  pressed: {
    transform: 'scale(0.97)',
  },
  /** Slider thumb resting */
  sliderThumbRest: {
    transform:  'scale(1)',
    boxShadow:  '0 4px 12px rgba(0,0,0,0.04)',
    transition: transition.sliderThumb,
  },
  /** Slider thumb dragging */
  sliderThumbDrag: {
    transform:  'scale(1.15)',
    boxShadow:  '0 0 0 6px rgba(139,30,63,0.12)',
    transition: transition.sliderThumb,
  },
} as const

// ─── Injected global CSS (inserted via <style> in layout or via styled-jsx) ───

export const globalAnimationCSS = `
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  @keyframes numberMount {
    from { opacity: 0; transform: translateY(5px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.5; }
  }

  /* Page entry — fade + 8px slide */
  .page-enter {
    animation: fadeSlideUp 300ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  /* Card stagger entry */
  .card-enter {
    animation: fadeSlideUp 300ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .card-enter:nth-child(1) { animation-delay:   0ms; }
  .card-enter:nth-child(2) { animation-delay:  50ms; }
  .card-enter:nth-child(3) { animation-delay: 100ms; }
  .card-enter:nth-child(4) { animation-delay: 150ms; }
  .card-enter:nth-child(5) { animation-delay: 200ms; }
  .card-enter:nth-child(6) { animation-delay: 250ms; }

  /* Number mount — metrics, PRs, calories */
  .number-mount {
    animation: numberMount 200ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  /* Fade in */
  .fade-in {
    animation: fadeIn 200ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  /* Press scale — all tappable surfaces */
  .pressable {
    transition: transform 120ms cubic-bezier(0.22, 1, 0.36, 1);
    -webkit-tap-highlight-color: transparent;
  }
  .pressable:active {
    transform: scale(0.97);
  }

  /* Card hover lift */
  .card-hover {
    transition: transform 300ms cubic-bezier(0.22, 1, 0.36, 1),
                box-shadow 300ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .card-hover:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.08);
  }

  /* Reduced motion overrides */
  @media (prefers-reduced-motion: reduce) {
    .page-enter,
    .card-enter,
    .number-mount,
    .fade-in {
      animation-duration: 120ms !important;
      animation-delay: 0ms !important;
    }
    .pressable:active,
    .card-hover:hover {
      transform: none !important;
    }
  }
`
