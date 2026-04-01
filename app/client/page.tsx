'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const bg: React.CSSProperties = {
  background: `
    radial-gradient(ellipse 110% 60% at 50% -5%, #16573a 0%, transparent 65%),
    radial-gradient(ellipse 50% 50% at 100% 100%, #020d07 0%, transparent 55%),
    linear-gradient(170deg, #0b3d28 0%, #051610 100%)
  `,
  minHeight: '100vh',
}

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '24px',
  padding: '32px',
}

const pillBtn: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '999px',
  background: 'rgba(207,167,100,0.72)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: 'none',
  color: '#000000',
  fontFamily: 'Chillax, sans-serif',
  fontWeight: 500,
  fontSize: '15px',
  padding: '12px 28px',
  cursor: 'pointer',
}

export default function ClientPage() {
  const [profile, setProfile] = useState<{ name: string; role: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push('/')
        return
      }
      const { data: prof } = await supabase
        .from('profiles')
        .select('name, role')
        .eq('id', data.user.id)
        .single()

      if (prof?.role === 'coach') {
        router.push('/coach')
        return
      }

      setProfile(prof)
      setLoading(false)
    })
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div style={{ ...bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'Chillax, sans-serif', color: 'rgba(255,255,255,0.4)', fontSize: '16px' }}>
        Загружаем...
      </p>
    </div>
  )

  return (
    <div style={{ ...bg, padding: '24px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{
              fontFamily: 'Epilogue, sans-serif',
              fontWeight: 400,
              color: '#CFA764',
              fontSize: '32px',
              margin: 0,
              lineHeight: 1.1,
            }}>
              Привет, {profile?.name}.
            </h1>
            <p style={{
              fontFamily: 'Chillax, sans-serif',
              fontWeight: 300,
              color: 'rgba(255,255,255,0.4)',
              fontSize: '13px',
              margin: '4px 0 0',
            }}>
              Your personal training story
            </p>
          </div>
          <button onClick={handleLogout} style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '999px',
            color: 'rgba(255,255,255,0.5)',
            fontFamily: 'Chillax, sans-serif',
            fontWeight: 300,
            fontSize: '13px',
            padding: '8px 20px',
            cursor: 'pointer',
          }}>
            Выйти
          </button>
        </div>

        {/* ЗАНЯТИЕ */}
        <div style={{ ...glassCard, marginBottom: '16px' }}>
          <p style={{
            fontFamily: 'Chillax, sans-serif',
            fontWeight: 300,
            fontSize: '11px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: '#CFA764',
            margin: '0 0 8px',
          }}>
            Текущее занятие
          </p>
          <h2 style={{
            fontFamily: 'Epilogue, sans-serif',
            fontWeight: 400,
            color: '#ffffff',
            fontSize: '26px',
            margin: '0 0 6px',
          }}>
            Занятие 2
          </h2>
          <p style={{
            fontFamily: 'Chillax, sans-serif',
            fontWeight: 300,
            color: 'rgba(255,255,255,0.45)',
            fontSize: '14px',
            margin: '0 0 24px',
          }}>
            Без воды. Без сюсюканий.
          </p>
          <button
            style={pillBtn}
            onClick={() => router.push('/workout/2')}
          >
            <span style={{
              position: 'absolute', inset: 0, borderRadius: '999px',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 60%)',
              pointerEvents: 'none', zIndex: 1,
            }} />
            <span style={{ position: 'relative', zIndex: 2 }}>Открыть тренировку</span>
          </button>
        </div>

        {/* ПРОГРЕСС */}
        <div style={glassCard}>
          <p style={{
            fontFamily: 'Chillax, sans-serif',
            fontWeight: 300,
            fontSize: '11px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.35)',
            margin: '0 0 16px',
          }}>
            Прогресс
          </p>
          <p style={{
            fontFamily: 'Chillax, sans-serif',
            fontWeight: 300,
            color: 'rgba(255,255,255,0.3)',
            fontSize: '14px',
            margin: 0,
            textAlign: 'center',
            padding: '24px 0',
          }}>
            Заполни первую тренировку —<br />здесь появятся твои графики 📈
          </p>
        </div>

      </div>
    </div>
  )
}