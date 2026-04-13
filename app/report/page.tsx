'use client'
import { useState, useEffect } from 'react'
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
  background: 'rgba(255,255,255,0.55)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.7)',
  borderRadius: '20px',
  padding: '22px',
  marginBottom: '12px',
}

type PhotoPosition = 'front' | 'side' | 'back'

const TOOLTIPS: Record<string, string> = {
  'Вес': '',
  'Рост': 'Измеряется один раз и сохраняется в профиле. Измени при необходимости',
  'Грудь': 'Измеряй по самой выступающей части груди, лента параллельно полу',
  'Талия': 'Самое узкое место, обычно на 2–3 см выше пупка. Не задерживай дыхание',
  'Пупок': 'Строго по линии пупка, лента параллельно полу',
  'Бёдра': 'По самой широкой части ягодиц, стопы вместе',
  'Лев. бедро': 'Самая широкая часть левого бедра, стоя прямо',
  'Прав. бедро': 'Самая широкая часть правого бедра, стоя прямо',
  'Лев. рука': 'Бицепс левой руки в расслабленном состоянии, середина между плечом и локтем',
  'Прав. рука': 'Бицепс правой руки в расслабленном состоянии, середина между плечом и локтем',
}

export default function ReportPage() {
  const [weight, setWeight] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [chest, setChest] = useState('')
  const [waist, setWaist] = useState('')
  const [hips, setHips] = useState('')
  const [waistNavel, setWaistNavel] = useState('')
  const [leftThigh, setLeftThigh] = useState('')
  const [rightThigh, setRightThigh] = useState('')
  const [leftArm, setLeftArm] = useState('')
  const [rightArm, setRightArm] = useState('')
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
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { router.push('/'); return }
      setUserId(session.user.id)
      const { data: prof } = await supabase
        .from('profiles').select('height_cm').eq('id', session.user.id).single()
      if (prof?.height_cm) setHeightCm(String(prof.height_cm))
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
    setPhotos(prev => ({ ...prev, [position]: file }))
    setPreviews(prev => ({ ...prev, [position]: URL.createObjectURL(file) }))
  }

  async function handleSubmit() {
    if (!userId) return
    setLoading(true)
    const supabase = createClient()

    const uploadPhoto = async (file: File | null, position: string): Promise<string | null> => {
      if (!file) return null
      const path = `${userId}/${Date.now()}_${position}`
      const { error } = await supabase.storage
        .from('reports')
        .upload(path, file, { contentType: file.type || 'image/jpeg' })
      if (error) {
        console.error('Upload error:', error)
        return null
      }
      return path
    }

    const photo_front = await uploadPhoto(photos.front, 'front')
    const photo_side = await uploadPhoto(photos.side, 'side')
    const photo_back = await uploadPhoto(photos.back, 'back')

    const parsedHeight = heightCm ? parseFloat(heightCm) : null

    const { error: insertError } = await supabase.from('weekly_reports').insert({
      player_id: userId,
      week_start: getWeekStart(),
      weight: weight ? parseFloat(weight) : null,
      height_cm: parsedHeight,
      chest: chest ? parseFloat(chest) : null,
      waist: waist ? parseFloat(waist) : null,
      hips: hips ? parseFloat(hips) : null,
      waist_navel: waistNavel ? parseFloat(waistNavel) : null,
      left_thigh: leftThigh ? parseFloat(leftThigh) : null,
      right_thigh: rightThigh ? parseFloat(rightThigh) : null,
      left_arm: leftArm ? parseFloat(leftArm) : null,
      right_arm: rightArm ? parseFloat(rightArm) : null,
      notes: notes || null,
      photo_front,
      photo_side,
      photo_back,
    })

    if (!insertError && parsedHeight) {
      await supabase.from('profiles').update({ height_cm: parsedHeight }).eq('id', userId)
    }

    if (insertError) {
      console.error('Insert error:', insertError)
      alert('Ошибка сохранения: ' + insertError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    setSuccess(true)
    setTimeout(() => router.push('/client'), 2000)
  }

  const FIELDS = [
    { label: 'Вес', unit: 'кг', value: weight, setter: setWeight },
    { label: 'Рост', unit: 'см', value: heightCm, setter: setHeightCm },
    { label: 'Грудь', unit: 'см', value: chest, setter: setChest },
    { label: 'Талия', unit: 'см', value: waist, setter: setWaist },
    { label: 'Пупок', unit: 'см', value: waistNavel, setter: setWaistNavel },
    { label: 'Бёдра', unit: 'см', value: hips, setter: setHips },
    { label: 'Лев. бедро', unit: 'см', value: leftThigh, setter: setLeftThigh },
    { label: 'Прав. бедро', unit: 'см', value: rightThigh, setter: setRightThigh },
    { label: 'Лев. рука', unit: 'см', value: leftArm, setter: setLeftArm },
    { label: 'Прав. рука', unit: 'см', value: rightArm, setter: setRightArm },
  ]

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
                background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '999px',
                color: 'rgba(45,31,14,0.5)', fontFamily: 'Chillax, sans-serif',
                fontWeight: 300, fontSize: '13px', padding: '8px 18px',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              ← назад
            </button>
            <div>
              <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, color: '#2d1f0e', fontSize: '24px', margin: 0 }}>
                Отчёт недели
              </h1>
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.4)', fontSize: '12px', margin: 0 }}>
                {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>

          {success ? (
            <div style={{ ...glassCard, textAlign: 'center', padding: '40px 24px' }}>
              <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, color: '#2d1f0e', fontSize: '22px', margin: '0 0 20px' }}>
                Отчёт отправлен ✓
              </p>
              <button
                onClick={() => router.push('/client')}
                style={{
                  padding: '12px 28px', borderRadius: '999px', background: '#7a4a20',
                  color: '#fff', border: 'none', fontFamily: 'Chillax, sans-serif',
                  fontWeight: 500, fontSize: '15px', cursor: 'pointer',
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
                  {(['front', 'side', 'back'] as PhotoPosition[]).map(pos => {
                    const labelMap = { front: 'Спереди', side: 'Сбоку', back: 'Сзади' }
                    const preview = previews[pos]
                    return (
                      <div key={pos}>
                        <div style={{
                          position: 'relative', borderRadius: '16px',
                          background: preview ? 'transparent' : 'rgba(0,0,0,0.05)',
                          border: '1px dashed rgba(0,0,0,0.12)', overflow: 'hidden',
                        }}>
                          <div style={{ paddingBottom: '100%', position: 'relative' }}>
                            {preview ? (
                              <img src={preview} alt={labelMap[pos]} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }} />
                            ) : (
                              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="rgba(45,31,14,0.25)" strokeWidth="1.5" fill="none" />
                                  <circle cx="12" cy="13" r="4" stroke="rgba(45,31,14,0.25)" strokeWidth="1.5" fill="none" />
                                </svg>
                              </div>
                            )}
                            <input type="file" accept="image/*"
                              onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoChange(pos, f) }}
                              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
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
              <div style={glassCard} onClick={() => setActiveTooltip(null)}>
                <p style={sectionLabel}>ПАРАМЕТРЫ</p>
                {FIELDS.map(({ label, unit, value, setter }, i) => {
                  const hasTooltip = !!TOOLTIPS[label]
                  const isOpen = activeTooltip === label
                  return (
                    <div key={label} style={{ marginBottom: i < FIELDS.length - 1 ? '14px' : 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', color: 'rgba(45,31,14,0.6)' }}>
                            {label}
                          </span>
                          {hasTooltip && (
                            <button
                              onClick={e => { e.stopPropagation(); setActiveTooltip(isOpen ? null : label) }}
                              style={{
                                width: '18px', height: '18px', borderRadius: '50%',
                                background: 'rgba(122,74,32,0.1)',
                                border: 'none',
                                color: '#7a4a20',
                                fontFamily: 'Chillax, sans-serif',
                                fontSize: '10px',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                padding: 0, flexShrink: 0,
                              }}
                            >
                              ?
                            </button>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="number"
                            value={value}
                            onChange={e => setter(e.target.value)}
                            placeholder="—"
                            className="no-spin"
                            style={{
                              width: '80px', background: 'rgba(0,0,0,0.05)', border: 'none',
                              borderRadius: '999px', padding: '7px 12px', textAlign: 'center',
                              fontFamily: 'Chillax, sans-serif', fontSize: '13px', color: '#2d1f0e', outline: 'none',
                            }}
                          />
                          <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: 'rgba(45,31,14,0.35)', width: '20px' }}>
                            {unit}
                          </span>
                        </div>
                      </div>

                      {/* TOOLTIP */}
                      {isOpen && hasTooltip && (
                        <div
                          onClick={e => e.stopPropagation()}
                          style={{ position: 'relative', marginTop: '8px' }}
                        >
                          {/* Arrow */}
                          <div style={{
                            position: 'absolute', top: 0, left: '14px',
                            width: 0, height: 0,
                            borderLeft: '6px solid transparent',
                            borderRight: '6px solid transparent',
                            borderBottom: '6px solid rgba(255,255,255,0.95)',
                            filter: 'drop-shadow(0 -1px 1px rgba(0,0,0,0.06))',
                          }} />
                          <div style={{
                            marginTop: '6px',
                            background: 'rgba(255,255,255,0.95)',
                            border: '1px solid rgba(0,0,0,0.07)',
                            borderRadius: '12px',
                            padding: '8px 12px',
                            fontFamily: 'Chillax, sans-serif',
                            fontWeight: 300,
                            fontSize: '11px',
                            color: 'rgba(45,31,14,0.6)',
                            lineHeight: 1.55,
                            boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
                          }}>
                            {TOOLTIPS[label]}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* NOTES */}
              <div style={glassCard}>
                <p style={sectionLabel}>ЗАМЕТКИ</p>
                <textarea
                  placeholder="Как прошла неделя? Что чувствуешь?"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{
                    width: '100%', minHeight: '100px', background: 'rgba(0,0,0,0.04)',
                    border: 'none', borderRadius: '16px', padding: '14px 16px',
                    fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '14px',
                    color: '#2d1f0e', outline: 'none', resize: 'none',
                    boxSizing: 'border-box', lineHeight: 1.65,
                  }}
                />
              </div>

              {/* SUBMIT */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  width: '100%', padding: '14px', borderRadius: '999px',
                  background: '#7a4a20', color: '#fff', border: 'none',
                  fontFamily: 'Chillax, sans-serif', fontWeight: 500, fontSize: '16px',
                  cursor: loading ? 'not-allowed' : 'pointer', marginTop: '16px',
                  opacity: loading ? 0.7 : 1,
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
