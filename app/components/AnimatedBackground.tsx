'use client'
export default function AnimatedBackground() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 0,
      overflow: 'hidden',
      background: '#f8f8f8',
      pointerEvents: 'none',
    }}>
      <style>{`
        @keyframes blob1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33%  { transform: translate(40px, -30px) scale(1.08); }
          66%  { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes blob2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33%  { transform: translate(-50px, 25px) scale(1.05); }
          66%  { transform: translate(30px, -20px) scale(0.97); }
        }
        @keyframes blob3 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50%  { transform: translate(20px, 40px) scale(1.1); }
        }
        @keyframes blob4 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          40%  { transform: translate(-30px, -20px) scale(1.06); }
          80%  { transform: translate(25px, 15px) scale(0.96); }
        }
        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          opacity: 0.28;
        }
        @media (prefers-reduced-motion: reduce) {
          .blob { animation: none !important; }
        }
      `}</style>

      {/* blob 1 — Rose Quartz / lavender, top right */}
      <div className="blob" style={{
        width: '600px', height: '600px',
        top: '-200px', right: '-150px',
        background: 'radial-gradient(circle, rgba(198,121,196,0.6) 0%, transparent 65%)',
        animation: 'blob1 22s ease-in-out infinite',
      }} />

      {/* blob 2 — Marigold / amber, center left */}
      <div className="blob" style={{
        width: '500px', height: '500px',
        top: '20%', left: '-150px',
        background: 'radial-gradient(circle, rgba(255,176,5,0.5) 0%, transparent 65%)',
        animation: 'blob2 28s ease-in-out infinite',
        animationDelay: '-8s',
      }} />

      {/* blob 3 — Signal Blue, bottom right */}
      <div className="blob" style={{
        width: '560px', height: '460px',
        bottom: '-120px', right: '5%',
        background: 'radial-gradient(circle, rgba(3,88,247,0.4) 0%, transparent 65%)',
        animation: 'blob3 32s ease-in-out infinite',
        animationDelay: '-16s',
      }} />

      {/* blob 4 — Hot Pink accent, bottom left */}
      <div className="blob" style={{
        width: '380px', height: '380px',
        bottom: '10%', left: '10%',
        background: 'radial-gradient(circle, rgba(250,61,29,0.25) 0%, transparent 65%)',
        animation: 'blob4 26s ease-in-out infinite',
        animationDelay: '-6s',
      }} />
    </div>
  )
}
