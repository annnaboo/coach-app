'use client'

export default function BrandLogo() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '32px' }}>
      <span
        style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 300,
          fontStyle: 'italic',
          fontSize: '22px',
          letterSpacing: '-0.5px',
          color: 'var(--text-primary)',
          userSelect: 'none',
        }}
      >
        Anna<span style={{ color: 'var(--accent-primary)' }}>Boo</span>
      </span>
    </div>
  )
}
