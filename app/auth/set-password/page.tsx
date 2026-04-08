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

    // Supabase автоматически обрабатывает #access_token из URL
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setSessionReady(true)
      }
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })

    // Также проверить текущую сессию
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
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
      await supabase.from('profiles').upsert({
        id: user.id,
        role: 'client',
        onboarded: false,
      }, { onConflict: 'id', ignoreDuplicates: true })
    }

    router.push('/welcome')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 18px',
    borderRadius: '999px',
    border: 'none',
    background: 'rgba(255,255,255,0.6)',
    fontFamily: 'Chillax, sans-serif',
    fontSize: '16px',
    color: '#2d1f0e',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '400px', padding: '24px 16px' }}>
        <div style={{
          background: 'rgba(255,255,255,0.55)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.7)',
          borderRadius: '24px',
          padding: '32px 24px',
        }}>
          <h1 style={{
            fontFamily: 'Epilogue, sans-serif',
            fontStyle: 'italic',
            fontWeight: 300,
            fontSize: '38px',
            color: '#2d1f0e',
            margin: '0 0 8px',
            lineHeight: 1,
          }}>
            Добро пожаловать.
          </h1>
          <p style={{
            fontFamily: 'Chillax, sans-serif',
            fontWeight: 300,
            fontSize: '16px',
            color: 'rgba(45,31,14,0.5)',
            margin: '0 0 28px',
          }}>
            Придумай пароль для входа
          </p>

          {!sessionReady && (
            <p style={{ fontFamily: 'Chillax, sans-serif', fontSize: '13px', color: 'rgba(45,31,14,0.4)', textAlign: 'center', marginBottom: '16px' }}>
              Загружаем твой аккаунт...
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            <input
              type="password"
              placeholder="Новый пароль"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Повтори пароль"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              style={inputStyle}
            />
          </div>

          {error && (
            <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: '#8a2520', fontSize: '13px', marginBottom: '12px', textAlign: 'center' }}>
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
              background: sessionReady ? '#7a4a20' : 'rgba(122,74,32,0.4)',
              color: '#fff',
              border: 'none',
              fontFamily: 'Chillax, sans-serif',
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
