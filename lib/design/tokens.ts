import React from 'react'

// Shared design tokens for coach-app

export const colors = {
  ink: '#2d1f0e',
  accent: '#7a4a20',
  inkMuted: 'rgba(45,31,14,0.5)',
  inkFaint: 'rgba(45,31,14,0.08)',
  inputBg: 'rgba(0,0,0,0.05)',
}

export const radii = {
  pill: '999px',
  card: '20px',
  image: '12px',
  chip: '999px',
}

export const shadows = {
  sm: '0 1px 3px rgba(45,31,14,0.04), 0 4px 12px rgba(45,31,14,0.05)',
  md: '0 4px 16px rgba(45,31,14,0.08), 0 16px 40px rgba(45,31,14,0.10)',
  lg: '0 8px 32px rgba(45,31,14,0.12), 0 32px 64px rgba(45,31,14,0.14)',
}

export const glassCard: React.CSSProperties = {
  background: 'rgba(255, 251, 245, 0.72)',
  backdropFilter: 'blur(18px) saturate(160%)',
  WebkitBackdropFilter: 'blur(18px) saturate(160%)',
  border: '1px solid rgba(255, 255, 255, 0.35)',
  borderRadius: '20px',
  boxShadow: '0 2px 8px rgba(45,31,14,0.06), 0 12px 40px rgba(45,31,14,0.08), inset 0 1px 0 rgba(255,255,255,0.6)',
  padding: '24px',
  marginBottom: '12px',
}

export const divider: React.CSSProperties = {
  borderBottom: '1px solid rgba(45,31,14,0.08)',
  paddingBottom: '28px',
  marginBottom: '28px',
}

export const LABEL: React.CSSProperties = {
  fontFamily: 'Chillax, sans-serif',
  fontWeight: 300,
  fontSize: '11px',
  letterSpacing: '3px',
  textTransform: 'uppercase' as const,
  color: 'rgba(45,31,14,0.5)',
  margin: '0 0 16px',
}
