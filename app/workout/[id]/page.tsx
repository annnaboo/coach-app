'use client'
import { useEffect, useState, Fragment } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'
import BottomNav from '@/app/components/BottomNav'

function PrevGoalHeader({ prev }: { prev: Record<string, string> }) {
  const weights = ['w1', 'w2', 'w3'].map(k => prev[k]).filter(v => v && v !== '')
  if (weights.length === 0) return null
  const maxW = Math.max(...weights.map(Number))
  const goal = (maxW + 2.5).toFixed(1).replace(/\.0$/, '')
  return (
    <div style={{ background: 'var(--accent-soft-bg)', borderRadius: '12px', padding: '10px 14px', marginBottom: '14px', display: 'flex', gap: '24px' }}>
      <div>
        <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase' as const, color: 'var(--text-tertiary)', margin: '0 0 3px' }}>Было</p>
        <p style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>{weights.join(' / ')} кг</p>
      </div>
      <div>
        <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase' as const, color: 'var(--text-tertiary)', margin: '0 0 3px' }}>Цель</p>
        <p style={{ fontFamily: 'var(--font-primary)', fontWeight: 500, fontSize: '14px', color: 'var(--accent-primary)', margin: 0 }}>{goal} кг</p>
      </div>
    </div>
  )
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
  const [showCompletion, setShowCompletion] = useState(false)
  // #49 — extra sets added dynamically per exercise (on top of what's in ex.sets)
  const [extraSets, setExtraSets] = useState<Record<string, number>>({})
  const [difficulty, setDifficulty] = useState<number | null>(null)
  const [sessionNotes, setSessionNotes] = useState('')
  const [savingSession, setSavingSession] = useState(false)
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

  function getFieldsForSets(setsStr: string, key: string): string[] {
    const base = parseInt(setsStr) || 3
    const extra = extraSets[key] || 0
    const total = Math.min(base + extra, 8) // cap at 8 sets
    return [...Array.from({ length: total }, (_, i) => `w${i + 1}`), 'reps']
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
    const fieldsArr = getFieldsForSets(ex.sets || '3', key)
    const setWeightFields = fieldsArr.filter(fld => fld !== 'reps')

    const hasAnyWeight = setWeightFields.some(fld => !!f[fld])
    if (!hasAnyWeight) {
      showToast('Введите вес хотя бы в одном подходе')
      return
    }

    setSaving(key)
    const supabase = createClient()

    const { error } = await supabase.from('workout_logs').insert({
      player: userId,
      exercise_id: key,
      w1: parseFloat(f.w1 || '') || null,
      w2: parseFloat(f.w2 || '') || null,
      w3: parseFloat(f.w3 || '') || null,
      reps: parseInt(f.reps || '') || null,
      saved_at: new Date().toISOString(),
      workout_id: workoutId,
    })

    if (!error) {
      setSaved(prev => ({ ...prev, [key]: true }))
    }
    setSaving(null)
  }

  async function saveSession() {
    if (!userId || !workoutId) return
    setSavingSession(true)
    const supabase = createClient()
    try {
      await supabase.from('workout_sessions').insert({
        player_id: userId,
        workout_id: workoutId,
        completed_at: new Date().toISOString(),
        difficulty: difficulty ?? null,
        notes: sessionNotes || null,
      })
    } catch {}
    setSavingSession(false)
  }

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

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: 'var(--text-primary)', color: '#fff', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', borderRadius: '999px', padding: '10px 22px', boxShadow: 'var(--shadow-modal)', pointerEvents: 'none' }}>
          {toast}
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 1, padding: '28px 20px 60px' }}>
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>

          {/* HEADER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
            <button
              onClick={() => router.push('/client')}
              className="pressable"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--divider)', borderRadius: '999px', color: 'var(--text-secondary)', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', padding: '8px 18px', cursor: 'pointer', flexShrink: 0 }}
            >
              ← назад
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, color: 'var(--text-primary)', fontSize: '22px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {workout?.title || 'Тренировка'}
              </h1>
              {workout?.subtitle && (
                <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, color: 'var(--text-tertiary)', fontSize: '12px', margin: 0 }}>{workout.subtitle}</p>
              )}
            </div>
          </div>

          {/* EMPTY STATE */}
          {exercises.length === 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--divider)', borderRadius: '20px', padding: '48px 22px', textAlign: 'center', boxShadow: 'var(--shadow-soft)' }}>
              <p style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '18px', color: 'var(--text-primary)', margin: '0 0 8px' }}>Упражнения скоро появятся</p>
              <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>Тренер ещё добавляет упражнения</p>
            </div>
          )}

          {/* EXERCISE CARDS */}
          {exercises.map((ex, idx) => {
            const key = getKey(ex, idx)
            const isExpanded = expanded[key] !== false
            const isSaved = saved[key]
            const isSaving = saving === key
            const fieldsArr = getFieldsForSets(ex.sets || '3', key)
            const f = fields[key] || {}
            const p = prevLogs[key] || {}

            return (
              <div key={key} className="card-enter" style={{ background: 'var(--bg-card)', border: '1px solid var(--divider)', borderRadius: '20px', padding: '18px 20px', marginBottom: '10px', boxShadow: 'var(--shadow-soft)' }}>

                {/* Header row */}
                <div
                  onClick={() => setExpanded(prev => ({ ...prev, [key]: !isExpanded }))}
                  className="pressable"
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: isExpanded ? '16px' : 0 }}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isSaved ? 'var(--success-bg)' : 'var(--accent-soft-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '13px', color: isSaved ? 'var(--success)' : 'var(--accent-primary)' }}>
                      {isSaved ? '✓' : String(idx + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '15px', color: 'var(--text-primary)', margin: 0 }}>{ex.name}</p>
                    {ex.muscleGroup && (
                      <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', color: 'var(--text-tertiary)', margin: 0 }}>{ex.muscleGroup}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {(ex.sets || ex.reps) && (
                      <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', color: 'var(--text-tertiary)', background: 'var(--bg-card-soft)', borderRadius: '999px', padding: '3px 9px' }}>
                        {ex.sets}×{ex.reps || '?'}
                      </span>
                    )}
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>{isExpanded ? '▴' : '▾'}</span>
                  </div>
                </div>

                {isExpanded && (() => {
                  const setWeightFields = fieldsArr.filter(fld => fld !== 'reps')
                  const doneSets = setWeightFields.filter(fld => !!f[fld]).length
                  return (
                    <>
                      {/* Prev / Goal header */}
                      <PrevGoalHeader prev={p} />

                      {/* Description */}
                      {ex.description && (
                        <div style={{ background: 'var(--bg-card-soft)', borderRadius: '12px', padding: '10px 14px', marginBottom: '14px' }}>
                          <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>{ex.description}</p>
                        </div>
                      )}

                      {/* YouTube link */}
                      {ex.youtube && (
                        <a href={ex.youtube} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '12px', color: 'var(--accent-primary)', textDecoration: 'none', marginBottom: '14px' }}>
                          ▶ Смотреть видео
                        </a>
                      )}

                      {/* Progress label */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '10px', letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>
                          Прогресс занятия
                        </p>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                          <span className="number-mount" style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '22px', color: 'var(--text-primary)' }}>{doneSets}</span>
                          <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', color: 'var(--text-tertiary)' }}>/{setWeightFields.length}</span>
                        </div>
                      </div>

                      {/* Table */}
                      <div style={{ marginBottom: '4px' }}>
                        {/* Column headers */}
                        <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 26px', gap: '8px', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid var(--divider)' }}>
                          {['СЕТ', 'ВЕС (кг)', 'ПОВТОРЫ', ''].map((h, i) => (
                            <p key={i} style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0, textAlign: 'center' }}>{h}</p>
                          ))}
                        </div>

                        {/* Set rows */}
                        {setWeightFields.map((wField, setIdx) => {
                          const isDone = !!f[wField]
                          const stepBtn: React.CSSProperties = { background: 'none', border: 'none', color: 'var(--text-secondary)', fontFamily: 'var(--font-text)', fontSize: '18px', fontWeight: 300, cursor: 'pointer', padding: '4px 8px', lineHeight: 1, flexShrink: 0 }
                          return (
                            <Fragment key={wField}>
                              <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 26px', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                                <p style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '16px', color: 'var(--text-primary)', margin: 0, textAlign: 'center' }}>{setIdx + 1}</p>
                                {/* Weight cell with ±2.5 steppers */}
                                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card-soft)', border: '1px solid var(--divider)', borderRadius: '8px', overflow: 'hidden' }}>
                                  <button type="button" onClick={() => stepWeight(key, wField, -2.5)} style={stepBtn}>−</button>
                                  <input
                                    type="number"
                                    value={f[wField] || ''}
                                    onChange={e => setField(key, wField, e.target.value)}
                                    placeholder={p[wField] || '—'}
                                    className="no-spin"
                                    style={{ background: 'transparent', border: 'none', flex: 1, minWidth: 0, textAlign: 'center', fontFamily: 'var(--font-text)', fontSize: '15px', color: 'var(--text-primary)', outline: 'none', padding: '8px 0' }}
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
                                    style={{ background: 'var(--bg-card-soft)', border: '1px solid var(--divider)', borderRadius: '8px', padding: '8px', textAlign: 'center', fontFamily: 'var(--font-text)', fontSize: '15px', color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box' as const }}
                                  />
                                ) : (
                                  <div style={{ background: 'var(--bg-card-soft)', borderRadius: '8px', padding: '8px', textAlign: 'center', fontFamily: 'var(--font-text)', fontSize: '15px', color: 'var(--text-tertiary)' }}>
                                    {f.reps || p.reps || '—'}
                                  </div>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {isDone ? (
                                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                                      <circle cx="11" cy="11" r="11" fill="var(--success)" />
                                      <path d="M6.5 11l3 3 5.5-5.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  ) : (
                                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                                      <circle cx="11" cy="11" r="10" stroke="var(--divider)" strokeWidth="1.5" fill="none" />
                                    </svg>
                                  )}
                                </div>
                              </div>
                              {/* Copy-to-all button after set 1 */}
                              {setIdx === 0 && setWeightFields.length > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-2px', marginBottom: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => copyFirst(key, setWeightFields)}
                                    style={{ background: 'none', border: 'none', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '10px', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '0', letterSpacing: '0.5px', textDecoration: 'underline', textUnderlineOffset: '2px' }}
                                  >
                                    ↓ во все подходы
                                  </button>
                                </div>
                              )}
                            </Fragment>
                          )
                        })}
                      </div>

                      {/* Add set button — #49 fixed: onClick now increments set count */}
                      <button
                        onClick={() => setExtraSets(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }))}
                        style={{
                          width: '100%', padding: '11px', borderRadius: '999px',
                          background: 'transparent', border: '1px solid var(--divider)',
                          fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '12px',
                          color: 'var(--text-tertiary)', cursor: 'pointer', letterSpacing: '1px', marginTop: '12px',
                        }}
                      >
                        + ДОБАВИТЬ ПОДХОД
                      </button>

                      {/* Save button */}
                      <button
                        onClick={() => saveExercise(ex, idx)}
                        disabled={isSaving}
                        className="pressable"
                        style={{
                          width: '100%', padding: '10px', borderRadius: '999px',
                          border: isSaved ? '1px solid rgba(139,30,63,0.3)' : 'none',
                          background: isSaved ? 'var(--accent-soft-bg)' : 'var(--accent-primary)',
                          color: isSaved ? 'var(--accent-primary)' : '#fff',
                          fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '13px',
                          cursor: isSaving ? 'not-allowed' : 'pointer',
                          transition: 'all var(--duration-fast) var(--easing-standard)',
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
              onClick={() => setShowCompletion(true)}
              className="pressable"
              style={{ width: '100%', padding: '14px', borderRadius: '999px', background: 'var(--accent-soft-bg)', border: '1px solid rgba(139,30,63,0.2)', color: 'var(--accent-primary)', fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '15px', cursor: 'pointer', marginTop: '8px' }}
            >
              Завершить тренировку
            </button>
          )}

        </div>
      </div>

      {/* COMPLETION SCREEN */}
      {showCompletion && (() => {
        const savedCount = exercises.filter((ex, idx) => saved[getKey(ex, idx)]).length
        const totalCount = exercises.length
        const totalVolume = exercises.reduce((sum, ex, idx) => {
          const key = getKey(ex, idx)
          const f = fields[key] || {}
          const setFields = getFieldsForSets(ex.sets || '3', key).filter((fld: string) => fld !== 'reps')
          const sets = setFields.map((k: string) => parseFloat(f[k] || '') || 0)
          const reps = parseInt(f.reps || '') || 1
          return sum + sets.reduce((s, w) => s + w * reps, 0)
        }, 0)

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
            <AnimatedBackground />
            <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '400px', textAlign: 'center' }}>

              {/* Medal */}
              <div style={{ fontSize: '64px', marginBottom: '20px', lineHeight: 1 }}>🏆</div>

              <h1 style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '36px', color: 'var(--text-primary)', margin: '0 0 6px', letterSpacing: '-1px' }}>
                Готово!
              </h1>
              <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '15px', color: 'var(--text-secondary)', margin: '0 0 32px' }}>
                {workout?.title}
              </p>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '32px' }}>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--divider)', borderRadius: '16px', padding: '18px 12px' }}>
                  <p style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '40px', color: 'var(--accent-primary)', margin: 0, lineHeight: 1 }}>
                    {savedCount}
                  </p>
                  <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '6px 0 0' }}>
                    из {totalCount} выполнено
                  </p>
                </div>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--divider)', borderRadius: '16px', padding: '18px 12px' }}>
                  <p style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '40px', color: 'var(--accent-primary)', margin: 0, lineHeight: 1 }}>
                    {Math.round(totalVolume)}
                  </p>
                  <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '6px 0 0' }}>
                    кг · объём
                  </p>
                </div>
              </div>

              {/* Exercise checklist */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--divider)', borderRadius: '16px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
                {exercises.map((ex, idx) => {
                  const done = !!saved[getKey(ex, idx)]
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: idx < exercises.length - 1 ? '1px solid var(--divider)' : 'none' }}>
                      <span style={{ fontSize: '14px', flexShrink: 0 }}>{done ? '✅' : '⬜'}</span>
                      <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', color: done ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                        {ex.name}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Difficulty rating */}
              <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase' as const, color: 'var(--text-tertiary)', margin: '0 0 10px' }}>
                  Насколько было сложно?
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  {([
                    { val: 1, emoji: '😴' },
                    { val: 2, emoji: '🙂' },
                    { val: 3, emoji: '😤' },
                    { val: 4, emoji: '💪' },
                    { val: 5, emoji: '🔥' },
                  ] as { val: number; emoji: string }[]).map(({ val, emoji }) => (
                    <button
                      key={val}
                      onClick={() => setDifficulty(difficulty === val ? null : val)}
                      style={{
                        width: '48px', height: '48px', borderRadius: '50%', fontSize: '22px',
                        background: difficulty === val ? 'var(--accent-soft-bg)' : 'var(--bg-card)',
                        border: difficulty === val ? '2px solid var(--accent-primary)' : '1px solid var(--divider)',
                        cursor: 'pointer',
                        transform: difficulty === val ? 'scale(1.15)' : 'scale(1)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Session notes */}
              <textarea
                value={sessionNotes}
                onChange={e => setSessionNotes(e.target.value)}
                placeholder="Как прошла тренировка? (необязательно)"
                style={{
                  width: '100%', minHeight: '72px', marginBottom: '20px',
                  background: 'var(--bg-card)', border: '1px solid var(--divider)',
                  borderRadius: '12px', padding: '12px 14px',
                  fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px',
                  color: 'var(--text-primary)', outline: 'none', resize: 'none',
                  boxSizing: 'border-box' as const, lineHeight: 1.55,
                }}
              />

              <button
                onClick={async () => { await saveSession(); router.push('/client') }}
                disabled={savingSession}
                className="pressable"
                style={{ width: '100%', padding: '14px', borderRadius: '999px', background: 'var(--accent-primary)', color: 'var(--text-inverse)', border: 'none', fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '16px', cursor: 'pointer', opacity: savingSession ? 0.7 : 1 }}
              >
                {savingSession ? 'Сохраняем...' : 'Вернуться на главную'}
              </button>
            </div>
          </div>
        )
      })()}

      <BottomNav />
    </div>
  )
}
