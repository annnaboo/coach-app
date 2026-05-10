'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'

export default function SetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // PKCE flow: token_hash is in query params (new Supabase default)
    const params = new URLSearchParams(window.location.search)
    const token_hash = params.get('token_hash')
    const type = params.get('type') as 'invite' | 'recovery' | null

    if (token_hash && type === 'invite') {
      // #77 — verify OTP but stay on this page so the user can set a password
      supabase.auth.verifyOtp({ token_hash, type: 'invite' }).then(({ error }) => {
        if (!error) setSessionReady(true)
      })
      return
    }

    if (token_hash && type === 'recovery') {
      supabase.auth.verifyOtp({ token_hash, type: 'recovery' }).then(({ error }) => {
        if (!error) setSessionReady(true)
      })
      return
    }

    // Implicit flow: tokens in hash fragment (older Supabase config)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // #77 — SIGNED_IN fires for invite/magic-link hash flows; don't redirect away,
      // instead unlock the form so the user can choose a password
      if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && session) {
        setSessionReady(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit() {
    if (password !== confirm) {
      setError('Пароли не совпадают')
      return
    }
    if (password.length < 6) {
      setError('Минимум 6 символов')
      return
    }

    setLoading(true)
    setError('')
    const supabase = createClient()

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    // Создать профиль если не существует
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // #76 — ignoreDuplicates:true silently skips existing rows, leaving role unset.
      // Use ignoreDuplicates:false (default) so the role is always written.
      await supabase.from('profiles').upsert({
        id: user.id,
        role: 'client',
        onboarded: false,
      }, { onConflict: 'id', ignoreDuplicates: false })
    }

    router.push('/welcome')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 18px',
    borderRadius: '999px',
    border: 'none',
    background: 'var(--bg-card)',
    fontFamily: 'var(--font-text)',
    fontSize: '16px',
    color: 'var(--text-primary)',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '400px', padding: '24px 16px' }}>
        <div style={{
          background: 'var(--bg-card)',
                              border: '1px solid var(--divider)',
          borderRadius: 'var(--radius-lg)',
          padding: '32px 24px',
        }}>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontWeight: 300,
            fontSize: '38px',
            color: 'var(--text-primary)',
            margin: '0 0 8px',
            lineHeight: 1,
          }}>
            Добро пожаловать.
          </h1>
          <p style={{
            fontFamily: 'var(--font-text)',
            fontWeight: 300,
            fontSize: '16px',
            color: 'var(--text-secondary)',
            margin: '0 0 28px',
          }}>
            Придумай пароль для входа
          </p>

          {!sessionReady && (
            <p style={{ fontFamily: 'var(--font-text)', fontSize: '13px', color: 'var(--text-tertiary)', textAlign: 'center', marginBottom: '16px' }}>
              Загружаем твой аккаунт...
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Новый пароль"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Повтори пароль"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              style={inputStyle}
            />
          </div>

          {error && (
            <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, color: 'var(--error)', fontSize: '13px', marginBottom: '12px', textAlign: 'center' }}>
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !sessionReady}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '999px',
              background: sessionReady ? 'var(--accent-primary)' : 'rgba(220,80,0,0.3)',
              color: '#fff',
              border: 'none',
              fontFamily: 'var(--font-text)',
              fontWeight: 500,
              fontSize: '16px',
              cursor: loading || !sessionReady ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Сохраняем...' : !sessionReady ? 'Загрузка...' : 'Войти в приложение'}
          </button>
        </div>
      </div>
    </div>
  )
}
