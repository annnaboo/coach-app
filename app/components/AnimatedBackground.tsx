'use client'
export default function AnimatedBackground() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 0,
      overflow: 'hidden',
      background: 'var(--bg-gradient)',
      backgroundAttachment: 'fixed',
      pointerEvents: 'none',
    }}>
      <style>{`
        @keyframes blob1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33%  { transform: translate(30px, -20px) scale(1.06); }
          66%  { transform: translate(-15px, 15px) scale(0.96); }
        }
        @keyframes blob2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33%  { transform: translate(-40px, 20px) scale(1.04); }
          66%  { transform: translate(25px, -15px) scale(0.98); }
        }
        @keyframes blob3 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50%  { transform: translate(15px, 30px) scale(1.08); }
        }
        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.35;
        }
        @media (prefers-reduced-motion: reduce) {
          .blob { animation: none !important; }
        }
      `}</style>

      {/* blob 1 — rust ember glow, top right */}
      <div className="blob" style={{
        width: '560px', height: '560px',
        top: '-160px', right: '-120px',
        background: 'radial-gradient(circle, rgba(220,80,0,0.5) 0%, transparent 65%)',
        animation: 'blob1 22s ease-in-out infinite',
      }} />

      {/* blob 2 — deep amber, left mid */}
      <div className="blob" style={{
        width: '440px', height: '440px',
        top: '25%', left: '-130px',
        background: 'radial-gradient(circle, rgba(56,36,22,0.9) 0%, transparent 65%)',
        animation: 'blob2 26s ease-in-out infinite',
        animationDelay: '-9s',
      }} />

      {/* blob 3 — subtle olive, bottom */}
      <div className="blob" style={{
        width: '600px', height: '440px',
        bottom: '-100px', left: '10%',
        background: 'radial-gradient(circle, rgba(68,82,49,0.35) 0%, transparent 65%)',
        animation: 'blob3 30s ease-in-out infinite',
        animationDelay: '-15s',
      }} />
    </div>
  )
}
