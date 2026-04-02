'use client'
export default function AnimatedBackground() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 0,
      overflow: 'hidden',
      background: '#f5f0e8',
      pointerEvents: 'none',
    }}>
      <style>{`
        @keyframes blob1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(40px, -30px) scale(1.08); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes blob2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(-50px, 30px) scale(1.05); }
          66% { transform: translate(30px, -20px) scale(0.97); }
        }
        @keyframes blob3 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(20px, 40px) scale(1.1); }
        }
        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.75;
        }
      `}</style>

      {/* blob 1 — warm terracotta top right */}
      <div className="blob" style={{
        width: '600px', height: '600px',
        top: '-200px', right: '-150px',
        background: 'radial-gradient(circle, rgba(180,90,40,0.55) 0%, transparent 65%)',
        animation: 'blob1 18s ease-in-out infinite',
      }} />

      {/* blob 2 — beige left */}
      <div className="blob" style={{
        width: '500px', height: '500px',
        top: '15%', left: '-150px',
        background: 'radial-gradient(circle, rgba(190,140,90,0.45) 0%, transparent 65%)',
        animation: 'blob2 22s ease-in-out infinite',
        animationDelay: '-7s',
      }} />

      {/* blob 3 — ochre bottom center */}
      <div className="blob" style={{
        width: '700px', height: '500px',
        bottom: '-150px', left: '10%',
        background: 'radial-gradient(circle, rgba(160,90,40,0.4) 0%, transparent 65%)',
        animation: 'blob3 25s ease-in-out infinite',
        animationDelay: '-12s',
      }} />
    </div>
  )
}
