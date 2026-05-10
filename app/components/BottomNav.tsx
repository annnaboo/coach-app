'use client'
import { usePathname, useRouter } from 'next/navigation'

const TABS = [
  {
    path: '/client',
    label: 'Главная',
    // also active when inside /workout
    match: (p: string) => p === '/client' || p.startsWith('/workout'),
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-5H9v5H4a1 1 0 0 1-1-1V10.5z"
          stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"
          fill={active ? 'currentColor' : 'none'} />
      </svg>
    ),
  },
  {
    path: '/progress',
    label: 'Фото',
    match: (p: string) => p.startsWith('/progress'),
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="6" width="20" height="15" rx="3"
          stroke="currentColor" strokeWidth="1.6"
          fill={active ? 'currentColor' : 'none'} />
        <circle cx="12" cy="13.5" r="3.5"
          stroke={active ? 'white' : 'currentColor'} strokeWidth="1.6" />
        <path d="M8 6l1.5-3h5L16 6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    path: '/history',
    label: 'История',
    match: (p: string) => p.startsWith('/history'),
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"
          stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
          fill="none" />
        {active && (
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        )}
      </svg>
    ),
  },
  {
    path: '/report',
    label: 'Отчёт',
    match: (p: string) => p.startsWith('/report') || p.startsWith('/reports-history'),
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="2" width="16" height="20" rx="2.5"
          stroke="currentColor" strokeWidth="1.6"
          fill={active ? 'currentColor' : 'none'} />
        <path d="M8 9h8M8 13h5"
          stroke={active ? 'white' : 'currentColor'} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      background: 'var(--bg-card)',
      borderTop: '1px solid var(--divider)',
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {TABS.map(tab => {
        const active = tab.match(pathname)
        return (
          <button
            key={tab.path}
            onClick={() => router.push(tab.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              padding: '10px 4px 12px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: active ? 'var(--accent-primary)' : 'var(--text-tertiary)',
              transition: 'color 0.15s',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {tab.icon(active)}
            <span style={{
              fontFamily: 'var(--font-text)',
              fontWeight: active ? 500 : 300,
              fontSize: '9px',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
            }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
