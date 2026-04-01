'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

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

  const inputStyle: React.CSSProperties = {
    borderRadius: '999px',
    background: 'rgba(8,22,14,0.55)',
    border: 'none',
    fontFamily: 'Chillax, sans-serif',
    fontWeight: 300,
    fontSize: '16px',
    color: '#ffffff',
    padding: '14px 20px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `
          radial-gradient(ellipse 110% 60% at 50% -5%, #16573a 0%, transparent 65%),
          radial-gradient(ellipse 50% 50% at 100% 100%, #020d07 0%, transparent 55%),
          linear-gradient(170deg, #0b3d28 0%, #051610 100%)
        `,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '24px',
          padding: '40px 32px',
        }}
      >
        <h1
          style={{
            fontFamily: 'Epilogue, sans-serif',
            fontWeight: 400,
            color: '#CFA764',
            fontSize: '38px',
            margin: '0 0 8px 0',
            lineHeight: 1.1,
          }}
        >
          LogIn.
        </h1>
        <p
          style={{
            fontFamily: 'Chillax, sans-serif',
            fontWeight: 300,
            color: '#ffffff',
            fontSize: '20px',
            margin: '0 0 32px 0',
          }}
        >
          Your personal training story
        </p>

        <form
          onSubmit={handleLogin}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="login-input"
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="login-input"
            style={inputStyle}
          />

          {error && (
            <p
              style={{
                color: '#ff6b6b',
                fontSize: '14px',
                margin: 0,
                paddingLeft: '16px',
                fontFamily: 'Chillax, sans-serif',
                fontWeight: 300,
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="login-btn"
            style={{
              position: 'relative',
              overflow: 'hidden',
              width: '100%',
              borderRadius: '999px',
              background: 'rgba(207,167,100,0.72)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: 'none',
              color: '#000000',
              fontFamily: 'Chillax, sans-serif',
              fontWeight: 500,
              fontSize: '17px',
              padding: '14px 20px',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '8px',
            }}
          >
            {/* top highlight */}
            <span
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '999px',
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 60%)',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />
            <span style={{ position: 'relative', zIndex: 2 }}>
              {loading ? 'Logging in...' : 'Log In'}
            </span>
          </button>
        </form>
      </div>
    </div>
  )
}
