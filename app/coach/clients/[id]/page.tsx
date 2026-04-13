'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'
import {
  getPaymentStatus,
  fmtDate,
  getMondaySunday,
  sevenDaysAgo,
  buildWeek,
  initials,
  delta,
  deltaColor,
} from '@/lib/utils'
import { EXERCISE_NAMES, WEEK_DAYS_RU } from '@/lib/exercises'

// ─── Shared style tokens ─────────────────────────────────────────────────────

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

const MICRO_LABEL: React.CSSProperties = {
  fontFamily: 'Chillax, sans-serif',
  fontWeight: 300,
  fontSize: '9px',
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
  color: 'rgba(45,31,14,0.3)',
  margin: '0 0 4px',
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

// ─── Measurement fields ──────────────────────────────────────────────────────

const MEASUREMENTS = [
  { key: 'chest', label: 'Грудь' },
  { key: 'waist', label: 'Талия' },
  { key: 'waist_navel', label: 'Пупок' },
  { key: 'hips', label: 'Бёдра' },
  { key: 'left_thigh', label: 'Лев. бедро' },
  { key: 'right_thigh', label: 'Прав. бедро' },
  { key: 'left_arm', label: 'Лев. рука' },
  { key: 'right_arm', label: 'Прав. рука' },
] as const

// ─── Mood circle color ───────────────────────────────────────────────────────

function moodColor(score: number | null): string {
  if (score == null) return 'rgba(45,31,14,0.07)'
  if (score <= 2) return 'rgba(138,37,32,0.3)'
  if (score === 3) return 'rgba(45,31,14,0.15)'
  return 'rgba(26,122,60,0.3)'
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ClientProfilePage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [payment, setPayment] = useState<any>(null)
  const [program, setProgram] = useState<any>(null)
  const [reports, setReports] = useState<any[]>([])
  const [workoutLogs, setWorkoutLogs] = useState<any[]>([])
  const [schedule, setSchedule] = useState<any[]>([])
  const [moodLogs, setMoodLogs] = useState<any[]>([])
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [feedbackInput, setFeedbackInput] = useState('')
  const [sendingFeedback, setSendingFeedback] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [coachId, setCoachId] = useState<string | null>(null)

  // Pre-compute date windows once per mount so loadAll and render share the same values.
  const { mondayStr, sundayStr } = getMondaySunday()
  const sevenAgo = sevenDaysAgo()

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  async function loadAll() {
    const supabase = createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) { router.push('/'); return }
    setCoachId(authData.user.id)

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
      supabase.from('payments').select('*').eq('player_id', clientId)
        .order('created_at', { ascending: false }).limit(1),
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

    // Signed URL for latest report photo
    const latestPhoto = reportsRes.data?.[0]?.photo_front
    if (latestPhoto) {
      await supabase.storage.from('reports').createSignedUrl(latestPhoto, 3600)
      // URL stored in signed URL state if needed for display — currently unused in this view
    }

    setLoading(false)
  }

  async function sendFeedback() {
    if (!feedbackInput.trim() || !coachId) return
    setSendingFeedback(true)
    const supabase = createClient()
    await supabase.from('coach_feedback').insert({
      client_id: clientId,
      coach_id: coachId,
      message: feedbackInput.trim(),
    })
    setFeedbackInput('')
    setSendingFeedback(false)
    setFeedbackSent(true)
    // Refresh list
    const { data } = await supabase
      .from('coach_feedback')
      .select('message, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(3)
    setFeedbacks(data || [])
    setTimeout(() => setFeedbackSent(false), 2000)
  }

  // ── Derived data ────────────────────────────────────────────────────────────

  // Reports sorted oldest → newest for chart / first-value comparison
  const reportsAsc = [...reports].reverse()
  const firstReport = reportsAsc[0]
  const latestReport = reports[0]

  const weightDelta = delta(latestReport?.weight, firstReport?.weight)

  // Weight chart scale
  const weights = reportsAsc.map((r) => r.weight).filter(Boolean) as number[]
  const maxW = weights.length ? Math.max(...weights) : 1
  const minW = weights.length ? Math.min(...weights) : 0
  const wRange = maxW - minW || 1

  // Workout stats
  const uniqueDates = [...new Set(
    workoutLogs.map((l) => l.saved_at?.slice(0, 10)).filter(Boolean),
  )]
  const totalSessions = uniqueDates.length
  const lastSessionDate = uniqueDates[0] ?? null

  const exerciseCounts: Record<string, number> = {}
  workoutLogs.forEach((l) => {
    if (l.exercise_id) exerciseCounts[l.exercise_id] = (exerciseCounts[l.exercise_id] || 0) + 1
  })
  const mostTrainedId = Object.entries(exerciseCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const mostTrainedName = mostTrainedId
    ? (EXERCISE_NAMES[mostTrainedId] ?? mostTrainedId)
    : null

  // Weekly schedule grid
  const weekDays = buildWeek(mondayStr)
  const scheduleByDate: Record<string, string> = {}
  schedule.forEach((s: any) => {
    const title = Array.isArray(s.workouts) ? s.workouts[0]?.title : s.workouts?.title
    scheduleByDate[s.scheduled_date] = title || ''
  })

  // Mood: 7-day window oldest → newest
  const moodByDate: Record<string, any> = {}
  moodLogs.forEach((m) => { moodByDate[m.logged_date] = m })
  const moodDays = buildWeek(sevenAgo)

  // ── Loading state ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f0e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AnimatedBackground />
        <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.4)', fontSize: '14px' }}>
          Загрузка...
        </p>
      </div>
    )
  }

  const payStatus = getPaymentStatus(payment)

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#f5f0e8', position: 'relative' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '480px', margin: '0 auto', padding: '0 20px 60px' }}>

        {/* Back */}
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
            {name ? initials(name) : '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontStyle: 'italic', fontWeight: 400, fontSize: '28px', letterSpacing: '-0.5px', color: '#2d1f0e', margin: '0 0 8px', lineHeight: 1.1 }}>
              {name || 'Клиент'}
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

            {/* Numbers */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '24px', marginBottom: '20px' }}>
              {firstReport?.weight != null && (
                <div>
                  <p style={MICRO_LABEL}>Старт</p>
                  <p style={{ ...BIG, fontSize: '28px', color: 'rgba(45,31,14,0.4)' }}>
                    {firstReport.weight} <span style={{ fontSize: '14px' }}>кг</span>
                  </p>
                </div>
              )}
              {latestReport?.weight != null && (
                <div>
                  <p style={MICRO_LABEL}>Сейчас</p>
                  <p style={BIG}>{latestReport.weight} <span style={{ fontSize: '18px' }}>кг</span></p>
                </div>
              )}
              {weightDelta && weightDelta !== '0' && (
                <div style={{ marginBottom: '6px' }}>
                  <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '22px', margin: 0, color: deltaColor(weightDelta), letterSpacing: '-0.5px' }}>
                    {weightDelta} кг
                  </p>
                </div>
              )}
            </div>

            {/* Bar chart */}
            {weights.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '56px' }}>
                {reportsAsc.map((r, i) => {
                  const h = r.weight != null ? Math.max(4, ((r.weight - minW) / wRange) * 44 + 8) : 4
                  const isLast = i === reportsAsc.length - 1
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' }}>
                      <div style={{ width: '100%', height: `${h}px`, borderRadius: '3px 3px 0 0', background: isLast ? '#7a4a20' : 'rgba(122,74,32,0.2)' }} />
                      {r.weight != null && (
                        <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '8px', color: isLast ? '#7a4a20' : 'rgba(45,31,14,0.3)' }}>
                          {r.weight}
                        </span>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              {MEASUREMENTS.map(({ key, label }) => {
                const curr = latestReport?.[key] ?? null
                const first = firstReport?.[key] ?? null
                const d = delta(curr, first)
                return (
                  <div key={key} style={{ background: 'rgba(45,31,14,0.03)', borderRadius: '10px', padding: '10px 12px' }}>
                    <p style={{ ...MICRO_LABEL, margin: '0 0 4px' }}>{label}</p>
                    <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '20px', letterSpacing: '-0.5px', color: '#2d1f0e', margin: 0, lineHeight: 1 }}>
                      {curr != null ? curr : '—'}
                    </p>
                    {d && d !== '0' && (
                      <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: deltaColor(d), margin: '2px 0 0' }}>
                        {d}
                      </p>
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
              const isToday = dateStr === new Date().toISOString().slice(0, 10)
              return (
                <div key={dateStr} style={{ textAlign: 'center' }}>
                  <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: isToday ? '#7a4a20' : 'rgba(45,31,14,0.3)', margin: '0 0 6px' }}>
                    {WEEK_DAYS_RU[i]}
                  </p>
                  <div style={{ minHeight: '36px', borderRadius: '8px', background: title ? 'rgba(122,74,32,0.1)' : 'rgba(45,31,14,0.03)', border: isToday ? '1px solid rgba(122,74,32,0.3)' : '1px solid transparent', padding: '4px 2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '8px', color: title ? '#7a4a20' : 'rgba(45,31,14,0.2)', margin: 0, lineHeight: 1.2, textAlign: 'center' }}>
                      {title || '—'}
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
              const score: number | null = entry?.mood ?? null
              const dayLabel = new Date(dateStr)
                .toLocaleDateString('ru-RU', { weekday: 'short' })
                .slice(0, 2)
              return (
                <div key={dateStr} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: moodColor(score), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {score != null && (
                      <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: 'rgba(45,31,14,0.6)' }}>
                        {score}
                      </span>
                    )}
                  </div>
                  <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '8px', letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.3)' }}>
                    {dayLabel}
                  </span>
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
              <p style={{ ...MICRO_LABEL, margin: '0 0 6px' }}>Тренировок</p>
              <p style={{ ...BIG, fontSize: '32px' }}>{totalSessions}</p>
            </div>
            <div style={{ background: 'rgba(45,31,14,0.03)', borderRadius: '12px', padding: '14px 18px', flex: '1 1 0' }}>
              <p style={{ ...MICRO_LABEL, margin: '0 0 6px' }}>Последняя</p>
              <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '18px', letterSpacing: '-0.5px', color: '#2d1f0e', margin: 0, lineHeight: 1 }}>
                {lastSessionDate ? fmtDate(lastSessionDate) : '—'}
              </p>
            </div>
          </div>
          {mostTrainedName && (
            <div style={{ background: 'rgba(45,31,14,0.03)', borderRadius: '12px', padding: '14px 18px', marginTop: '10px' }}>
              <p style={{ ...MICRO_LABEL, margin: '0 0 6px' }}>Чаще всего</p>
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '15px', color: '#2d1f0e', margin: 0 }}>
                {mostTrainedName}
              </p>
            </div>
          )}
        </div>

        {/* ── LAST FEEDBACK ── */}
        {feedbacks.length > 0 && (
          <div style={SECTION}>
            <p style={LABEL}>Последние отзывы тренера</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {feedbacks.map((fb, i) => (
                <div key={i} style={{ borderLeft: '2px solid rgba(122,74,32,0.2)', paddingLeft: '12px' }}>
                  <p style={{ fontFamily: 'Epilogue, sans-serif', fontStyle: 'italic', fontSize: '14px', color: 'rgba(45,31,14,0.75)', margin: '0 0 4px', lineHeight: 1.4 }}>
                    {fb.message}
                  </p>
                  <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: 'rgba(45,31,14,0.3)', margin: 0, letterSpacing: '1px' }}>
                    {fmtDate(fb.created_at)}
                  </p>
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
              onChange={(e) => setFeedbackInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendFeedback()}
              style={{ flex: 1, background: 'rgba(45,31,14,0.05)', border: 'none', borderRadius: '10px', padding: '10px 14px', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', color: '#2d1f0e', outline: 'none' }}
            />
            <button
              onClick={sendFeedback}
              disabled={sendingFeedback || !feedbackInput.trim()}
              style={{ padding: '10px 18px', borderRadius: '10px', background: feedbackSent ? '#1a7a3c' : '#7a4a20', color: '#fff', border: 'none', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', cursor: 'pointer', transition: 'background 0.2s', opacity: !feedbackInput.trim() ? 0.5 : 1, flexShrink: 0 }}
            >
              {feedbackSent ? '✓' : sendingFeedback ? '...' : 'Отправить'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
