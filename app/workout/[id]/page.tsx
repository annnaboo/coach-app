'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'

function LiquidField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <span style={{ fontSize: '10px', color: 'rgba(45,31,14,0.3)', letterSpacing: '1px', textTransform: 'uppercase' as const, paddingLeft: '12px', fontFamily: 'Chillax, sans-serif', fontWeight: 300 }}>
        {label}
      </span>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="—"
        className="no-spin"
        style={{ background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '999px', padding: '10px 16px', textAlign: 'center' as const, width: '100%', fontFamily: 'Chillax, sans-serif', fontSize: '15px', color: '#2d1f0e', outline: 'none', boxSizing: 'border-box' as const }}
      />
    </div>
  )
}

const FIELD_LABELS: Record<string, string> = {
  w1: 'П1 кг', w2: 'П2 кг', w3: 'П3 кг', reps: 'Повторы',
}

export default function DynamicWorkoutPage() {
  const params = useParams()
  const workoutId = params.id as string
  const [userId, setUserId] = useState<string | null>(null)
  const [workout, setWorkout] = useState<any>(null)
  const [exercises, setExercises] = useState<any[]>([])
  const [fields, setFields] = useState<Record<string, Record<string, string>>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/'); return }
      setUserId(data.user.id)

      const [workoutRes, logsRes] = await Promise.all([
        supabase.from('workouts').select('*').eq('id', workoutId).single(),
        supabase.from('workout_logs').select('*').eq('player', data.user.id).order('saved_at', { ascending: false }),
      ])

      if (!workoutRes.data) { router.push('/client'); return }
      setWorkout(workoutRes.data)

      let exs: any[] = []
      try {
        exs = Array.isArray(workoutRes.data.exercises)
          ? workoutRes.data.exercises
          : JSON.parse(workoutRes.data.exercises || '[]')
      } catch {}
      setExercises(exs)

      // Pre-fill from latest saved logs
      const latest: Record<string, Record<string, string>> = {}
      const savedSet: Record<string, boolean> = {}
      ;(logsRes.data || []).forEach((row: any) => {
        const key = row.exercise_id
        if (!latest[key]) {
          latest[key] = { w1: row.w1 || '', w2: row.w2 || '', w3: row.w3 || '', reps: row.reps || '' }
          savedSet[key] = true
        }
      })
      setFields(latest)
      setSaved(savedSet)
      setLoading(false)
    })
  }, [workoutId])

  function getKey(ex: any, idx: number): string {
    return ex.id || ex.name || `ex-${idx}`
  }

  function getFieldsForSets(setsStr: string): string[] {
    const n = parseInt(setsStr) || 3
    return [...Array.from({ length: Math.min(n, 3) }, (_, i) => `w${i + 1}`), 'reps']
  }

  function setField(key: string, field: string, value: string) {
    setFields(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }))
    setSaved(prev => ({ ...prev, [key]: false }))
  }

  async function saveExercise(ex: any, idx: number) {
    if (!userId) return
    const key = getKey(ex, idx)
    setSaving(key)
    const supabase = createClient()
    const f = fields[key] || {}
    await supabase.from('workout_logs').insert({
      player: userId,
      exercise_id: key,
      w1: f.w1 || null,
      w2: f.w2 || null,
      w3: f.w3 || null,
      reps: f.reps || null,
      saved_at: new Date().toISOString(),
    })
    setSaved(prev => ({ ...prev, [key]: true }))
    setSaving(null)
  }

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
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>

          {/* HEADER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
            <button
              onClick={() => router.push('/client')}
              style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: '999px', color: 'rgba(45,31,14,0.5)', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', padding: '8px 18px', cursor: 'pointer', flexShrink: 0 }}
            >
              ← назад
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, color: '#2d1f0e', fontSize: '22px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {workout?.title || 'Тренировка'}
              </h1>
              {workout?.subtitle && (
                <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.4)', fontSize: '12px', margin: 0 }}>{workout.subtitle}</p>
              )}
            </div>
          </div>

          {/* EMPTY STATE */}
          {exercises.length === 0 && (
            <div style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: '20px', padding: '48px 22px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '18px', color: '#2d1f0e', margin: '0 0 8px' }}>Упражнения скоро появятся</p>
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', color: 'rgba(45,31,14,0.4)', margin: 0 }}>Тренер ещё добавляет упражнения</p>
            </div>
          )}

          {/* EXERCISE CARDS */}
          {exercises.map((ex, idx) => {
            const key = getKey(ex, idx)
            const isExpanded = expanded[key] !== false
            const isSaved = saved[key]
            const isSaving = saving === key
            const fieldsArr = getFieldsForSets(ex.sets || '3')
            const f = fields[key] || {}

            return (
              <div key={key} style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: '20px', padding: '18px 20px', marginBottom: '10px' }}>

                {/* Header row */}
                <div
                  onClick={() => setExpanded(prev => ({ ...prev, [key]: !isExpanded }))}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: isExpanded ? '16px' : 0 }}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isSaved ? 'rgba(26,122,60,0.12)' : 'rgba(122,74,32,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '13px', color: isSaved ? '#1a7a3c' : '#7a4a20' }}>
                      {isSaved ? '✓' : String(idx + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '15px', color: '#2d1f0e', margin: 0 }}>{ex.name}</p>
                    {ex.muscleGroup && (
                      <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: 'rgba(45,31,14,0.4)', margin: 0 }}>{ex.muscleGroup}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {(ex.sets || ex.reps) && (
                      <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: 'rgba(45,31,14,0.35)', background: 'rgba(0,0,0,0.04)', borderRadius: '999px', padding: '3px 9px' }}>
                        {ex.sets}×{ex.reps || '?'}
                      </span>
                    )}
                    <span style={{ color: 'rgba(45,31,14,0.25)', fontSize: '12px' }}>{isExpanded ? '▴' : '▾'}</span>
                  </div>
                </div>

                {isExpanded && (
                  <>
                    {/* Why / description */}
                    {ex.description && (
                      <div style={{ background: 'rgba(122,74,32,0.05)', borderRadius: '12px', padding: '10px 14px', marginBottom: '14px' }}>
                        <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.55)', margin: 0, lineHeight: 1.6 }}>{ex.description}</p>
                      </div>
                    )}

                    {/* YouTube link */}
                    {ex.youtube && (
                      <a href={ex.youtube} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: '#7a4a20', textDecoration: 'none', marginBottom: '14px' }}>
                        ▶ Смотреть видео
                      </a>
                    )}

                    {/* Input fields */}
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${fieldsArr.length}, 1fr)`, gap: '8px', marginBottom: '12px' }}>
                      {fieldsArr.map(field => (
                        <LiquidField
                          key={field}
                          label={FIELD_LABELS[field] || field}
                          value={f[field] || ''}
                          onChange={v => setField(key, field, v)}
                        />
                      ))}
                    </div>

                    {/* Save button */}
                    <button
                      onClick={() => saveExercise(ex, idx)}
                      disabled={isSaving}
                      style={{
                        width: '100%', padding: '10px', borderRadius: '999px', border: 'none',
                        background: isSaved ? 'rgba(26,122,60,0.1)' : '#7a4a20',
                        color: isSaved ? '#1a7a3c' : '#fff',
                        fontFamily: 'Chillax, sans-serif', fontWeight: 500, fontSize: '13px',
                        cursor: isSaving ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      {isSaving ? 'Сохраняем...' : isSaved ? '✓ Сохранено' : 'Сохранить'}
                    </button>
                  </>
                )}
              </div>
            )
          })}

          {/* FINISH BUTTON */}
          {exercises.length > 0 && (
            <button
              onClick={() => router.push('/client')}
              style={{ width: '100%', padding: '14px', borderRadius: '999px', background: 'rgba(122,74,32,0.08)', border: '1px solid rgba(122,74,32,0.2)', color: '#7a4a20', fontFamily: 'Chillax, sans-serif', fontWeight: 500, fontSize: '15px', cursor: 'pointer', marginTop: '8px' }}
            >
              Завершить тренировку
            </button>
          )}

        </div>
      </div>
    </div>
  )
}
