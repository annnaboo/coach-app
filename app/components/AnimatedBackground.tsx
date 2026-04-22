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
          filter: blur(70px);
          opacity: 0.45;
        }
        @media (prefers-reduced-motion: reduce) {
          .blob { animation: none !important; }
        }
      `}</style>

      {/* blob 1 — warm blush, top right */}
      <div className="blob" style={{
        width: '580px', height: '580px',
        top: '-180px', right: '-130px',
        background: 'radial-gradient(circle, rgba(243,214,221,0.8) 0%, transparent 65%)',
        animation: 'blob1 20s ease-in-out infinite',
      }} />

      {/* blob 2 — warm beige, left */}
      <div className="blob" style={{
        width: '480px', height: '480px',
        top: '20%', left: '-140px',
        background: 'radial-gradient(circle, rgba(239,231,222,0.7) 0%, transparent 65%)',
        animation: 'blob2 24s ease-in-out infinite',
        animationDelay: '-8s',
      }} />

      {/* blob 3 — soft warm, bottom */}
      <div className="blob" style={{
        width: '640px', height: '480px',
        bottom: '-120px', left: '5%',
        background: 'radial-gradient(circle, rgba(247,243,238,0.9) 0%, transparent 65%)',
        animation: 'blob3 28s ease-in-out infinite',
        animationDelay: '-14s',
      }} />
    </div>
  )
}
