'use client'

export default function BrandLogo() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '32px' }}>
      <span
        style={{
          fontFamily: 'Epilogue, sans-serif',
          fontWeight: 400,
          fontStyle: 'italic',
          fontSize: '22px',
          letterSpacing: '-0.5px',
          color: '#2d1f0e',
          userSelect: 'none',
        }}
      >
        Anna<span style={{ color: '#7a4a20' }}>Boo</span>
      </span>
    </div>
  )
}
