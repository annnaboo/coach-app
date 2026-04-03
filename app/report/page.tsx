'use client'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'

const sectionLabel: React.CSSProperties = {
  fontFamily: 'Chillax, sans-serif',
  fontWeight: 300,
  fontSize: '11px',
  letterSpacing: '2px',
  textTransform: 'uppercase',
  color: 'rgba(45,31,14,0.35)',
  margin: '0 0 12px',
}

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.6)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(0,0,0,0.06)',
  borderRadius: '24px',
  padding: '24px',
  marginBottom: '12px',
}

type PhotoPosition = 'front' | 'side' | 'back'

export default function ReportPage() {
  const [weight, setWeight] = useState('')
  const [chest, setChest] = useState('')
  const [waist, setWaist] = useState('')
  const [hips, setHips] = useState('')
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<{ front: File | null; side: File | null; back: File | null }>({
    front: null, side: null, back: null,
  })
  const [previews, setPreviews] = useState<{ front: string; side: string; back: string }>({
    front: '', side: '', back: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/')
      } else {
        setUserId(data.user.id)
      }
    })
  }, [])

  function getWeekStart(): string {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(d)
    monday.setDate(diff)
    monday.setHours(0, 0, 0, 0)
    return monday.toISOString().slice(0, 10)
  }

  function handlePhotoChange(position: PhotoPosition, file: File) {
    const url = URL.createObjectURL(file)
    setPhotos(prev => ({ ...prev, [position]: file }))
    setPreviews(prev => ({ ...prev, [position]: url }))
  }

  async function handleSubmit() {
    if (!userId) return
    setLoading(true)

    const supabase = createClient()

    let photo_front: string | null = null
    let photo_side: string | null = null
    let photo_back: string | null = null

    const positions: { key: PhotoPosition; setter: (v: string | null) => void }[] = [
      { key: 'front', setter: v => { photo_front = v } },
      { key: 'side', setter: v => { photo_side = v } },
      { key: 'back', setter: v => { photo_back = v } },
    ]

    for (const { key, setter } of positions) {
      const file = photos[key]
      if (file) {
        const path = `${userId}/${Date.now()}_${key}.jpg`
        const { error: uploadError } = await supabase.storage
          .from('reports')
          .upload(path, file, { contentType: 'image/jpeg' })
        if (!uploadError) {
          const { data: signedData } = await supabase.storage
            .from('reports')
            .createSignedUrl(path, 3600 * 24 * 365)
          if (signedData) setter(signedData.signedUrl)
        }
      }
    }

    await supabase.from('weekly_reports').insert({
      player_id: userId,
      week_start: getWeekStart(),
      weight: parseFloat(weight) || null,
      chest: parseFloat(chest) || null,
      waist: parseFloat(waist) || null,
      hips: parseFloat(hips) || null,
      notes,
      photo_front,
      photo_side,
      photo_back,
    })

    setLoading(false)
    setSuccess(true)
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, padding: '24px 16px 48px' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>

          {/* HEADER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
            <button
              onClick={() => router.push('/client')}
              style={{
                background: 'rgba(0,0,0,0.06)',
                border: 'none',
                borderRadius: '999px',
                color: 'rgba(45,31,14,0.5)',
                fontFamily: 'Chillax, sans-serif',
                fontWeight: 300,
                fontSize: '13px',
                padding: '8px 18px',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              назад
            </button>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, color: '#2d1f0e', fontSize: '24px', margin: 0 }}>
                Отчёт недели
              </h1>
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.4)', fontSize: '12px', margin: 0 }}>
                {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>

          {/* SUCCESS STATE */}
          {success ? (
            <div style={{ ...glassCard, textAlign: 'center', padding: '40px 24px' }}>
              <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, color: '#2d1f0e', fontSize: '22px', margin: '0 0 20px' }}>
                Отчёт отправлен ✓
              </p>
              <button
                onClick={() => router.push('/client')}
                style={{
                  padding: '12px 28px',
                  borderRadius: '999px',
                  background: '#7a4a20',
                  color: '#fff',
                  border: 'none',
                  fontFamily: 'Chillax, sans-serif',
                  fontWeight: 500,
                  fontSize: '15px',
                  cursor: 'pointer',
                }}
              >
                Вернуться
              </button>
            </div>
          ) : (
            <>
              {/* PHOTOS */}
              <div style={{ marginBottom: '12px' }}>
                <p style={sectionLabel}>ФОТО</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  {(['front', 'side', 'back'] as PhotoPosition[]).map((pos) => {
                    const labelMap = { front: 'Спереди', side: 'Сбоку', back: 'Сзади' }
                    const preview = previews[pos]
                    return (
                      <div key={pos}>
                        <div style={{
                          position: 'relative',
                          borderRadius: '16px',
                          background: preview ? 'transparent' : 'rgba(0,0,0,0.05)',
                          border: '1px dashed rgba(0,0,0,0.12)',
                          overflow: 'hidden',
                        }}>
                          <div style={{ paddingBottom: '100%', position: 'relative' }}>
                            {preview ? (
                              <img
                                src={preview}
                                alt={labelMap[pos]}
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  borderRadius: '16px',
                                }}
                              />
                            ) : (
                              <div style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="rgba(45,31,14,0.25)" strokeWidth="1.5" fill="none" />
                                  <circle cx="12" cy="13" r="4" stroke="rgba(45,31,14,0.25)" strokeWidth="1.5" fill="none" />
                                </svg>
                              </div>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={e => {
                                const file = e.target.files?.[0]
                                if (file) handlePhotoChange(pos, file)
                              }}
                              style={{
                                position: 'absolute',
                                inset: 0,
                                opacity: 0,
                                cursor: 'pointer',
                                width: '100%',
                                height: '100%',
                              }}
                            />
                          </div>
                        </div>
                        <p style={{ fontSize: '10px', color: 'rgba(45,31,14,0.35)', textAlign: 'center', marginTop: '6px', fontFamily: 'Chillax, sans-serif', fontWeight: 300 }}>
                          {labelMap[pos]}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* PARAMS */}
              <div style={glassCard}>
                <p style={sectionLabel}>ПАРАМЕТРЫ</p>
                {[
                  { label: 'Вес', value: weight, setter: setWeight },
                  { label: 'Грудь', value: chest, setter: setChest },
                  { label: 'Талия', value: waist, setter: setWaist },
                  { label: 'Бёдра', value: hips, setter: setHips },
                ].map(({ label, value, setter }, i, arr) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: i < arr.length - 1 ? '12px' : 0,
                    }}
                  >
                    <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', color: 'rgba(45,31,14,0.6)' }}>
                      {label}
                    </span>
                    <input
                      type="number"
                      value={value}
                      onChange={e => setter(e.target.value)}
                      placeholder="—"
                      style={{
                        width: '100px',
                        background: 'rgba(0,0,0,0.05)',
                        border: 'none',
                        borderRadius: '999px',
                        padding: '8px 14px',
                        textAlign: 'center',
                        fontFamily: 'Chillax, sans-serif',
                        fontSize: '14px',
                        color: '#2d1f0e',
                        outline: 'none',
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* NOTES */}
              <div style={glassCard}>
                <p style={sectionLabel}>ЗАМЕТКИ</p>
                <textarea
                  placeholder="Как прошла неделя? Что чувствуешь?"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    background: 'rgba(0,0,0,0.04)',
                    border: 'none',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    fontFamily: 'Chillax, sans-serif',
                    fontWeight: 300,
                    fontSize: '14px',
                    color: '#2d1f0e',
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box',
                    lineHeight: 1.65,
                  }}
                />
              </div>

              {/* SUBMIT */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
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
                  marginTop: '16px',
                }}
              >
                {loading ? 'Отправляем...' : 'Отправить отчёт'}
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
