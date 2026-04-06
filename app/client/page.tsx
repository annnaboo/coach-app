'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.6)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(0,0,0,0.06)',
  borderRadius: '20px',
  padding: '20px 22px',
}

const EXERCISE_NAMES: Record<string, string> = {
  'foam': 'Миофасциальный релиз', 'ankle': 'Вращения голеностопа',
  'glute-bridge': 'Ягодичный мост', 'bird-dog': 'Bird Dog',
  'wall-squat': 'Присед у стены', 'box-squat': 'Присед на тумбу',
  'rdl': 'Румынская тяга', 'db-press': 'Жим гантелей',
  'lat-pulldown': 'Тяга верхнего блока', 'cable-row': 'Тяга горизонт. блока',
  'abductor': 'Разведение ног', 'dead-bug': 'Dead Bug',
}

type Log = { exercise_id: string; w1?: string; w2?: string; w3?: string; saved_at: string }
type Nutrition = { calories?: number; protein?: number; fat?: number; carbs?: number; notes?: string }
type Workout = { id: string; title: string; subtitle?: string; exercises?: any[] }

function ArtName({ name }: { name: string }) {
  if (!name) return null
  const split = Math.max(1, name.length - 2)
  return (
    <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontStyle: 'italic', fontSize: '52px', lineHeight: 1.0, margin: '0 0 4px', letterSpacing: '-1px' }}>
      <span style={{ color: '#2d1f0e' }}>{name.slice(0, split)}</span>
      <span style={{ color: '#7a4a20' }}>{name.slice(split)}</span>
      <span style={{ color: '#7a4a20' }}>.</span>
    </h1>
  )
}

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

