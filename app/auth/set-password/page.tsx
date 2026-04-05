'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'

export default function SetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Пароли не совпадают')
      return
    }
    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов')
      return
    }
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    router.push('/client')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.6)',
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: '999px',
    padding: '14px 20px',
    fontFamily: 'Chillax, sans-serif',
    fontWeight: 300,
    fontSize: '15px',
    color: '#2d1f0e',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', padding: '24px 20px',
      }}>
        <div style={{
          width: '100%', maxWidth: '400px',
          background: 'rgba(255,255,255,0.55)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.7)',
          borderRadius: '24px',
          padding: '36px 32px',
        }}>
          <h1 style={{
            fontFamily: 'Epilogue, sans-serif',
            fontWeight: 300,
            fontStyle: 'italic',
            fontSize: '38px',
            color: '#2d1f0e',
            margin: '0 0 8px',
            lineHeight: 1.1,
          }}>
            Добро пожаловать.
          </h1>
          <p style={{
            fontFamily: 'Chillax, sans-serif',
            fontWeight: 300,
            fontSize: '16px',
            color: 'rgba(45,31,14,0.5)',
            margin: '0 0 32px',
          }}>
            Придумай пароль для входа
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="password"
              placeholder="Новый пароль"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Повтори пароль"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              style={inputStyle}
            />

            {error && (
              <p style={{
                fontFamily: 'Chillax, sans-serif',
                fontWeight: 300,
                fontSize: '13px',
                color: '#8a2520',
                margin: '0',
                textAlign: 'center',
              }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '8px',
                width: '100%',
                padding: '14px',
                borderRadius: '999px',
                background: '#7a4a20',
                color: '#fff',
                border: 'none',
                fontFamily: 'Chillax, sans-serif',
                fontWeight: 500,
                fontSize: '16px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              {loading ? 'Входим...' : 'Войти в приложение'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
