'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'

const SECTION: React.CSSProperties = {
  borderBottom: '1px solid rgba(45,31,14,0.08)',
  padding: '28px 0',
}

const LABEL: React.CSSProperties = {
  fontFamily: 'Chillax, sans-serif',
  fontWeight: 300,
  fontSize: '10px',
  letterSpacing: '3px',
  textTransform: 'uppercase' as const,
  color: 'rgba(45,31,14,0.3)',
  margin: '0 0 16px',
}

const BIG: React.CSSProperties = {
  fontFamily: 'Epilogue, sans-serif',
  fontWeight: 400,
  fontSize: '40px',
  letterSpacing: '-1.5px',
  color: '#2d1f0e',
  margin: 0,
  lineHeight: 1,
}

function getPaymentStatus(payment: any): { label: string; color: string; border: string } {
  if (!payment || !payment.paid) {
    return { label: '⚠ Не оплачено', color: '#8a2520', border: '1px solid rgba(138,37,32,0.4)' }
  }
  if (payment.period_end) {
    const daysLeft = Math.ceil((new Date(payment.period_end).getTime() - Date.now()) / 86400000)
    const dateStr = new Date(payment.period_end).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    if (daysLeft <= 0) return { label: `⚠ Истёк ${dateStr}`, color: '#8a2520', border: '1px solid rgba(138,37,32,0.4)' }
    if (daysLeft <= 7) return { label: `⚡ Истекает ${dateStr}`, color: '#b8860b', border: '1px solid rgba(184,134,11,0.4)' }
    return { label: `✓ До ${dateStr}`, color: '#1a7a3c', border: '1px solid rgba(26,122,60,0.4)' }
  }
  return { label: '✓ Активна', color: '#1a7a3c', border: '1px solid rgba(26,122,60,0.4)' }
}

function getMondaySunday(): { mondayStr: string; sundayStr: string } {
  const now = new Date()
  const day = now.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { mondayStr: fmt(monday), sundayStr: fmt(sunday) }
}

function sevenDaysAgo(): string {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  return d.toISOString().slice(0, 10)
}