export default function ClientPage() {
  const [profile, setProfile] = useState<{ name: string; role: string } | null>(null)
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [weekLogs, setWeekLogs] = useState<string[]>([])
  const [mood, setMood] = useState<number | null>(null)
  const [energy, setEnergy] = useState<number>(5)
  const [musclePain, setMusclePain] = useState<number>(3)
  const [moodSaved, setMoodSaved] = useState(false)
  const [moodLoading, setMoodLoading] = useState(false)
  const [nutrition, setNutrition] = useState<Nutrition | null>(null)
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [weekSchedule, setWeekSchedule] = useState<Record<string, Workout>>({})
  const [schedulingDay, setSchedulingDay] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()

  const today = new Date().toISOString().slice(0, 10)
  const todayWorkout = weekSchedule[today] || null

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/'); return }
      setUserId(data.user.id)

      const { data: prof } = await supabase
        .from('profiles').select('name, role, onboarded').eq('id', data.user.id).single()
      if (prof?.role === 'coach') { router.push('/coach'); return }
      if (!prof?.onboarded) { router.push('/welcome'); return }

      const weekStart = getMonday(new Date())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)
      const weekStartStr = weekStart.toISOString().slice(0, 10)
      const weekEndStr = weekEnd.toISOString().slice(0, 10)

      const [logsRes, wLogsRes, moodRes, nutritionRes, workoutsRes, scheduleRes] = await Promise.all([
        supabase.from('workout_logs').select('exercise_id, w1, w2, w3, saved_at').eq('player', data.user.id).order('saved_at', { ascending: false }),
        supabase.from('workout_logs').select('saved_at').eq('player', data.user.id).gte('saved_at', weekStart.toISOString()).lt('saved_at', weekEnd.toISOString()),
        supabase.from('mood_logs').select('*').eq('player_id', data.user.id).eq('logged_date', today).single(),
        supabase.from('nutrition_plans').select('calories, protein, fat, carbs, notes').eq('player_id', data.user.id).single(),
        supabase.from('workouts').select('id, title, subtitle, exercises, assigned_to_multiple').eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('workout_schedule').select('scheduled_date, workouts(id, title, subtitle, exercises)').eq('player_id', data.user.id).gte('scheduled_date', weekStartStr).lte('scheduled_date', weekEndStr),
      ])

      const days = [...new Set((wLogsRes.data || []).map((l: any) => l.saved_at.slice(0, 10)))]
      setWeekLogs(days)

      if (moodRes.data) {
        setMood(moodRes.data.mood)
        setEnergy(moodRes.data.energy)
        setMusclePain(moodRes.data.muscle_pain)
        setMoodSaved(true)
      }

      if (nutritionRes.data) setNutrition(nutritionRes.data)

      // Filter workouts for this client: [] = all, or array contains userId
      const allWorkouts = workoutsRes.data || []
      const myWorkouts = allWorkouts.filter((w: any) =>
        !w.assigned_to_multiple ||
        w.assigned_to_multiple.length === 0 ||
        w.assigned_to_multiple.includes(data.user.id)
      )
      setWorkouts(myWorkouts)

      // Build weekSchedule map: date → workout
      const schedMap: Record<string, Workout> = {}
      ;(scheduleRes.data || []).forEach((s: any) => {
        if (s.workouts) schedMap[s.scheduled_date] = s.workouts
      })
      setWeekSchedule(schedMap)

      setProfile(prof)
      setLogs(logsRes.data || [])
      setLoading(false)
    })
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  async function saveMood() {
    setMoodLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('mood_logs').upsert({ player_id: user.id, logged_date: today, mood, energy, muscle_pain: musclePain }, { onConflict: 'player_id,logged_date' })
    setMoodSaved(true)
    setMoodLoading(false)
  }

  async function assignWorkout(dateStr: string, workout: Workout) {
    if (!userId) return
    const supabase = createClient()
    await supabase.from('workout_schedule').upsert({ player_id: userId, workout_id: workout.id, scheduled_date: dateStr }, { onConflict: 'player_id,scheduled_date' })
    setWeekSchedule(prev => ({ ...prev, [dateStr]: workout }))
    setSchedulingDay(null)
  }

  async function removeSchedule(dateStr: string) {
    if (!userId) return
    const supabase = createClient()
    await supabase.from('workout_schedule').delete().eq('player_id', userId).eq('scheduled_date', dateStr)
    setWeekSchedule(prev => { const n = { ...prev }; delete n[dateStr]; return n })
    setSchedulingDay(null)
  }

  // Stats
  const totalSessions = logs.length
  const maxWeights: Record<string, number> = {}
  logs.forEach(log => {
    const w = Math.max(parseFloat(log.w1 || '0') || 0, parseFloat(log.w2 || '0') || 0, parseFloat(log.w3 || '0') || 0)
    if (w > (maxWeights[log.exercise_id] || 0)) maxWeights[log.exercise_id] = w
  })
  const totalKg = Object.values(maxWeights).reduce((a, b) => a + b, 0)
  const top3 = Object.entries(maxWeights).sort(([, a], [, b]) => b - a).slice(0, 3)
  const maxBar = top3[0]?.[1] || 1

  if (loading) return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ fontFamily: 'Chillax, sans-serif', color: 'rgba(45,31,14,0.4)', fontSize: '16px' }}>Загружаем...</p>
      </div>
    </div>
  )

  const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  const monday = getMonday(new Date())

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }} onClick={() => setSchedulingDay(null)}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, padding: '32px 20px 56px' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>

          {/* HEADER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
            <div>
              <ArtName name={profile?.name || ''} />
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.35)', fontSize: '13px', margin: 0 }}>
                Your personal training story
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button onClick={() => router.push('/settings')} style={{ background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '999px', color: 'rgba(45,31,14,0.5)', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', padding: '8px 14px', cursor: 'pointer' }}>
                ⚙️
              </button>
              <button onClick={handleLogout} style={{ background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '999px', color: 'rgba(45,31,14,0.5)', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', padding: '8px 20px', cursor: 'pointer' }}>
                Выйти
              </button>
            </div>
          </div>

          {/* WEEK CALENDAR */}
          <div style={{ ...glass, marginBottom: '12px' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.35)', margin: '0 0 16px' }}>
              Эта неделя
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
              {DAYS.map((day, i) => {
                const date = new Date(monday)
                date.setDate(monday.getDate() + i)
                const dateStr = date.toISOString().slice(0, 10)
                const isToday = dateStr === today
                const isDone = weekLogs.includes(dateStr)
                const scheduled = weekSchedule[dateStr]
                const isPickerOpen = schedulingDay === dateStr

                const circleStyle: React.CSSProperties = isDone
                  ? { background: '#7a4a20', border: '1.5px solid transparent' }
                  : scheduled
                    ? { background: 'transparent', border: '1.5px solid rgba(122,74,32,0.4)' }
                    : { background: 'rgba(0,0,0,0.06)', border: '1.5px solid transparent' }

                const numColor = isDone ? '#fff' : scheduled ? '#7a4a20' : 'rgba(45,31,14,0.35)'

                const emoji = isDone ? '✅' : scheduled ? '💪' : null

                return (
                  <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1, position: 'relative' }}>
                    <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', color: 'rgba(45,31,14,0.35)' }}>{day}</span>
                    <button
                      onClick={e => { e.stopPropagation(); setSchedulingDay(isPickerOpen ? null : dateStr) }}
                      style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', padding: 0,
                        ...circleStyle,
                      }}
                    >
                      <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', color: numColor, lineHeight: 1 }}>
                        {date.getDate()}
                      </span>
                    </button>
                    <div style={{ height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isToday && !emoji && (
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#7a4a20' }} />
                      )}
                      {emoji && (
                        <span style={{ fontSize: '10px', lineHeight: 1 }}>{emoji}</span>
                      )}
                      {isToday && emoji && (
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#7a4a20', marginLeft: '3px' }} />
                      )}
                    </div>

                    {/* Workout picker dropdown */}
                    {isPickerOpen && (
                      <div
                        onClick={e => e.stopPropagation()}
                        style={{
                          position: 'absolute', top: '56px', left: '50%', transform: 'translateX(-50%)',
                          background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(20px)',
                          border: '1px solid rgba(0,0,0,0.08)', borderRadius: '16px',
                          padding: '10px', zIndex: 50, minWidth: '180px',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        }}
                      >
                        {workouts.length === 0 ? (
                          <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.4)', margin: 0, padding: '6px 8px' }}>Нет доступных тренировок</p>
                        ) : (
                          <>
                            {workouts.map(w => (
                              <button
                                key={w.id}
                                onClick={() => assignWorkout(dateStr, w)}
                                style={{
                                  display: 'block', width: '100%', textAlign: 'left',
                                  padding: '8px 10px', borderRadius: '10px',
                                  background: scheduled?.id === w.id ? 'rgba(122,74,32,0.1)' : 'transparent',
                                  border: 'none', cursor: 'pointer',
                                  marginBottom: '2px',
                                }}
                              >
                                <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', color: '#2d1f0e', margin: 0 }}>{w.title}</p>
                                {w.subtitle && <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: 'rgba(45,31,14,0.4)', margin: '1px 0 0' }}>{w.subtitle}</p>}
                              </button>
                            ))}
                            {scheduled && (
                              <button
                                onClick={() => removeSchedule(dateStr)}
                                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', borderRadius: '10px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#8a2520', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', marginTop: '4px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '8px' }}
                              >
                                Убрать тренировку
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* КБЖУ */}
          {nutrition && (nutrition.calories || nutrition.protein || nutrition.fat || nutrition.carbs) && (
            <div style={{ ...glass, marginBottom: '12px' }}>
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: '#7a4a20', margin: '0 0 14px' }}>
                Твоё питание
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
                {[
                  { value: nutrition.calories, unit: 'ккал', label: 'Калории' },
                  { value: nutrition.protein, unit: 'г', label: 'Белки' },
                  { value: nutrition.fat, unit: 'г', label: 'Жиры' },
                  { value: nutrition.carbs, unit: 'г', label: 'Углеводы' },
                ].map(({ value, unit, label }) => value ? (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 300, fontSize: '20px', color: '#2d1f0e', margin: '0 0 2px', lineHeight: 1 }}>{value}</p>
                    <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', color: 'rgba(45,31,14,0.35)', margin: 0 }}>{unit} {label.toLowerCase()}</p>
                  </div>
                ) : null)}
              </div>
              {nutrition.notes && (
                <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: 'rgba(45,31,14,0.45)', fontStyle: 'italic', margin: '12px 0 0' }}>{nutrition.notes}</p>
              )}
            </div>
          )}

          {/* MOOD TRACKER */}
          <div style={{ ...glass, marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.35)', margin: 0 }}>Самочувствие</p>
              <button onClick={saveMood} disabled={moodLoading} style={{ padding: '5px 14px', borderRadius: '999px', background: moodSaved ? 'rgba(122,74,32,0.1)' : '#7a4a20', color: moodSaved ? '#7a4a20' : '#fff', border: moodSaved ? '1px solid rgba(122,74,32,0.2)' : 'none', fontFamily: 'Chillax, sans-serif', fontSize: '11px', cursor: 'pointer' }}>
                {moodSaved ? 'Сохранено' : 'Сохранить'}
              </button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.5)', margin: '0 0 8px' }}>Настроение</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['😔', '😕', '😐', '🙂', '😄'].map((emoji, i) => (
                  <button key={i} onClick={() => { setMood(i + 1); setMoodSaved(false) }} style={{ fontSize: '22px', background: 'none', border: mood === i + 1 ? '2px solid #7a4a20' : '2px solid transparent', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', transition: 'transform 0.15s', transform: mood === i + 1 ? 'scale(1.2)' : 'scale(1)' }}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.5)', margin: 0 }}>Энергия</p>
                <span style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '14px', color: '#7a4a20' }}>{energy}</span>
              </div>
              <input type="range" min={1} max={10} value={energy} onChange={e => { setEnergy(Number(e.target.value)); setMoodSaved(false) }} style={{ width: '100%', accentColor: '#7a4a20', cursor: 'pointer' }} />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.5)', margin: 0 }}>Боль мышц</p>
                <span style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '14px', color: '#7a4a20' }}>{musclePain}</span>
              </div>
              <input type="range" min={1} max={10} value={musclePain} onChange={e => { setMusclePain(Number(e.target.value)); setMoodSaved(false) }} style={{ width: '100%', accentColor: '#7a4a20', cursor: 'pointer' }} />
            </div>
          </div>

          {/* TODAY'S WORKOUT */}
          <div style={{ ...glass, marginBottom: '12px', position: 'relative', overflow: 'hidden' }}>
            <span style={{ position: 'absolute', right: '16px', bottom: '-10px', fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '110px', color: '#2d1f0e', opacity: 0.04, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>
              {todayWorkout ? todayWorkout.title.match(/\d+/)?.[0] || '✦' : '✦'}
            </span>
            <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.35)', margin: '0 0 10px' }}>
              Сегодня
            </p>
            {todayWorkout ? (
              <>
                <h2 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, color: '#2d1f0e', fontSize: '26px', margin: '0 0 4px' }}>{todayWorkout.title}</h2>
                {todayWorkout.subtitle && (
                  <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.4)', fontSize: '14px', margin: '0 0 20px' }}>{todayWorkout.subtitle}</p>
                )}
                {todayWorkout.exercises && todayWorkout.exercises.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                    {todayWorkout.exercises.slice(0, 4).map((ex: any, i: number) => (
                      <span key={i} style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: '#7a4a20', background: 'rgba(122,74,32,0.08)', border: '1px solid rgba(122,74,32,0.15)', borderRadius: '999px', padding: '3px 10px' }}>
                        {ex.name}
                      </span>
                    ))}
                    {todayWorkout.exercises.length > 4 && (
                      <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: 'rgba(45,31,14,0.4)', padding: '3px 0' }}>+{todayWorkout.exercises.length - 4}</span>
                    )}
                  </div>
                )}
                <button
                  onClick={() => router.push(todayWorkout.id ? `/workout/${todayWorkout.id}` : '/workout/2')}
                  style={{ position: 'relative', overflow: 'hidden', borderRadius: '999px', background: '#7a4a20', border: 'none', color: '#ffffff', fontFamily: 'Chillax, sans-serif', fontWeight: 500, fontSize: '15px', padding: '12px 28px', cursor: 'pointer' }}
                >
                  <span style={{ position: 'absolute', inset: 0, borderRadius: '999px', background: 'linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 60%)', pointerEvents: 'none', zIndex: 1 }} />
                  <span style={{ position: 'relative', zIndex: 2 }}>Открыть тренировку</span>
                </button>
              </>
            ) : (
              <>
                <h2 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, color: 'rgba(45,31,14,0.3)', fontSize: '22px', margin: '0 0 6px' }}>Тренировка не назначена</h2>
                <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.3)', fontSize: '13px', margin: '0 0 16px' }}>Нажми + на нужный день выше</p>
              </>
            )}
          </div>

          {/* AVAILABLE WORKOUTS */}
          {workouts.length > 0 && (
            <div style={{ ...glass, marginBottom: '12px' }}>
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.35)', margin: '0 0 14px' }}>
                Все тренировки
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {workouts.map(w => (
                  <div key={w.id} style={{ background: 'rgba(0,0,0,0.03)', borderRadius: '14px', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '16px', color: '#2d1f0e', margin: '0 0 2px' }}>{w.title}</p>
                        {w.subtitle && <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.4)', margin: '0 0 8px' }}>{w.subtitle}</p>}
                        {w.exercises && w.exercises.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {w.exercises.map((ex: any, i: number) => (
                              <span key={i} style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: 'rgba(45,31,14,0.5)', background: 'rgba(0,0,0,0.04)', borderRadius: '999px', padding: '2px 8px' }}>
                                {ex.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Quick assign to today */}
                      {!weekSchedule[today] || weekSchedule[today]?.id !== w.id ? (
                        <button
                          onClick={() => assignWorkout(today, w)}
                          style={{ flexShrink: 0, marginLeft: '12px', padding: '5px 12px', borderRadius: '999px', background: 'rgba(122,74,32,0.1)', border: '1px solid rgba(122,74,32,0.2)', color: '#7a4a20', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          На сегодня
                        </button>
                      ) : (
                        <span style={{ flexShrink: 0, marginLeft: '12px', padding: '5px 12px', borderRadius: '999px', background: 'rgba(39,174,96,0.1)', border: '1px solid rgba(39,174,96,0.2)', color: '#1a7a3c', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', whiteSpace: 'nowrap' }}>
                          Сегодня ✓
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STATS GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div style={{ ...glass, textAlign: 'center' }}>
              <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, color: '#2d1f0e', fontSize: '40px', margin: '0 0 6px', lineHeight: 1 }}>{totalSessions}</p>
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.4)', fontSize: '11px', margin: 0, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Занятий всего</p>
            </div>
            <div style={{ ...glass, textAlign: 'center' }}>
              <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, color: '#2d1f0e', fontSize: '40px', margin: '0 0 6px', lineHeight: 1 }}>{Math.round(totalKg)}</p>
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.4)', fontSize: '11px', margin: 0, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Прогресс в кг</p>
            </div>
          </div>

          {/* PROGRESS BARS */}
          <div style={{ ...glass, marginBottom: '12px' }}>
            <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.35)', margin: '0 0 20px' }}>Топ упражнений</p>
            {top3.length === 0 ? (
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.35)', fontSize: '14px', textAlign: 'center', padding: '16px 0', margin: 0 }}>Заполни первую тренировку —<br />здесь появятся твои результаты</p>
            ) : (
              top3.map(([exId, weight]) => (
                <div key={exId} style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
                    <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', color: 'rgba(45,31,14,0.7)' }}>{EXERCISE_NAMES[exId] || exId}</span>
                    <span style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '14px', color: '#7a4a20' }}>{weight} кг</span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '999px', width: `${(weight / maxBar) * 100}%`, background: 'linear-gradient(90deg, rgba(122,74,32,0.6) 0%, #7a4a20 100%)', transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ACTION BUTTONS */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => router.push('/progress')} style={{ padding: '10px 24px', borderRadius: '999px', background: 'rgba(122,74,32,0.1)', border: '1px solid rgba(122,74,32,0.2)', color: '#7a4a20', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', cursor: 'pointer' }}>
              Мой прогресс →
            </button>
            <button onClick={() => router.push('/report')} style={{ padding: '10px 24px', borderRadius: '999px', background: 'rgba(122,74,32,0.1)', border: '1px solid rgba(122,74,32,0.2)', color: '#7a4a20', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', cursor: 'pointer' }}>
              Отчёт недели →
            </button>
            <button onClick={() => router.push('/reports-history')} style={{ padding: '10px 24px', borderRadius: '999px', background: 'rgba(122,74,32,0.1)', border: '1px solid rgba(122,74,32,0.2)', color: '#7a4a20', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', cursor: 'pointer' }}>
              История отчётов →
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
