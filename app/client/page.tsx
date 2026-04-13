'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'

const section: React.CSSProperties = {
  borderBottom: '1px solid rgba(45,31,14,0.07)',
  paddingBottom: '32px',
  marginBottom: '32px',
}

const card: React.CSSProperties = {
  borderBottom: '1px solid rgba(45,31,14,0.08)',
  padding: '28px 0',
}

const glass = card

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
    <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontStyle: 'italic', fontSize: '62px', lineHeight: 0.95, margin: '0 0 6px', letterSpacing: '-2px' }}>
      <span style={{ color: '#2d1f0e' }}>{name.slice(0, split)}</span>
      <span style={{ color: '#7a4a20' }}>{name.slice(split)}</span>
      <span style={{ color: '#7a4a20' }}>.</span>
    </h1>
  )
}

const LABEL: React.CSSProperties = {
  fontFamily: 'Chillax, sans-serif',
  fontWeight: 300,
  fontSize: '10px',
  letterSpacing: '3px',
  textTransform: 'uppercase',
  color: 'rgba(45,31,14,0.3)',
  margin: '0 0 20px',
}

const BIG_NUM: React.CSSProperties = {
  fontFamily: 'Epilogue, sans-serif',
  fontWeight: 400,
  fontSize: '48px',
  lineHeight: 1,
  color: '#2d1f0e',
  letterSpacing: '-1px',
  margin: 0,
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
  const [program, setProgram] = useState<{ title: string; workout_ids: string[]; start_date: string; end_date?: string | null } | null>(null)
  const [programWorkouts, setProgramWorkouts] = useState<Record<string, Workout>>({})
  const [swapReason, setSwapReason] = useState('')
  const [showSwapForm, setShowSwapForm] = useState(false)
  const [swapSent, setSwapSent] = useState(false)
  const [clientPayment, setClientPayment] = useState<any>(null)
  const [weeklyReports, setWeeklyReports] = useState<any[]>([])
  const [profileHeight, setProfileHeight] = useState<number | null>(null)
  const [weekNumber, setWeekNumber] = useState<number | null>(null)
  const [totalWeeks, setTotalWeeks] = useState<number | null>(null)
  const [restDays, setRestDays] = useState<string[]>([])
  const router = useRouter()

  const today = new Date().toISOString().slice(0, 10)
  const programTodayId = program && programWorkouts ? Object.keys(programWorkouts)[0] : null
  const programTodayWorkout = programTodayId ? programWorkouts[programTodayId] : null
  const todayWorkout = weekSchedule[today] || programTodayWorkout || null

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user
      if (!user) { router.push('/'); return }
      setUserId(user.id)

      const { data: prof } = await supabase
        .from('profiles').select('name, role, onboarded, height_cm').eq('id', user.id).single()
      if (prof?.role === 'coach') { router.push('/coach'); return }
      if (!prof?.onboarded) { router.push('/welcome'); return }
      if (prof?.height_cm) setProfileHeight(prof.height_cm)

      const weekStart = getMonday(new Date())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)
      const weekStartStr = weekStart.toISOString().slice(0, 10)
      const weekEndStr = weekEnd.toISOString().slice(0, 10)

      const [logsRes, wLogsRes, moodRes, nutritionRes, workoutsRes, scheduleRes, programsRes, paymentRes, reportsRes, restDaysRes] = await Promise.all([
        supabase.from('workout_logs').select('exercise_id, w1, w2, w3, saved_at').eq('player', user.id).order('saved_at', { ascending: false }),
        supabase.from('workout_logs').select('saved_at').eq('player', user.id).gte('saved_at', weekStart.toISOString()).lt('saved_at', weekEnd.toISOString()),
        supabase.from('mood_logs').select('*').eq('player_id', user.id).eq('logged_date', today).single(),
        supabase.from('nutrition_plans').select('calories, protein, fat, carbs, notes').eq('player_id', user.id).single(),
        supabase.from('workouts').select('id, title, subtitle, exercises, assigned_to_multiple').eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('workout_schedule').select('scheduled_date, workouts(id, title, subtitle, exercises)').eq('player_id', user.id).gte('scheduled_date', weekStartStr).lte('scheduled_date', weekEndStr),
        supabase.from('programs').select('title, workout_ids, start_date, end_date, assigned_to').eq('is_active', true).order('start_date', { ascending: false }),
        supabase.from('payments').select('*').eq('player_id', user.id).order('created_at', { ascending: false }).limit(1),
        supabase.from('weekly_reports').select('week_start, weight, height_cm').eq('player_id', user.id).order('week_start', { ascending: false }).limit(12),
        supabase.from('rest_days').select('rest_date').eq('player_id', user.id).gte('rest_date', weekStartStr).lte('rest_date', weekEndStr),
      ])
      setClientPayment(paymentRes.data?.[0] || null)
      setWeeklyReports(reportsRes.data || [])
      setRestDays((restDaysRes.data || []).map((r: any) => r.rest_date))

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
        w.assigned_to_multiple.includes(user.id)
      )
      setWorkouts(myWorkouts)

      // Build weekSchedule map: date → workout
      const schedMap: Record<string, Workout> = {}
      ;(scheduleRes.data || []).forEach((s: any) => {
        if (s.workouts) schedMap[s.scheduled_date] = s.workouts
      })
      setWeekSchedule(schedMap)

      // Program-based workout
      const prog = (programsRes.data || []).find((p: any) => Array.isArray(p.assigned_to) && p.assigned_to.includes(user.id)) || null
      if (prog && Array.isArray(prog.workout_ids) && prog.workout_ids.length > 0) {
        setProgram({ ...prog, end_date: prog.end_date || null })
        // Sequence-based: find last scheduled workout, next in sequence follows it
        const scheduledDates = Object.keys(schedMap).sort()
        const lastScheduledDate = scheduledDates[scheduledDates.length - 1]
        const lastWorkout = lastScheduledDate ? schedMap[lastScheduledDate] : null
        const lastIndex = lastWorkout ? prog.workout_ids.indexOf(lastWorkout.id) : -1
        const nextIndex = lastIndex === -1 ? 0 : (lastIndex + 1) % prog.workout_ids.length
        const thisWeekId = prog.workout_ids[nextIndex]
        const found = (workoutsRes.data || []).find((w: any) => w.id === thisWeekId)
        if (found) {
          setProgramWorkouts({ [thisWeekId]: found })
        }
        setWeekNumber(nextIndex + 1)
        setTotalWeeks(prog.workout_ids.length)
      }

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

  async function toggleRestDay(dateStr: string) {
    if (!userId) return
    const supabase = createClient()
    if (restDays.includes(dateStr)) {
      await supabase.from('rest_days').delete().eq('player_id', userId).eq('rest_date', dateStr)
      setRestDays(prev => prev.filter(d => d !== dateStr))
    } else {
      await supabase.from('rest_days').insert({ player_id: userId, rest_date: dateStr })
      setRestDays(prev => [...prev, dateStr])
    }
    setSchedulingDay(null)
  }

  async function sendSwapRequest() {
    if (!userId || !todayWorkout) return
    const supabase = createClient()
    await supabase.from('workout_swap_requests').insert({
      player_id: userId,
      current_workout_id: todayWorkout.id,
      reason: swapReason,
      status: 'pending',
    })
    setSwapSent(true)
    setShowSwapForm(false)
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

  // Weight loss calculations from weekly reports
  const sortedReports = [...weeklyReports].sort((a, b) => new Date(b.week_start).getTime() - new Date(a.week_start).getTime())
  const latestWeight = sortedReports.find(r => r.weight != null)?.weight ?? null
  const oldestWeight = [...sortedReports].reverse().find(r => r.weight != null)?.weight ?? null
  const totalWeightLoss = (latestWeight !== null && oldestWeight !== null && sortedReports.length >= 2)
    ? +(oldestWeight - latestWeight).toFixed(1)
    : null
  const reportsWithWeight = sortedReports.filter(r => r.weight != null)
  let avgWeeklyLoss: number | null = null
  if (reportsWithWeight.length >= 2) {
    const first = reportsWithWeight[reportsWithWeight.length - 1]
    const last = reportsWithWeight[0]
    const weeks = Math.max(1, Math.round((new Date(last.week_start).getTime() - new Date(first.week_start).getTime()) / (7 * 86400000)))
    avgWeeklyLoss = +((first.weight - last.weight) / weeks).toFixed(2)
  }

  // BMI calculation
  const heightForBmi = profileHeight || sortedReports.find(r => r.height_cm != null)?.height_cm || null
  const bmi = (latestWeight !== null && heightForBmi !== null && heightForBmi > 0)
    ? +(latestWeight / Math.pow(heightForBmi / 100, 2)).toFixed(1)
    : null
  const getBmiCategory = (b: number) => {
    if (b < 18.5) return { label: 'Дефицит', color: '#1a7a3c' }
    if (b < 25) return { label: 'Норма', color: '#1a7a3c' }
    if (b < 30) return { label: 'Избыток', color: '#b8860b' }
    return { label: 'Ожирение', color: '#8a2520' }
  }
  const bmiInfo = bmi ? getBmiCategory(bmi) : null

  if (loading) return (
  <div style={{ position: 'relative', minHeight: '100vh' }}>
    <AnimatedBackground />
    <div style={{ position: 'relative', zIndex: 1, padding: '32px 20px 56px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        {/* Skeleton header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ height: '48px', background: 'rgba(255,255,255,0.5)', borderRadius: '12px', width: '55%', marginBottom: '8px', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ height: '12px', background: 'rgba(255,255,255,0.4)', borderRadius: '6px', width: '35%', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.45)', borderRadius: '20px', padding: '20px', marginBottom: '10px', animation: 'pulse 1.5s ease-in-out infinite' }}>
            <div style={{ height: '10px', background: 'rgba(0,0,0,0.06)', borderRadius: '5px', width: '30%', marginBottom: '12px' }} />
            <div style={{ height: '14px', background: 'rgba(0,0,0,0.05)', borderRadius: '5px', width: '70%', marginBottom: '8px' }} />
            <div style={{ height: '10px', background: 'rgba(0,0,0,0.04)', borderRadius: '5px', width: '50%' }} />
          </div>
        ))}
      </div>
    </div>
  </div>
)

  const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  const monday = getMonday(new Date())
  const todayDow = new Date().toLocaleDateString('ru-RU', { weekday: 'long' })

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }} onClick={() => setSchedulingDay(null)}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, padding: '52px 28px 80px' }}>
        <div style={{ maxWidth: '460px', margin: '0 auto' }}>

          {/* HEADER */}
          <div style={{ borderBottom: '1px solid rgba(45,31,14,0.08)', paddingBottom: '28px', marginBottom: '0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <ArtName name={profile?.name || ''} />
                <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.3)', margin: '4px 0 12px' }}>
                  Личный дашборд
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {clientPayment && clientPayment.paid && (
                    <span style={{
                      fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px',
                      padding: '4px 12px', borderRadius: '999px',
                      background: 'transparent', color: '#1a7a3c',
                      border: '1px solid rgba(26,122,60,0.4)',
                      letterSpacing: '1px',
                    }}>
                      ✓ Оплачено до {clientPayment.period_end ? new Date(clientPayment.period_end).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : ''}
                    </span>
                  )}
                  {clientPayment && !clientPayment.paid && (
                    <span style={{
                      fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px',
                      padding: '4px 12px', borderRadius: '999px',
                      background: 'transparent', color: '#8a2520',
                      border: '1px solid rgba(138,37,32,0.4)',
                      letterSpacing: '1px',
                    }}>
                      ⚠ Не оплачено
                    </span>
                  )}
                  {!clientPayment && (
                    <span style={{
                      fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px',
                      padding: '4px 12px', borderRadius: '999px',
                      background: 'transparent', color: 'rgba(45,31,14,0.35)',
                      border: '1px solid rgba(45,31,14,0.15)',
                      letterSpacing: '1px',
                    }}>
                      Оплата не добавлена
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button onClick={() => router.push('/settings')} style={{ background: 'none', border: 'none', borderRadius: '999px', color: 'rgba(45,31,14,0.35)', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '18px', padding: '6px 10px', cursor: 'pointer' }}>
                  ⚙️
                </button>
                <button onClick={handleLogout} style={{ background: 'none', border: '1px solid rgba(45,31,14,0.12)', borderRadius: '999px', color: 'rgba(45,31,14,0.4)', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', padding: '8px 18px', cursor: 'pointer', letterSpacing: '0.5px' }}>
                  Выйти
                </button>
              </div>
            </div>
          </div>

          {/* WEEK CALENDAR */}
          <div style={{ ...card }} onClick={e => e.stopPropagation()}>
            <p style={{ ...LABEL }}>
              {weekNumber && totalWeeks ? `Неделя ${weekNumber} из ${totalWeeks}` : 'Эта неделя'}
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

                const isRest = restDays.includes(dateStr)

                const circleStyle: React.CSSProperties = isDone
                  ? { background: '#7a4a20', border: '1.5px solid transparent' }
                  : isRest
                    ? { background: 'transparent', border: '1.5px solid rgba(45,31,14,0.15)' }
                    : scheduled
                      ? { background: 'transparent', border: '1.5px solid rgba(122,74,32,0.4)' }
                      : { background: 'rgba(0,0,0,0.06)', border: '1.5px solid transparent' }

                const numColor = isDone ? '#fff' : isRest ? 'rgba(45,31,14,0.2)' : scheduled ? '#7a4a20' : 'rgba(45,31,14,0.35)'

                const emoji = isDone ? '✅' : isRest ? '😴' : scheduled ? '💪' : null

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
                        <button
                          onClick={() => toggleRestDay(dateStr)}
                          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: '10px', background: restDays.includes(dateStr) ? 'rgba(45,31,14,0.05)' : 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(45,31,14,0.45)', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', marginTop: '4px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '8px' }}
                        >
                          {restDays.includes(dateStr) ? '✓ Отдых (убрать)' : '😴 День отдыха'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* КБЖУ */}
          {nutrition && (nutrition.calories || nutrition.protein || nutrition.fat || nutrition.carbs) && (
            <div style={{ ...card }}>
              <p style={{ ...LABEL }}>Твоё питание</p>
              <div style={{ display: 'flex', gap: '0' }}>
                {[
                  { value: nutrition.calories, unit: 'ккал', label: 'Калории' },
                  { value: nutrition.protein, unit: 'г', label: 'Белки' },
                  { value: nutrition.fat, unit: 'г', label: 'Жиры' },
                  { value: nutrition.carbs, unit: 'г', label: 'Углеводы' },
                ].map(({ value, unit, label }, idx, arr) => value ? (
                  <div key={label} style={{ flex: 1, textAlign: 'center', borderRight: idx < arr.length - 1 ? '1px solid rgba(45,31,14,0.07)' : 'none' }}>
                    <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '32px', color: '#2d1f0e', margin: '0 0 4px', lineHeight: 1, letterSpacing: '-0.5px' }}>{value}</p>
                    <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: 'rgba(45,31,14,0.35)', margin: 0, letterSpacing: '2px', textTransform: 'uppercase' }}>{unit}</p>
                    <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', color: 'rgba(45,31,14,0.25)', margin: '2px 0 0', letterSpacing: '1px', textTransform: 'uppercase' }}>{label}</p>
                  </div>
                ) : null)}
              </div>
              {nutrition.notes && (
                <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.4)', fontStyle: 'italic', margin: '16px 0 0' }}>{nutrition.notes}</p>
              )}
            </div>
          )}

          {/* MOOD TRACKER */}
          <div style={{ ...card }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <p style={{ ...LABEL, margin: 0 }}>Самочувствие</p>
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
          <div style={{ ...card, position: 'relative', overflow: 'hidden' }}>
            <span style={{ position: 'absolute', right: '0', bottom: '-16px', fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '120px', color: '#2d1f0e', opacity: 0.03, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>
              {todayWorkout ? todayWorkout.title.match(/\d+/)?.[0] || '✦' : '✦'}
            </span>
            <p style={{ ...LABEL }}>Сегодня</p>
            {todayWorkout ? (
              <>
                <h2 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, color: '#2d1f0e', fontSize: '32px', margin: '0 0 4px', letterSpacing: '-0.5px' }}>{todayWorkout.title}</h2>
                {program && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px', marginTop: '2px' }}>
                    <span style={{ display: 'inline-flex', background: 'rgba(122,74,32,0.1)', border: '1px solid rgba(122,74,32,0.2)', borderRadius: '999px', padding: '3px 12px', fontSize: '11px', color: '#7a4a20', fontFamily: 'Chillax, sans-serif', fontWeight: 300 }}>
                      📋 {program.title}
                    </span>
                    {program.start_date && (
                      <span style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '999px', padding: '3px 12px', fontSize: '11px', color: 'rgba(45,31,14,0.5)', fontFamily: 'Chillax, sans-serif', fontWeight: 300 }}>
                        {new Date(program.start_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                        {program.end_date ? ` — ${new Date(program.end_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}` : ''}
                      </span>
                    )}
                  </div>
                )}
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
                {/* Swap request */}
                <div style={{ marginTop: '10px' }}>
                  {swapSent ? (
                    <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: '#1a7a3c', margin: 0 }}>✓ Запрос отправлен тренеру</p>
                  ) : showSwapForm ? (
                    <div style={{ marginTop: '8px' }}>
                      <input
                        type="text"
                        value={swapReason}
                        onChange={e => setSwapReason(e.target.value)}
                        placeholder="Причина (необязательно)"
                        style={{ width: '100%', background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '999px', padding: '9px 16px', fontFamily: 'Chillax, sans-serif', fontSize: '13px', color: '#2d1f0e', outline: 'none', boxSizing: 'border-box', marginBottom: '8px' }}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={sendSwapRequest} style={{ flex: 1, padding: '9px', borderRadius: '999px', background: '#7a4a20', color: '#fff', border: 'none', fontFamily: 'Chillax, sans-serif', fontSize: '13px', cursor: 'pointer' }}>Отправить</button>
                        <button onClick={() => setShowSwapForm(false)} style={{ padding: '9px 16px', borderRadius: '999px', background: 'rgba(0,0,0,0.06)', color: 'rgba(45,31,14,0.5)', border: 'none', fontFamily: 'Chillax, sans-serif', fontSize: '13px', cursor: 'pointer' }}>Отмена</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowSwapForm(true)}
                      style={{ background: 'none', border: 'none', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.35)', cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: '2px' }}
                    >
                      Запросить замену тренировки
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <h2 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontStyle: 'italic', color: 'rgba(45,31,14,0.2)', fontSize: '28px', margin: '0 0 6px', letterSpacing: '-0.5px' }}>Тренировка не назначена</h2>
                <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.3)', fontSize: '12px', margin: '0 0 16px' }}>Нажми + на нужный день выше</p>
              </>
            )}
          </div>

          {/* AVAILABLE WORKOUTS */}
          {workouts.length > 0 && (
            <div style={{ ...card }}>
              <p style={{ ...LABEL }}>Все тренировки</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {workouts.map(w => (
                  <div key={w.id} style={{ borderBottom: '1px solid rgba(45,31,14,0.06)', padding: '14px 0' }}>
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
                      <div style={{ flexShrink: 0, marginLeft: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        {w.id === programTodayId && (
                          <span style={{ padding: '2px 8px', borderRadius: '999px', background: 'rgba(122,74,32,0.08)', border: '1px solid rgba(122,74,32,0.15)', color: 'rgba(122,74,32,0.6)', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                            Следующая →
                          </span>
                        )}
                        {!weekSchedule[today] || weekSchedule[today]?.id !== w.id ? (
                          <button
                            onClick={() => assignWorkout(today, w)}
                            style={{ padding: '5px 12px', borderRadius: '999px', background: 'rgba(122,74,32,0.1)', border: '1px solid rgba(122,74,32,0.2)', color: '#7a4a20', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            На сегодня
                          </button>
                        ) : (
                          <span style={{ padding: '5px 12px', borderRadius: '999px', background: 'rgba(39,174,96,0.1)', border: '1px solid rgba(39,174,96,0.2)', color: '#1a7a3c', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', whiteSpace: 'nowrap' }}>
                            Сегодня ✓
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WEIGHT LOSS + BMI BLOCK */}
          {(totalWeightLoss !== null || bmi !== null || latestWeight !== null) && (
            <div style={{ ...card }}>
              <p style={{ ...LABEL }}>Динамика тела</p>
              <div style={{ display: 'flex', gap: '0' }}>
                {latestWeight !== null && (
                  <div style={{ flex: 1, borderRight: '1px solid rgba(45,31,14,0.07)', paddingRight: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <p style={{ ...BIG_NUM, fontSize: '48px' }}>{latestWeight}</p>
                      <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '14px', color: 'rgba(45,31,14,0.4)', marginLeft: '4px' }}>кг</span>
                    </div>
                    <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.35)', margin: '6px 0 0' }}>Сейчас</p>
                  </div>
                )}
                {totalWeightLoss !== null && (
                  <div style={{ flex: 1, paddingLeft: latestWeight !== null ? '20px' : '0', paddingRight: bmi !== null ? '20px' : '0', borderRight: bmi !== null ? '1px solid rgba(45,31,14,0.07)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '44px', lineHeight: 1, color: totalWeightLoss >= 0 ? '#1a7a3c' : '#8a2520', letterSpacing: '-1px', margin: 0 }}>
                        {totalWeightLoss > 0 ? '−' : totalWeightLoss < 0 ? '+' : ''}{Math.abs(totalWeightLoss)}
                      </p>
                      <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '14px', color: 'rgba(45,31,14,0.4)' }}>кг</span>
                    </div>
                    <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.35)', margin: '6px 0 0' }}>За всё время</p>
                    {avgWeeklyLoss !== null && (
                      <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: avgWeeklyLoss >= 0 ? '#1a7a3c' : 'rgba(45,31,14,0.4)', margin: '3px 0 0' }}>
                        ≈ {avgWeeklyLoss > 0 ? '−' : ''}{Math.abs(avgWeeklyLoss)} кг/нед
                      </p>
                    )}
                  </div>
                )}
                {bmi !== null && bmiInfo && (
                  <div style={{ flex: 1, paddingLeft: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <p style={{ ...BIG_NUM }}>{bmi}</p>
                    </div>
                    <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: bmiInfo.color, margin: '6px 0 0' }}>
                      ИМТ · {bmiInfo.label}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STATS */}
          <div style={{ ...card }}>
            <p style={{ ...LABEL }}>Статистика</p>
            <div style={{ display: 'flex', gap: '0' }}>
              <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid rgba(45,31,14,0.07)' }}>
                <p style={{ ...BIG_NUM }}>{totalSessions}</p>
                <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.35)', fontSize: '10px', margin: '6px 0 0', letterSpacing: '2px', textTransform: 'uppercase' }}>Занятий</p>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <p style={{ ...BIG_NUM }}>{Math.round(totalKg)}</p>
                <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.35)', fontSize: '10px', margin: '6px 0 0', letterSpacing: '2px', textTransform: 'uppercase' }}>Прогресс кг</p>
              </div>
            </div>
          </div>

          {/* PROGRESS BARS */}
          <div style={{ ...card }}>
            <p style={{ ...LABEL }}>Топ упражнений</p>
            {top3.length === 0 ? (
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.35)', fontSize: '13px', textAlign: 'center', padding: '16px 0', margin: 0 }}>Заполни первую тренировку —<br />здесь появятся твои результаты</p>
            ) : (
              top3.map(([exId, weight]) => (
                <div key={exId} style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', color: 'rgba(45,31,14,0.6)' }}>{EXERCISE_NAMES[exId] || exId}</span>
                    <span style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '15px', color: '#7a4a20' }}>{weight} кг</span>
                  </div>
                  <div style={{ height: '2px', borderRadius: '999px', background: 'rgba(45,31,14,0.08)' }}>
                    <div style={{ height: '2px', borderRadius: '999px', width: `${(weight / maxBar) * 100}%`, background: '#7a4a20', transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ACTION BUTTONS */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '32px', flexWrap: 'wrap' }}>
            <button onClick={() => router.push('/report')} style={{ padding: '10px 24px', borderRadius: '999px', background: 'rgba(122,74,32,0.1)', border: '1px solid rgba(122,74,32,0.2)', color: '#7a4a20', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', cursor: 'pointer' }}>
              Отчёт недели →
            </button>
            <button onClick={() => router.push('/reports-history')} style={{ padding: '10px 24px', borderRadius: '999px', background: 'rgba(122,74,32,0.1)', border: '1px solid rgba(122,74,32,0.2)', color: '#7a4a20', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', cursor: 'pointer' }}>
              Мои отчёты →
            </button>
            <button onClick={() => router.push('/history')} style={{ padding: '10px 24px', borderRadius: '999px', background: 'rgba(122,74,32,0.1)', border: '1px solid rgba(122,74,32,0.2)', color: '#7a4a20', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', cursor: 'pointer' }}>
  История тренировок →
</button>
          </div>

        </div>
      </div>
    </div>
  )
}
