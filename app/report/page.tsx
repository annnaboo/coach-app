'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'
import BottomNav from '@/app/components/BottomNav'

const sectionLabel: React.CSSProperties = {
  fontFamily: 'var(--font-text)',
  fontWeight: 600,
  fontSize: '11px',
  letterSpacing: '0.4px',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
  margin: '0 0 12px',
}

const solidCard: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--divider)',
  borderRadius: '20px',
  padding: '22px',
  marginBottom: '12px',
  boxShadow: 'var(--shadow-soft)',
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
  const [prefilled, setPrefilled] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { router.push('/'); return }
      setUserId(session.user.id)
      const [profRes, lastReportRes] = await Promise.all([
        supabase.from('profiles').select('height_cm').eq('id', session.user.id).single(),
        supabase.from('weekly_reports')
          .select('weight, height_cm, chest, waist, waist_navel, hips, left_thigh, right_thigh, left_arm, right_arm')
          .eq('player_id', session.user.id)
          .order('week_start', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])
      if (profRes.data?.height_cm) setHeightCm(String(profRes.data.height_cm))
      if (lastReportRes.data) {
        const r = lastReportRes.data
        if (r.weight) setWeight(String(r.weight))
        if (r.height_cm) setHeightCm(String(r.height_cm))
        if (r.chest) setChest(String(r.chest))
        if (r.waist) setWaist(String(r.waist))
        if (r.waist_navel) setWaistNavel(String(r.waist_navel))
        if (r.hips) setHips(String(r.hips))
        if (r.left_thigh) setLeftThigh(String(r.left_thigh))
        if (r.right_thigh) setRightThigh(String(r.right_thigh))
        if (r.left_arm) setLeftArm(String(r.left_arm))
        if (r.right_arm) setRightArm(String(r.right_arm))
        setPrefilled(true)
      }
    })
  }, [])

  function getWeekStart(): string {
    // #63 — use local date, not toISOString() (which gives UTC and shifts to prev week at night)
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(d)
    monday.setDate(diff)
    monday.setHours(0, 0, 0, 0)
    const y = monday.getFullYear()
    const m = String(monday.getMonth() + 1).padStart(2, '0')
    const dd = String(monday.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
  }

  function handlePhotoChange(position: PhotoPosition, file: File) {
    setPhotos(prev => ({ ...prev, [position]: file }))
    setPreviews(prev => ({ ...prev, [position]: URL.createObjectURL(file) }))
  }

  async function handleSubmit() {
    if (!userId) return
    setLoading(true)
    const supabase = createClient()
    const weekStart = getWeekStart()

    // #64 — check for an existing report this week before doing anything
    const { data: existing } = await supabase
      .from('weekly_reports')
      .select('id')
      .eq('player_id', userId)
      .eq('week_start', weekStart)
      .maybeSingle()

    if (existing) {
      alert('Ты уже отправила отчёт за эту неделю. Можно только один отчёт в неделю.')
      setLoading(false)
      return
    }

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

    // #62 — upload photos first, but track paths so we can clean up on insert failure
    const photo_front = await uploadPhoto(photos.front, 'front')
    const photo_side = await uploadPhoto(photos.side, 'side')
    const photo_back = await uploadPhoto(photos.back, 'back')

    const parsedHeight = heightCm ? parseFloat(heightCm) : null

    const { error: insertError } = await supabase.from('weekly_reports').insert({
      player_id: userId,
      week_start: weekStart,
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

    if (insertError) {
      // #62 — clean up orphaned files from Storage since the DB row wasn't created
      const uploadedPaths = [photo_front, photo_side, photo_back].filter(Boolean) as string[]
      if (uploadedPaths.length > 0) {
        await supabase.storage.from('reports').remove(uploadedPaths)
      }
      console.error('Insert error:', insertError)
      alert('Ошибка сохранения: ' + insertError.message)
      setLoading(false)
      return
    }

    if (parsedHeight) {
      await supabase.from('profiles').update({ height_cm: parsedHeight }).eq('id', userId)
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

  const numInputStyle: React.CSSProperties = {
    width: '80px',
    background: 'var(--bg-card-soft)',
    border: '1px solid var(--divider)',
    borderRadius: '999px',
    padding: '7px 12px',
    textAlign: 'center',
    fontFamily: 'var(--font-text)',
    fontSize: '13px',
    color: 'var(--text-primary)',
    outline: 'none',
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, padding: '24px 16px 100px' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>

          {/* HEADER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
            <button
              onClick={() => router.push('/client')}
              className="pressable"
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--divider)', borderRadius: '999px',
                color: 'var(--text-secondary)', fontFamily: 'var(--font-text)',
                fontWeight: 300, fontSize: '13px', padding: '8px 18px',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              ← назад
            </button>
            <div>
              <h1 style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, color: 'var(--text-primary)', fontSize: '24px', margin: 0 }}>
                Отчёт недели
              </h1>
              <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, color: 'var(--text-tertiary)', fontSize: '12px', margin: 0 }}>
                {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>

          {success ? (
            <div style={{ ...solidCard, textAlign: 'center', padding: '40px 24px' }}>
              <p style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, color: 'var(--text-primary)', fontSize: '22px', margin: '0 0 20px' }}>
                Отчёт отправлен ✓
              </p>
              <button
                onClick={() => router.push('/client')}
                className="pressable"
                style={{
                  padding: '12px 28px', borderRadius: '999px', background: 'var(--accent-primary)',
                  color: '#fff', border: 'none', fontFamily: 'var(--font-text)',
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
                          background: preview ? 'transparent' : 'var(--bg-card-soft)',
                          border: '1px dashed var(--divider)', overflow: 'hidden',
                        }}>
                          <div style={{ paddingBottom: '100%', position: 'relative' }}>
                            {preview ? (
                              <img src={preview} alt={labelMap[pos]} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }} />
                            ) : (
                              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="var(--text-tertiary)" strokeWidth="1.5" fill="none" />
                                  <circle cx="12" cy="13" r="4" stroke="var(--text-tertiary)" strokeWidth="1.5" fill="none" />
                                </svg>
                              </div>
                            )}
                            <input type="file" accept="image/*"
                              onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoChange(pos, f) }}
                              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                            />
                          </div>
                        </div>
                        <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '6px', fontFamily: 'var(--font-text)', fontWeight: 300 }}>
                          {labelMap[pos]}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* PARAMS */}
              <div style={solidCard} onClick={() => setActiveTooltip(null)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
                  <p style={{ ...sectionLabel, margin: 0 }}>ПАРАМЕТРЫ</p>
                  {prefilled && (
                    <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '10px', color: 'var(--text-tertiary)', margin: 0, letterSpacing: '0.3px' }}>
                      Данные из прошлой недели
                    </p>
                  )}
                </div>
                {FIELDS.map(({ label, unit, value, setter }, i) => {
                  const hasTooltip = !!TOOLTIPS[label]
                  const isOpen = activeTooltip === label
                  return (
                    <div key={label} style={{ marginBottom: i < FIELDS.length - 1 ? '14px' : 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', color: 'var(--text-secondary)' }}>
                            {label}
                          </span>
                          {hasTooltip && (
                            <button
                              onClick={e => { e.stopPropagation(); setActiveTooltip(isOpen ? null : label) }}
                              style={{
                                width: '18px', height: '18px', borderRadius: '50%',
                                background: 'var(--accent-soft-bg)',
                                border: 'none',
                                color: 'var(--accent-primary)',
                                fontFamily: 'var(--font-text)',
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
                            style={numInputStyle}
                          />
                          <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', color: 'var(--text-tertiary)', width: '20px' }}>
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
                          <div style={{
                            position: 'absolute', top: 0, left: '14px',
                            width: 0, height: 0,
                            borderLeft: '6px solid transparent',
                            borderRight: '6px solid transparent',
                            borderBottom: '6px solid var(--bg-card)',
                            filter: 'drop-shadow(0 -1px 1px rgba(0,0,0,0.06))',
                          }} />
                          <div style={{
                            marginTop: '6px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--divider)',
                            borderRadius: '12px',
                            padding: '8px 12px',
                            fontFamily: 'var(--font-text)',
                            fontWeight: 300,
                            fontSize: '11px',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.55,
                            boxShadow: 'var(--shadow-soft)',
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
              <div style={solidCard}>
                <p style={sectionLabel}>ЗАМЕТКИ</p>
                <textarea
                  placeholder="Как прошла неделя? Что чувствуешь?"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{
                    width: '100%', minHeight: '100px', background: 'var(--bg-card-soft)',
                    border: '1px solid var(--divider)', borderRadius: '16px', padding: '14px 16px',
                    fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '14px',
                    color: 'var(--text-primary)', outline: 'none', resize: 'none',
                    boxSizing: 'border-box', lineHeight: 1.65,
                  }}
                />
              </div>

              {/* SUBMIT */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="pressable"
                style={{
                  width: '100%', padding: '14px', borderRadius: '999px',
                  background: 'var(--accent-primary)', color: '#fff', border: 'none',
                  fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '16px',
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
      <BottomNav />
    </div>
  )
}