function initials(name: string) {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return parts[0][0] + parts[1][0]
  return parts[0]?.[0] ?? '?'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function delta(current: number | null, first: number | null): string {
  if (current == null || first == null) return ''
  const d = current - first
  if (d === 0) return '0'
  return (d > 0 ? '+' : '') + d.toFixed(1)
}

function deltaColor(d: string): string {
  if (!d || d === '0') return 'rgba(45,31,14,0.3)'
  return d.startsWith('-') ? '#1a7a3c' : '#8a2520'
}

const WEEK_DAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export default function ClientProfilePage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [payment, setPayment] = useState<any>(null)
  const [program, setProgram] = useState<any>(null)
  const [reports, setReports] = useState<any[]>([])
  const [latestPhotoUrl, setLatestPhotoUrl] = useState<string | null>(null)
  const [workoutLogs, setWorkoutLogs] = useState<any[]>([])
  const [schedule, setSchedule] = useState<any[]>([])
  const [moodLogs, setMoodLogs] = useState<any[]>([])
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [feedbackInput, setFeedbackInput] = useState('')
  const [sendingFeedback, setSendingFeedback] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [coachId, setCoachId] = useState<string | null>(null)

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  async function loadAll() {
    const supabase = createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) { router.push('/'); return }
    setCoachId(authData.user.id)

    const { mondayStr, sundayStr } = getMondaySunday()
    const sevenAgo = sevenDaysAgo()

    const [
      profileRes,
      paymentRes,
      reportsRes,
      logsRes,
      programRes,
      feedbackRes,
      scheduleRes,
      moodRes,
    ] = await Promise.all([
      supabase.from('profiles').select('name, height_cm').eq('id', clientId).single(),
      supabase.from('payments').select('*').eq('player_id', clientId).order('created_at', { ascending: false }).limit(1),
      supabase.from('weekly_reports')
        .select('week_start, weight, chest, waist, hips, waist_navel, left_thigh, right_thigh, left_arm, right_arm, notes, photo_front')
        .eq('player_id', clientId)
        .order('week_start', { ascending: false })
        .limit(8),
      supabase.from('workout_logs')
        .select('exercise_id, w1, w2, w3, saved_at')
        .eq('player', clientId)
        .order('saved_at', { ascending: false }),
      supabase.from('programs')
        .select('title, workout_ids, start_date, end_date')
        .eq('is_active', true)
        .contains('assigned_to', [clientId])
        .limit(1),
      supabase.from('coach_feedback')
        .select('message, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase.from('workout_schedule')
        .select('scheduled_date, workouts(title)')
        .eq('player_id', clientId)
        .gte('scheduled_date', mondayStr)
        .lte('scheduled_date', sundayStr),
      supabase.from('mood_logs')
        .select('mood, energy, muscle_pain, logged_date')
        .eq('player_id', clientId)
        .gte('logged_date', sevenAgo)
        .order('logged_date', { ascending: false }),
    ])

    setName(profileRes.data?.name || '')
    setPayment(paymentRes.data?.[0] || null)
    setReports(reportsRes.data || [])
    setWorkoutLogs(logsRes.data || [])
    setProgram(programRes.data?.[0] || null)
    setFeedbacks(feedbackRes.data || [])
    setSchedule(scheduleRes.data || [])
    setMoodLogs(moodRes.data || [])

    const latestReport = reportsRes.data?.[0]
    if (latestReport?.photo_front) {
      const { data } = await supabase.storage.from('reports').createSignedUrl(latestReport.photo_front, 3600)
      setLatestPhotoUrl(data?.signedUrl || null)
    }

    setLoading(false)
  }

  async function sendFeedback() {
    if (!feedbackInput.trim() || !coachId) return
    setSendingFeedback(true)
    const supabase = createClient()
    await supabase.from('coach_feedback').insert({ client_id: clientId, coach_id: coachId, message: feedbackInput.trim() })
    setFeedbackInput('')
    setSendingFeedback(false)
    setFeedbackSent(true)
    // Reload feedbacks
    const { data } = await supabase.from('coach_feedback').select('message, created_at').eq('client_id', clientId).order('created_at', { ascending: false }).limit(3)
    setFeedbacks(data || [])
    setTimeout(() => setFeedbackSent(false), 2000)
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  // Weight chart: oldest → newest (reverse reports array)
  const reportsAsc = [...reports].reverse()
  const firstReport = reportsAsc[0]
  const latestReport = reports[0]

  const weightDelta = delta(latestReport?.weight ?? null, firstReport?.weight ?? null)

  // Measurements
  const MEASUREMENTS = [
    { key: 'chest', label: 'Грудь' },
    { key: 'waist', label: 'Талия' },
    { key: 'waist_navel', label: 'Пупок' },
    { key: 'hips', label: 'Бёдра' },
    { key: 'left_thigh', label: 'Лев. бедро' },
    { key: 'right_thigh', label: 'Прав. бедро' },
    { key: 'left_arm', label: 'Лев. рука' },
    { key: 'right_arm', label: 'Прав. рука' },
  ]

  // Workout stats
  const uniqueDates = [...new Set(workoutLogs.map(l => l.saved_at?.slice(0, 10)).filter(Boolean))]
  const totalSessions = uniqueDates.length
  const lastSessionDate = uniqueDates[0] || null

  const exerciseCounts: Record<string, number> = {}
  workoutLogs.forEach(l => {
    if (l.exercise_id) exerciseCounts[l.exercise_id] = (exerciseCounts[l.exercise_id] || 0) + 1
  })
  const mostTrainedId = Object.entries(exerciseCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null

  // Weekly schedule grid (Mon–Sun)
  const { mondayStr } = getMondaySunday()
  const monday = new Date(mondayStr)

  const scheduleByDate: Record<string, string> = {}
  schedule.forEach((s: any) => {
    const title = Array.isArray(s.workouts) ? s.workouts[0]?.title : s.workouts?.title
    scheduleByDate[s.scheduled_date] = title || '—'
  })

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().slice(0, 10)
  })

  // Mood: build array for last 7 days sorted ascending
  const moodByDate: Record<string, any> = {}
  moodLogs.forEach(m => { moodByDate[m.logged_date] = m })
  const sevenAgoDate = sevenDaysAgo()
  const moodDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sevenAgoDate)
    d.setDate(d.getDate() + i)
    return d.toISOString().slice(0, 10)
  })

  function moodColor(score: number | null): string {
    if (score == null) return 'rgba(45,31,14,0.07)'
    if (score <= 2) return 'rgba(138,37,32,0.3)'
    if (score === 3) return 'rgba(45,31,14,0.15)'
    return 'rgba(26,122,60,0.3)'
  }

  // Max weight for chart scale
  const weights = reportsAsc.map(r => r.weight).filter(Boolean)
  const maxW = weights.length ? Math.max(...weights) : 1
  const minW = weights.length ? Math.min(...weights) : 0
  const wRange = maxW - minW || 1

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f0e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AnimatedBackground />
        <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.4)', fontSize: '14px' }}>Загрузка...</p>
      </div>
    )
  }

  const payStatus = getPaymentStatus(payment)
  const avatarText = name ? initials(name) : '?'
  const displayName = name || 'Клиент'

  return (
    <div style={{ minHeight: '100vh', background: '#f5f0e8', position: 'relative' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '480px', margin: '0 auto', padding: '0 20px 60px' }}>

        {/* ── BACK BUTTON ── */}
        <div style={{ padding: '20px 0 0' }}>
          <button
            onClick={() => router.back()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(45,31,14,0.45)', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', padding: 0 }}
          >
            ← Клиенты
          </button>
        </div>

        {/* ── HEADER ── */}
        <div style={{ ...SECTION, display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', flexShrink: 0, background: 'rgba(122,74,32,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '20px', color: '#7a4a20' }}>
            {avatarText}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontStyle: 'italic', fontWeight: 400, fontSize: '28px', letterSpacing: '-0.5px', color: '#2d1f0e', margin: '0 0 8px', lineHeight: 1.1 }}>
              {displayName}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', padding: '3px 10px', borderRadius: '999px', border: payStatus.border, color: payStatus.color, letterSpacing: '0.5px' }}>
                {payStatus.label}
              </span>
              {program && (
                <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', padding: '3px 10px', borderRadius: '999px', background: 'rgba(122,74,32,0.08)', border: '1px solid rgba(122,74,32,0.2)', color: '#7a4a20', letterSpacing: '0.5px' }}>
                  {program.title}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── WEIGHT DYNAMICS ── */}
        {reports.length > 0 && (
          <div style={SECTION}>
            <p style={LABEL}>Динамика веса</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '24px', marginBottom: '20px' }}>
              {firstReport?.weight != null && (
                <div>
                  <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.3)', margin: '0 0 4px' }}>Старт</p>
                  <p style={{ ...BIG, fontSize: '28px', color: 'rgba(45,31,14,0.4)' }}>{firstReport.weight} <span style={{ fontSize: '14px' }}>кг</span></p>
                </div>
              )}
              {latestReport?.weight != null && (
                <div>
                  <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.3)', margin: '0 0 4px' }}>Сейчас</p>
                  <p style={BIG}>{latestReport.weight} <span style={{ fontSize: '18px' }}>кг</span></p>
                </div>
              )}
              {weightDelta && (
                <div style={{ marginBottom: '6px' }}>
                  <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '22px', margin: 0, color: deltaColor(weightDelta), letterSpacing: '-0.5px' }}>
                    {weightDelta} кг
                  </p>
                </div>
              )}
            </div>

            {/* Mini bar chart */}
            {weights.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '48px' }}>
                {reportsAsc.map((r, i) => {
                  const h = r.weight != null ? Math.max(4, ((r.weight - minW) / wRange) * 40 + 8) : 4
                  const isLast = i === reportsAsc.length - 1
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                      <div style={{ width: '100%', height: `${h}px`, borderRadius: '3px 3px 0 0', background: isLast ? '#7a4a20' : 'rgba(122,74,32,0.2)', transition: 'height 0.3s' }} />
                      {r.weight != null && (
                        <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '8px', color: isLast ? '#7a4a20' : 'rgba(45,31,14,0.3)' }}>{r.weight}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── MEASUREMENTS ── */}
        {latestReport && (
          <div style={SECTION}>
            <p style={LABEL}>Замеры</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              {MEASUREMENTS.map(({ key, label }) => {
                const curr = latestReport?.[key] ?? null
                const first = firstReport?.[key] ?? null
                const d = delta(curr, first)
                return (
                  <div key={key} style={{ background: 'rgba(45,31,14,0.03)', borderRadius: '10px', padding: '10px 12px' }}>
                    <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.3)', margin: '0 0 4px' }}>{label}</p>
                    <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '20px', letterSpacing: '-0.5px', color: '#2d1f0e', margin: 0, lineHeight: 1 }}>
                      {curr != null ? curr : '—'}
                    </p>
                    {d && (
                      <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: deltaColor(d), margin: '2px 0 0' }}>{d}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── THIS WEEK ── */}
        <div style={SECTION}>
          <p style={LABEL}>Эта неделя</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {weekDays.map((dateStr, i) => {
              const title = scheduleByDate[dateStr]
              const hasWorkout = !!title
              const isToday = dateStr === new Date().toISOString().slice(0, 10)
              return (
                <div key={dateStr} style={{ textAlign: 'center' }}>
                  <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: isToday ? '#7a4a20' : 'rgba(45,31,14,0.3)', margin: '0 0 6px' }}>
                    {WEEK_DAYS_RU[i]}
                  </p>
                  <div style={{ minHeight: '36px', borderRadius: '8px', background: hasWorkout ? 'rgba(122,74,32,0.1)' : 'rgba(45,31,14,0.03)', border: isToday ? '1px solid rgba(122,74,32,0.3)' : '1px solid transparent', padding: '4px 2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '8px', color: hasWorkout ? '#7a4a20' : 'rgba(45,31,14,0.2)', margin: 0, lineHeight: 1.2, textAlign: 'center' }}>
                      {hasWorkout ? title : '—'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── MOOD ── */}
        <div style={SECTION}>
          <p style={LABEL}>Самочувствие</p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            {moodDays.map((dateStr) => {
              const entry = moodByDate[dateStr]
              const score = entry?.mood ?? null
              const d = new Date(dateStr)
              const dayName = d.toLocaleDateString('ru-RU', { weekday: 'short' }).slice(0, 2)
              return (
                <div key={dateStr} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: moodColor(score), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {score != null && (
                      <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: 'rgba(45,31,14,0.6)' }}>{score}</span>
                    )}
                  </div>
                  <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '8px', letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.3)' }}>{dayName}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── WORKOUT STATS ── */}
        <div style={SECTION}>
          <p style={LABEL}>Статистика тренировок</p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(45,31,14,0.03)', borderRadius: '12px', padding: '14px 18px', flex: '1 1 0' }}>
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.3)', margin: '0 0 6px' }}>Тренировок</p>
              <p style={{ ...BIG, fontSize: '32px' }}>{totalSessions}</p>
            </div>
            <div style={{ background: 'rgba(45,31,14,0.03)', borderRadius: '12px', padding: '14px 18px', flex: '1 1 0' }}>
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.3)', margin: '0 0 6px' }}>Последняя</p>
              <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '18px', letterSpacing: '-0.5px', color: '#2d1f0e', margin: 0, lineHeight: 1 }}>
                {lastSessionDate ? fmtDate(lastSessionDate) : '—'}
              </p>
            </div>
            {mostTrainedId && (
              <div style={{ background: 'rgba(45,31,14,0.03)', borderRadius: '12px', padding: '14px 18px', width: '100%', boxSizing: 'border-box' }}>
                <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.3)', margin: '0 0 6px' }}>Чаще всего</p>
                <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '15px', color: '#2d1f0e', margin: 0 }}>{mostTrainedId}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── LAST FEEDBACK ── */}
        {feedbacks.length > 0 && (
          <div style={SECTION}>
            <p style={LABEL}>Последние отзывы тренера</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {feedbacks.map((fb, i) => (
                <div key={i} style={{ borderLeft: '2px solid rgba(122,74,32,0.2)', paddingLeft: '12px' }}>
                  <p style={{ fontFamily: 'Epilogue, sans-serif', fontStyle: 'italic', fontSize: '14px', color: 'rgba(45,31,14,0.75)', margin: '0 0 4px', lineHeight: 1.4 }}>{fb.message}</p>
                  <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: 'rgba(45,31,14,0.3)', margin: 0, letterSpacing: '1px' }}>{fmtDate(fb.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SEND FEEDBACK ── */}
        <div style={{ ...SECTION, borderBottom: 'none' }}>
          <p style={LABEL}>Написать клиенту</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Сообщение для клиента..."
              value={feedbackInput}
              onChange={e => setFeedbackInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendFeedback()}
              style={{ flex: 1, background: 'rgba(45,31,14,0.05)', border: 'none', borderRadius: '10px', padding: '10px 14px', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', color: '#2d1f0e', outline: 'none' }}
            />
            <button
              onClick={sendFeedback}
              disabled={sendingFeedback || !feedbackInput.trim()}
              style={{ padding: '10px 18px', borderRadius: '10px', background: feedbackSent ? '#1a7a3c' : '#7a4a20', color: '#fff', border: 'none', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', cursor: 'pointer', transition: 'background 0.2s', opacity: (!feedbackInput.trim() && !sendingFeedback) ? 0.5 : 1, flexShrink: 0 }}
            >
              {feedbackSent ? '✓' : sendingFeedback ? '...' : 'Отправить'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
