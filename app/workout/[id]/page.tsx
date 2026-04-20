'use client'
import { useEffect, useState, Fragment } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'

function PrevGoalHeader({ prev }: { prev: Record<string, string> }) {
  const weights = ['w1', 'w2', 'w3'].map(k => prev[k]).filter(v => v && v !== '')
  if (weights.length === 0) return null
  const maxW = Math.max(...weights.map(Number))
  const goal = (maxW + 2.5).toFixed(1).replace(/\.0$/, '')
  return (
    <div style={{ background: 'rgba(122,74,32,0.05)', borderRadius: '12px', padding: '10px 14px', marginBottom: '14px', display: 'flex', gap: '24px' }}>
      <div>
        <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase' as const, color: 'rgba(45,31,14,0.3)', margin: '0 0 3px' }}>Было</p>
        <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '14px', color: 'rgba(45,31,14,0.55)', margin: 0 }}>{weights.join(' / ')} кг</p>
      </div>
      <div>
        <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase' as const, color: 'rgba(45,31,14,0.3)', margin: '0 0 3px' }}>Цель</p>
        <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 500, fontSize: '14px', color: '#7a4a20', margin: 0 }}>{goal} кг</p>
      </div>
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
  const [prevLogs, setPrevLogs] = useState<Record<string, Record<string, string>>>({})
  const [fields, setFields] = useState<Record<string, Record<string, string>>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
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

      // Build prev logs for placeholders/PrevGoalHeader — fields start empty (no accidental re-save)
      const prev: Record<string, Record<string, string>> = {}
      ;(logsRes.data || []).forEach((row: any) => {
        const key = row.exercise_id
        if (!prev[key]) {
          prev[key] = { w1: row.w1 || '', w2: row.w2 || '', w3: row.w3 || '', reps: row.reps || '' }
        }
      })
      setPrevLogs(prev)
      setFields({})
      setSaved({})
      setLoading(false)
    })
  }, [workoutId])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

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

  function stepWeight(key: string, field: string, delta: number) {
    setFields(prev => {
      const cur = parseFloat(prev[key]?.[field] || '')
      const fallback = parseFloat(prevLogs[key]?.[field] || '')
      const base = !isNaN(cur) ? cur : (!isNaN(fallback) ? fallback : 0)
      const next = Math.max(0, Math.round((base + delta) * 10) / 10)
      return { ...prev, [key]: { ...(prev[key] || {}), [field]: String(next) } }
    })
    setSaved(prev => ({ ...prev, [key]: false }))
  }

  function copyFirst(key: string, fields3: string[]) {
    const val = fields[key]?.[fields3[0]] || prevLogs[key]?.[fields3[0]] || ''
    if (!val) return
    setFields(prev => ({
      ...prev,
      [key]: { ...(prev[key] || {}), ...Object.fromEntries(fields3.map(f => [f, val])) },
    }))
    setSaved(prev => ({ ...prev, [key]: false }))
  }

  async function saveExercise(ex: any, idx: number) {
    if (!userId) return
    const key = getKey(ex, idx)
    const f = fields[key] || {}
    const fieldsArr = getFieldsForSets(ex.sets || '3')
    const setWeightFields = fieldsArr.filter(fld => fld !== 'reps')

    const hasAnyWeight = setWeightFields.some(fld => !!f[fld])
    if (!hasAnyWeight) {
      showToast('Введите вес хотя бы в одном подходе')
      return
    }

    setSaving(key)
    const supabase = createClient()

    const { error } = await supabase.from('workout_logs').upsert({
      player: userId,
      exercise_id: key,
      w1: parseFloat(f.w1 || '') || null,
      w2: parseFloat(f.w2 || '') || null,
      w3: parseFloat(f.w3 || '') || null,
      reps: parseInt(f.reps || '') || null,
      saved_at: new Date().toISOString(),
      workout_id: workoutId,
    }, { onConflict: 'player,exercise_id' })

    if (!error) {
      setSaved(prev => ({ ...prev, [key]: true }))
    }
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

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: '#2d1f0e', color: '#fff', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', borderRadius: '999px', padding: '10px 22px', boxShadow: '0 4px 20px rgba(0,0,0,0.18)', pointerEvents: 'none' }}>
          {toast}
        </div>
      )}

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
            const p = prevLogs[key] || {}

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

                {isExpanded && (() => {
                  const setWeightFields = fieldsArr.filter(fld => fld !== 'reps')
                  const doneSets = setWeightFields.filter(fld => !!f[fld]).length
                  return (
                    <>
                      {/* Prev / Goal header */}
                      <PrevGoalHeader prev={p} />

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

                      {/* Progress label */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.3)', margin: 0 }}>
                          Прогресс занятия
                        </p>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                          <span style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '22px', color: '#2d1f0e' }}>{doneSets}</span>
                          <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', color: 'rgba(45,31,14,0.3)' }}>/{setWeightFields.length}</span>
                        </div>
                      </div>

                      {/* Table */}
                      <div style={{ marginBottom: '4px' }}>
                        {/* Column headers */}
                        <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 26px', gap: '8px', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid rgba(45,31,14,0.06)' }}>
                          {['СЕТ', 'ВЕС (кг)', 'ПОВТОРЫ', ''].map((h, i) => (
                            <p key={i} style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.25)', margin: 0, textAlign: 'center' }}>{h}</p>
                          ))}
                        </div>

                        {/* Set rows */}
                        {setWeightFields.map((wField, setIdx) => {
                          const isDone = !!f[wField]
                          const stepBtn: React.CSSProperties = { background: 'none', border: 'none', color: 'rgba(45,31,14,0.45)', fontFamily: 'Chillax, sans-serif', fontSize: '18px', fontWeight: 300, cursor: 'pointer', padding: '4px 8px', lineHeight: 1, flexShrink: 0 }
                          return (
                            <Fragment key={wField}>
                              <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 26px', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                                <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '16px', color: '#2d1f0e', margin: 0, textAlign: 'center' }}>{setIdx + 1}</p>
                                {/* Weight cell with ±2.5 steppers */}
                                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.05)', borderRadius: '8px', overflow: 'hidden' }}>
                                  <button type="button" onClick={() => stepWeight(key, wField, -2.5)} style={stepBtn}>−</button>
                                  <input
                                    type="number"
                                    value={f[wField] || ''}
                                    onChange={e => setField(key, wField, e.target.value)}
                                    placeholder={p[wField] || '—'}
                                    autoFocus={setIdx === 0}
                                    className="no-spin"
                                    style={{ background: 'transparent', border: 'none', flex: 1, minWidth: 0, textAlign: 'center', fontFamily: 'Chillax, sans-serif', fontSize: '15px', color: '#2d1f0e', outline: 'none', padding: '8px 0' }}
                                  />
                                  <button type="button" onClick={() => stepWeight(key, wField, +2.5)} style={stepBtn}>+</button>
                                </div>
                                {setIdx === 0 ? (
                                  <input
                                    type="number"
                                    value={f.reps || ''}
                                    onChange={e => setField(key, 'reps', e.target.value)}
                                    placeholder={p.reps || '—'}
                                    className="no-spin"
                                    style={{ background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '8px', padding: '8px', textAlign: 'center', fontFamily: 'Chillax, sans-serif', fontSize: '15px', color: '#2d1f0e', outline: 'none', width: '100%', boxSizing: 'border-box' as const }}
                                  />
                                ) : (
                                  <div style={{ background: 'rgba(0,0,0,0.02)', borderRadius: '8px', padding: '8px', textAlign: 'center', fontFamily: 'Chillax, sans-serif', fontSize: '15px', color: 'rgba(45,31,14,0.4)' }}>
                                    {f.reps || p.reps || '—'}
                                  </div>
                                )}
                                <p style={{ margin: 0, textAlign: 'center', fontSize: '14px', lineHeight: 1 }}>{isDone ? '✅' : '⭕'}</p>
                              </div>
                              {/* Copy-to-all button after set 1 */}
                              {setIdx === 0 && setWeightFields.length > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-2px', marginBottom: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => copyFirst(key, setWeightFields)}
                                    style={{ background: 'none', border: 'none', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: 'rgba(45,31,14,0.35)', cursor: 'pointer', padding: '0', letterSpacing: '0.5px', textDecoration: 'underline', textUnderlineOffset: '2px' }}
                                  >
                                    ↓ во все подходы
                                  </button>
                                </div>
                              )}
                            </Fragment>
                          )
                        })}
                      </div>

                      {/* Add set button */}
                      <button style={{
                        width: '100%', padding: '11px', borderRadius: '999px',
                        background: 'transparent', border: '1px solid rgba(45,31,14,0.15)',
                        fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px',
                        color: 'rgba(45,31,14,0.4)', cursor: 'pointer', letterSpacing: '1px', marginTop: '12px',
                      }}>
                        + ДОБАВИТЬ ПОДХОД
                      </button>

                      {/* Save button */}
                      <button
                        onClick={() => saveExercise(ex, idx)}
                        disabled={isSaving}
                        style={{
                          width: '100%', padding: '10px', borderRadius: '999px', border: isSaved ? '1px solid rgba(122,74,32,0.3)' : 'none',
                          background: isSaved ? 'rgba(122,74,32,0.15)' : '#7a4a20',
                          color: isSaved ? '#7a4a20' : '#fff',
                          fontFamily: 'Chillax, sans-serif', fontWeight: 500, fontSize: '13px',
                          cursor: isSaving ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                          marginTop: '10px',
                        }}
                      >
                        {isSaving ? 'Сохраняем...' : isSaved ? '✓ Сохранено' : 'Сохранить'}
                      </button>


                    </>
                  )
                })()}
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
