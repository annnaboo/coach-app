'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.55)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.7)',
  borderRadius: '20px',
  padding: '22px',
  marginBottom: '12px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.6)',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: '999px',
  padding: '12px 18px',
  fontFamily: 'Chillax, sans-serif',
  fontWeight: 300,
  fontSize: '15px',
  color: '#2d1f0e',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'Chillax, sans-serif',
  fontWeight: 300,
  fontSize: '10px',
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: 'rgba(45,31,14,0.35)',
  display: 'block',
  marginBottom: '8px',
}

const btnPrimary: React.CSSProperties = {
  padding: '11px 24px',
  borderRadius: '999px',
  background: '#7a4a20',
  color: '#fff',
  border: 'none',
  fontFamily: 'Chillax, sans-serif',
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
        <p style={{ fontFamily: 'Chillax, sans-serif', color: 'rgba(45,31,14,0.4)', fontSize: '16px' }}>Загружаем...</p>
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
              style={{
                background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.7)', borderRadius: '999px',
                color: 'rgba(45,31,14,0.5)', fontFamily: 'Chillax, sans-serif',
                fontWeight: 300, fontSize: '13px', padding: '8px 18px', cursor: 'pointer', flexShrink: 0,
              }}
            >
              ← назад
            </button>
            <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, color: '#2d1f0e', fontSize: '24px', margin: 0 }}>
              Настройки
            </h1>
          </div>

          {/* AVATAR */}
          <div style={{ ...glass, textAlign: 'center' }}>
            <div
              style={{
                width: '80px', height: '80px', borderRadius: '50%',
                margin: '0 auto 14px',
                background: 'rgba(122,74,32,0.12)',
                overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid rgba(122,74,32,0.2)',
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 300, fontSize: '28px', color: '#7a4a20' }}>{initials}</span>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={avatarUploading}
              style={{
                padding: '8px 20px', borderRadius: '999px',
                background: 'rgba(122,74,32,0.1)', border: '1px solid rgba(122,74,32,0.2)',
                color: '#7a4a20', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {avatarUploading ? 'Загружаем...' : 'Изменить фото'}
            </button>
          </div>

          {/* NAME */}
          <div style={glass}>
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
              style={{ ...btnPrimary, opacity: nameSaving ? 0.6 : 1 }}
            >
              {nameSuccess ? '✓ Сохранено' : nameSaving ? 'Сохраняем...' : 'Сохранить'}
            </button>
          </div>

          {/* PASSWORD */}
          <div style={glass}>
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
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: '#8a2520', margin: '0 0 10px' }}>{pwdError}</p>
            )}
            <button
              onClick={savePassword}
              disabled={pwdSaving}
              style={{ ...btnPrimary, opacity: pwdSaving ? 0.6 : 1 }}
            >
              {pwdSuccess ? '✓ Изменён' : pwdSaving ? 'Сохраняем...' : 'Изменить пароль'}
            </button>
          </div>

          {/* LOGOUT */}
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '14px', borderRadius: '999px',
              background: 'rgba(192,57,43,0.1)', color: '#8a2520',
              border: '1px solid rgba(192,57,43,0.15)',
              fontFamily: 'Chillax, sans-serif', fontWeight: 500, fontSize: '15px',
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
