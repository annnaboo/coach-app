'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'

const card: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--divider)',
  borderRadius: '20px',
  padding: '22px',
  marginBottom: '12px',
  boxShadow: 'var(--shadow-soft)',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-card-soft)',
  border: '1px solid var(--divider)',
  borderRadius: '999px',
  padding: '12px 18px',
  fontFamily: 'var(--font-text)',
  fontWeight: 300,
  fontSize: '15px',
  color: 'var(--text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-text)',
  fontWeight: 600,
  fontSize: '11px',
  letterSpacing: '0.4px',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
  display: 'block',
  marginBottom: '8px',
}

const btnPrimary: React.CSSProperties = {
  padding: '11px 24px',
  borderRadius: '999px',
  background: 'var(--accent-primary)',
  color: '#fff',
  border: 'none',
  fontFamily: 'var(--font-text)',
  fontWeight: 500,
  fontSize: '14px',
  cursor: 'pointer',
}

export default function SettingsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [nameSaving, setNameSaving] = useState(false)
  const [nameSuccess, setNameSuccess] = useState(false)

  const [avatarUploading, setAvatarUploading] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwdError, setPwdError] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdSuccess, setPwdSuccess] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/'); return }
      setUserId(data.user.id)
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', data.user.id)
        .single()
      if (profile) {
        setName(profile.name || '')
        setAvatarUrl(profile.avatar_url || null)
      }
      setLoading(false)
    })
  }, [])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setAvatarUploading(true)
    const supabase = createClient()
    const path = `${userId}/avatar.jpg`
    await supabase.storage.from('avatars').remove([path])
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: true })
    if (!error) {
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = pub.publicUrl + '?t=' + Date.now()
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
      setAvatarUrl(url)
    }
    setAvatarUploading(false)
  }

  async function saveName() {
    if (!userId || !name.trim()) return
    setNameSaving(true)
    const supabase = createClient()
    await supabase.from('profiles').update({ name: name.trim() }).eq('id', userId)
    setNameSaving(false)
    setNameSuccess(true)
    setTimeout(() => setNameSuccess(false), 2000)
  }

  async function savePassword() {
    setPwdError('')
    if (newPassword.length < 6) { setPwdError('Минимум 6 символов'); return }
    if (newPassword !== confirmPassword) { setPwdError('Пароли не совпадают'); return }
    setPwdSaving(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { setPwdError(error.message); setPwdSaving(false); return }
    setPwdSaving(false)
    setPwdSuccess(true)
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => setPwdSuccess(false), 2000)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const initials = name
    ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  if (loading) return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ fontFamily: 'var(--font-text)', color: 'var(--text-tertiary)', fontSize: '16px' }}>Загружаем...</p>
      </div>
    </div>
  )

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, padding: '28px 20px 60px' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>

          {/* HEADER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
            <button
              onClick={() => router.push('/client')}
              className="pressable"
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--divider)', borderRadius: '999px',
                color: 'var(--text-secondary)', fontFamily: 'var(--font-text)',
                fontWeight: 300, fontSize: '13px', padding: '8px 18px', cursor: 'pointer', flexShrink: 0,
              }}
            >
              ← назад
            </button>
            <h1 style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, color: 'var(--text-primary)', fontSize: '24px', margin: 0 }}>
              Настройки
            </h1>
          </div>

          {/* AVATAR */}
          <div style={{ ...card, textAlign: 'center' }}>
            <div
              style={{
                width: '80px', height: '80px', borderRadius: '50%',
                margin: '0 auto 14px',
                background: 'var(--accent-soft-bg)',
                overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid rgba(139,30,63,0.2)',
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontFamily: 'var(--font-primary)', fontWeight: 300, fontSize: '28px', color: 'var(--accent-primary)' }}>{initials}</span>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={avatarUploading}
              className="pressable"
              style={{
                padding: '8px 20px', borderRadius: '999px',
                background: 'var(--accent-soft-bg)', border: '1px solid rgba(139,30,63,0.2)',
                color: 'var(--accent-primary)', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {avatarUploading ? 'Загружаем...' : 'Изменить фото'}
            </button>
          </div>

          {/* NAME */}
          <div style={card}>
            <span style={labelStyle}>Имя</span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ ...inputStyle, marginBottom: '12px' }}
            />
            <button
              onClick={saveName}
              disabled={nameSaving}
              className="pressable"
              style={{ ...btnPrimary, opacity: nameSaving ? 0.6 : 1 }}
            >
              {nameSuccess ? '✓ Сохранено' : nameSaving ? 'Сохраняем...' : 'Сохранить'}
            </button>
          </div>

          {/* PASSWORD */}
          <div style={card}>
            <span style={labelStyle}>Смена пароля</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
              <input
                type="password"
                placeholder="Новый пароль"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                style={inputStyle}
              />
              <input
                type="password"
                placeholder="Повтори пароль"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                style={inputStyle}
              />
            </div>
            {pwdError && (
              <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '12px', color: 'var(--error)', margin: '0 0 10px' }}>{pwdError}</p>
            )}
            <button
              onClick={savePassword}
              disabled={pwdSaving}
              className="pressable"
              style={{ ...btnPrimary, opacity: pwdSaving ? 0.6 : 1 }}
            >
              {pwdSuccess ? '✓ Изменён' : pwdSaving ? 'Сохраняем...' : 'Изменить пароль'}
            </button>
          </div>

          {/* LOGOUT */}
          <button
            onClick={handleLogout}
            className="pressable"
            style={{
              width: '100%', padding: '14px', borderRadius: '999px',
              background: 'var(--error-bg)', color: 'var(--error)',
              border: '1px solid rgba(178,58,72,0.15)',
              fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '15px',
              cursor: 'pointer', marginTop: '8px',
            }}
          >
            Выйти из аккаунта
          </button>

        </div>
      </div>
    </div>
  )
}
