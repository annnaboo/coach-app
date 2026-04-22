'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [magicSent, setMagicSent] = useState(false)
  const [magicLoading, setMagicLoading] = useState(false)
  const router = useRouter()

  async function routeByRole(userId: string) {
    const supabase = createClient()
    const { data: prof } = await supabase
      .from('profiles').select('role, onboarded').eq('id', userId).single()
    if (prof?.role === 'coach') {
      router.replace('/coach')
    } else if (!prof?.onboarded) {
      router.replace('/welcome')
    } else {
      router.replace('/client')
    }
  }

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        routeByRole(session.user.id)
      } else {
        setChecking(false)
      }
    })

    // Only fire on explicit SIGNED_IN (magic link / OAuth) — not on INITIAL_SESSION or TOKEN_REFRESHED
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) routeByRole(session.user.id)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Неверный email или пароль')
      setLoading(false)
    } else {
      await routeByRole(data.user.id)
    }
  }

  async function handleMagicLink() {
    if (!email.trim()) { setError('Введи email'); return }
    setMagicLoading(true)
    setError('')
    const supabase = createClient()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${siteUrl}/auth/callback` },
    })
    setMagicLoading(false)
    if (error) {
      setError('Ошибка отправки. Проверь email.')
    } else {
      setMagicSent(true)
    }
  }

  const inputStyle: React.CSSProperties = {
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-card)',
    border: '1px solid var(--divider)',
    fontFamily: 'var(--font-text)',
    fontWeight: 400,
    fontSize: '16px',
    color: 'var(--text-primary)',
    padding: '14px 20px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  }

  if (checking) return null

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px' }}>
        <div style={{
          width: '100%',
          maxWidth: '400px',
          background: 'var(--bg-card)',
          border: '1px solid var(--divider)',
          borderRadius: '24px',
          padding: '40px 32px',
          boxShadow: 'var(--shadow-modal)',
        }}>
          <h1 style={{
            fontFamily: "'Playfair Display', 'Bodoni 72', 'Didot', serif",
            fontWeight: 600,
            fontStyle: 'italic',
            fontSize: '48px',
            margin: '0 0 8px 0',
            lineHeight: 1.05,
            letterSpacing: '-1px',
          }}>
            <span style={{ color: 'var(--text-primary)' }}>Log</span><span style={{ color: 'var(--accent-primary)' }}>In.</span>
          </h1>
          <p style={{
            fontFamily: 'var(--font-text)',
            fontWeight: 300,
            color: 'var(--text-secondary)',
            fontSize: '20px',
            margin: '0 0 32px 0',
          }}>
            Your personal training story
          </p>

          {magicSent ? (
            <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '15px', color: 'var(--success)', textAlign: 'center', margin: '8px 0 0' }}>
              Ссылка отправлена на {email} — проверь почту
            </p>
          ) : (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="login-input" style={inputStyle} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="login-input" style={inputStyle} />

            {error && (
              <p style={{ color: 'var(--error)', fontSize: '14px', margin: 0, paddingLeft: '16px', fontFamily: 'var(--font-text)', fontWeight: 300 }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="login-btn pressable" style={{
              position: 'relative',
              overflow: 'hidden',
              width: '100%',
              borderRadius: '999px',
              background: 'var(--accent-primary)',
              border: 'none',
              color: 'var(--text-inverse)',
              fontFamily: 'var(--font-text)',
              fontWeight: 500,
              fontSize: '17px',
              padding: '14px 20px',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '8px',
            }}>
              <span aria-hidden style={{
                position: 'absolute', inset: 0, borderRadius: '999px',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 60%)',
                pointerEvents: 'none', zIndex: 1,
              }} />
              <span style={{ position: 'relative', zIndex: 2 }}>
                {loading ? 'Logging in...' : 'Log In'}
              </span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--divider)' }} />
              <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '12px', color: 'var(--text-tertiary)' }}>или</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--divider)' }} />
            </div>

            <button type="button" onClick={handleMagicLink} disabled={magicLoading} className="pressable" style={{
              width: '100%',
              borderRadius: '999px',
              background: 'transparent',
              border: '1px solid var(--divider)',
              color: 'var(--accent-primary)',
              fontFamily: 'var(--font-text)',
              fontWeight: 300,
              fontSize: '15px',
              padding: '13px 20px',
              cursor: magicLoading ? 'not-allowed' : 'pointer',
            }}>
              {magicLoading ? 'Отправляем...' : 'Войти по ссылке на почту'}
            </button>
          </form>
          )}
        </div>
      </div>
    </div>
  )
}
