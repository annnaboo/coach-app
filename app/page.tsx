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

  useEffect(() => {
    const supabase = createClient()

    // Check existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        router.replace('/client')
      } else {
        setChecking(false)
      }
    })

    // Listen only for explicit sign-in events (not INITIAL_SESSION / TOKEN_REFRESHED)
    // to avoid competing navigations when a coach already has a session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) router.replace('/client')
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Неверный email или пароль')
      setLoading(false)
    } else {
      router.push('/client')
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
    borderRadius: '999px',
    background: 'rgba(0,0,0,0.05)',
    border: '1px solid rgba(0,0,0,0.08)',
    fontFamily: 'Chillax, sans-serif',
    fontWeight: 300,
    fontSize: '16px',
    color: '#2d1f0e',
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
          background: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: '24px',
          padding: '40px 32px',
        }}>
          <h1 style={{
            fontFamily: 'Epilogue, sans-serif',
            fontWeight: 400,
            fontSize: '38px',
            margin: '0 0 8px 0',
            lineHeight: 1.1,
          }}>
            <span style={{ color: '#2d1f0e' }}>Log</span><span style={{ color: '#7a4a20' }}>In.</span>
          </h1>
          <p style={{
            fontFamily: 'Chillax, sans-serif',
            fontWeight: 300,
            color: 'rgba(45,31,14,0.55)',
            fontSize: '20px',
            margin: '0 0 32px 0',
          }}>
            Your personal training story
          </p>

          {magicSent ? (
            <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '15px', color: '#1a7a3c', textAlign: 'center', margin: '8px 0 0' }}>
              Ссылка отправлена на {email} — проверь почту
            </p>
          ) : (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="login-input" style={inputStyle} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="login-input" style={inputStyle} />

            {error && (
              <p style={{ color: '#ff6b6b', fontSize: '14px', margin: 0, paddingLeft: '16px', fontFamily: 'Chillax, sans-serif', fontWeight: 300 }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="login-btn" style={{
              position: 'relative',
              overflow: 'hidden',
              width: '100%',
              borderRadius: '999px',
              background: '#7a4a20',
              border: 'none',
              color: '#ffffff',
              fontFamily: 'Chillax, sans-serif',
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
              <div style={{ flex: 1, height: '1px', background: 'rgba(45,31,14,0.1)' }} />
              <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.3)' }}>или</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(45,31,14,0.1)' }} />
            </div>

            <button type="button" onClick={handleMagicLink} disabled={magicLoading} style={{
              width: '100%',
              borderRadius: '999px',
              background: 'transparent',
              border: '1px solid rgba(122,74,32,0.3)',
              color: '#7a4a20',
              fontFamily: 'Chillax, sans-serif',
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
