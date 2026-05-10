'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'
import { LineChart, Line } from 'recharts'
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
  borderBottom: '1px solid var(--divider)',
  padding: '28px 0',
}

const LABEL: React.CSSProperties = {
  fontFamily: 'var(--font-text)',
  fontWeight: 300,
  fontSize: '10px',
  letterSpacing: '3px',
  textTransform: 'uppercase' as const,
  color: 'var(--text-tertiary)',
  margin: '0 0 16px',
}

const MICRO_LABEL: React.CSSProperties = {
  fontFamily: 'var(--font-text)',
  fontWeight: 300,
  fontSize: '9px',
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
  color: 'var(--text-tertiary)',
  margin: '0 0 4px',
}

const BIG: React.CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontWeight: 400,
  fontSize: '40px',
  letterSpacing: '-1.5px',
  color: 'var(--text-primary)',
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
  if (score == null) return 'var(--bg-card-soft)'
  if (score <= 2) return 'rgba(138,37,32,0.3)'
  if (score === 3) return 'var(--text-tertiary)'
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
  const [view, setView] = useState<'list' | 'trajectory'>('list')
  const [trajPeriod, setTrajPeriod] = useState<4 | 8 | 12>(4)
  const [latestPhotoUrl, setLatestPhotoUrl] = useState<string | null>(null)

  // Payment editing
  const [editingPayment, setEditingPayment] = useState(false)
  const [payPaid, setPayPaid] = useState(true)
  const [payPeriodEnd, setPayPeriodEnd] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [savingPayment, setSavingPayment] = useState(false)
  const [paymentSaved, setPaymentSaved] = useState(false)

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
      const { data: urlData } = await supabase.storage.from('reports').createSignedUrl(latestPhoto, 3600)
      if (urlData?.signedUrl) setLatestPhotoUrl(urlData.signedUrl)
    }

    setLoading(false)
  }

  function openPaymentEdit() {
    setPayPaid(payment?.paid ?? true)
    setPayPeriodEnd(payment?.period_end ? payment.period_end.slice(0, 10) : '')
    setPayAmount(payment?.amount != null ? String(payment.amount) : '')
    setPaymentSaved(false)
    setEditingPayment(true)
  }

  async function savePayment() {
    setSavingPayment(true)
    const supabase = createClient()
    const upsertData: Record<string, any> = {
      player_id: clientId,
      paid: payPaid,
      period_end: payPeriodEnd || null,
      amount: payAmount !== '' ? parseFloat(payAmount) : null,
    }
    let result
    if (payment?.id) {
      result = await supabase.from('payments').update(upsertData).eq('id', payment.id).select().single()
    } else {
      result = await supabase.from('payments').insert(upsertData).select().single()
    }
    if (result.data) setPayment(result.data)
    setSavingPayment(false)
    setPaymentSaved(true)
    setEditingPayment(false)
    setTimeout(() => setPaymentSaved(false), 2000)
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
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AnimatedBackground />
        <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, color: 'var(--text-tertiary)', fontSize: '14px' }}>
          Загрузка...
        </p>
      </div>
    )
  }

  const payStatus = getPaymentStatus(payment)

  // ── Trajectory data ─────────────────────────────────────────────────────────

  const trajData: Record<string, { weekKey: string; maxWeight: number }[]> = {}
  if (view === 'trajectory') {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - trajPeriod * 7)
    const byExerciseWeek: Record<string, Record<string, number>> = {}
    workoutLogs.forEach((log) => {
      if (new Date(log.saved_at) < cutoff) return
      const exId = log.exercise_id
      if (!exId) return
      const maxW = Math.max(
        parseFloat(log.w1 || '0') || 0,
        parseFloat(log.w2 || '0') || 0,
        parseFloat(log.w3 || '0') || 0,
      )
      if (maxW === 0) return
      const d = new Date(log.saved_at)
      const day = d.getDay()
      const mon = new Date(d)
      mon.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
      mon.setHours(0, 0, 0, 0)
      const weekKey = mon.toISOString().slice(0, 10)
      if (!byExerciseWeek[exId]) byExerciseWeek[exId] = {}
      if (!byExerciseWeek[exId][weekKey] || maxW > byExerciseWeek[exId][weekKey]) {
        byExerciseWeek[exId][weekKey] = maxW
      }
    })
    Object.entries(byExerciseWeek).forEach(([exId, weekMap]) => {
      trajData[exId] = Object.entries(weekMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([weekKey, maxWeight]) => ({ weekKey, maxWeight }))
    })
  }
  const trajExercises = Object.entries(trajData).sort(([a], [b]) => a.localeCompare(b))

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', position: 'relative' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '480px', margin: '0 auto', padding: '0 20px 60px' }}>

        {/* Back */}
        <div style={{ padding: '20px 0 0' }}>
          <button
            onClick={() => router.back()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', padding: 0 }}
          >
            ← Клиенты
          </button>
        </div>

        {/* ── HEADER ── */}
        <div style={{ ...SECTION, display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', flexShrink: 0, background: 'rgba(220,80,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '20px', color: 'var(--accent-primary)' }}>
            {name ? initials(name) : '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: '28px', letterSpacing: '-0.5px', color: 'var(--text-primary)', margin: '0 0 8px', lineHeight: 1.1 }}>
              {name || 'Клиент'}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', padding: '3px 10px', borderRadius: '999px', border: payStatus.border, color: payStatus.color, letterSpacing: '0.5px' }}>
                {payStatus.label}
              </span>
              {program && (
                <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', padding: '3px 10px', borderRadius: '999px', background: 'var(--accent-soft-bg)', border: '1px solid rgba(220,80,0,0.15)', color: 'var(--accent-primary)', letterSpacing: '0.5px' }}>
                  {program.title}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── TOGGLE ── */}
        <div style={{ display: 'flex', gap: '6px', padding: '16px 0', borderBottom: '1px solid var(--divider)' }}>
          {(['list', 'trajectory'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '6px 16px', borderRadius: '999px', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '12px', letterSpacing: '0.5px',
                background: view === v ? 'var(--accent-primary)' : 'var(--bg-card-soft)',
                color: view === v ? '#fff' : 'var(--text-secondary)',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {v === 'list' ? 'Список' : 'Траектория'}
            </button>
          ))}
        </div>

        {/* ── PAYMENT ── */}
        <div style={{ ...SECTION }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <p style={{ ...LABEL, margin: 0 }}>Оплата</p>
            {!editingPayment && (
              <button
                onClick={openPaymentEdit}
                style={{ background: 'none', border: '1px solid var(--divider)', borderRadius: '999px', padding: '4px 14px', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer', letterSpacing: '0.5px' }}
              >
                {paymentSaved ? '✓ Сохранено' : 'Изменить'}
              </button>
            )}
          </div>

          {!editingPayment ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', padding: '3px 10px', borderRadius: '999px', border: payStatus.border, color: payStatus.color, letterSpacing: '0.5px' }}>
                {payStatus.label}
              </span>
              {payment?.amount != null && (
                <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                  {payment.amount.toLocaleString('ru-RU')} ₽
                </span>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Paid toggle */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {[true, false].map((val) => (
                  <button
                    key={String(val)}
                    onClick={() => setPayPaid(val)}
                    style={{
                      padding: '6px 16px', borderRadius: '999px', cursor: 'pointer',
                      fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '12px',
                      border: 'none',
                      background: payPaid === val ? 'var(--accent-primary)' : 'var(--bg-card-soft)',
                      color: payPaid === val ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    {val ? 'Оплачено' : 'Не оплачено'}
                  </button>
                ))}
              </div>
              {/* Period end date */}
              <div>
                <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '0 0 6px' }}>
                  Оплачено до
                </p>
                <input
                  type="date"
                  value={payPeriodEnd}
                  onChange={(e) => setPayPeriodEnd(e.target.value)}
                  style={{ background: 'var(--bg-card-soft)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '9px 14px', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              {/* Amount */}
              <div>
                <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '0 0 6px' }}>
                  Сумма (₽)
                </p>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="Например, 5000"
                  style={{ background: 'var(--bg-card-soft)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '9px 14px', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  onClick={savePayment}
                  disabled={savingPayment}
                  style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-primary)', color: '#fff', border: 'none', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', cursor: 'pointer', opacity: savingPayment ? 0.6 : 1 }}
                >
                  {savingPayment ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button
                  onClick={() => setEditingPayment(false)}
                  style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card-soft)', color: 'var(--text-secondary)', border: 'none', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', cursor: 'pointer' }}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── TRAJECTORY VIEW ── */}
        {view === 'trajectory' && (
          <div style={{ paddingTop: '20px' }}>
            {/* Period selector */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '24px' }}>
              {([4, 8, 12] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setTrajPeriod(p)}
                  style={{
                    padding: '4px 14px', borderRadius: '999px', cursor: 'pointer',
                    fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px',
                    border: trajPeriod === p ? '1px solid rgba(220,80,0,0.3)' : '1px solid var(--text-tertiary)',
                    background: trajPeriod === p ? 'var(--accent-soft-bg)' : 'transparent',
                    color: trajPeriod === p ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                  }}
                >
                  {p} нед
                </button>
              ))}
            </div>

            {trajExercises.length === 0 ? (
              <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '32px 0' }}>
                Нет данных за выбранный период
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {trajExercises.map(([exId, weeks]) => {
                  const sparkPoints = weeks.map((w) => ({ w: w.maxWeight }))
                  const first = weeks[0]?.maxWeight ?? 0
                  const last = weeks[weeks.length - 1]?.maxWeight ?? 0
                  const diff = +(last - first).toFixed(1)
                  return (
                    <div key={exId} style={{ borderBottom: '1px solid var(--bg-card-soft)', padding: '16px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', color: 'var(--text-primary)' }}>
                          {EXERCISE_NAMES[exId] ?? exId}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {weeks.length > 1 && (
                            <LineChart width={56} height={20} data={sparkPoints}>
                              <Line type="monotone" dataKey="w" stroke="var(--accent-primary)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                            </LineChart>
                          )}
                          {diff !== 0 && (
                            <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', color: diff > 0 ? '#1a7a3c' : 'var(--error)' }}>
                              {diff > 0 ? '↗' : '↘'} {diff > 0 ? '+' : ''}{diff} кг
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {weeks.map(({ weekKey, maxWeight }) => (
                          <div key={weekKey} style={{ textAlign: 'center', minWidth: '40px' }}>
                            <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '9px', color: 'var(--text-tertiary)', margin: '0 0 2px', letterSpacing: '0.5px' }}>
                              {new Date(weekKey).toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric' })}
                            </p>
                            <p style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '13px', color: 'var(--text-primary)', margin: 0 }}>
                              {maxWeight}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {view === 'list' && <>

        {/* ── WEIGHT DYNAMICS ── */}
        {reports.length > 0 && (
          <div style={SECTION}>
            <p style={LABEL}>Динамика веса</p>

            {/* Numbers */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '24px', marginBottom: '20px' }}>
              {firstReport?.weight != null && (
                <div>
                  <p style={MICRO_LABEL}>Старт</p>
                  <p style={{ ...BIG, fontSize: '28px', color: 'var(--text-tertiary)' }}>
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
                  <p style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '22px', margin: 0, color: deltaColor(weightDelta), letterSpacing: '-0.5px' }}>
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
                      <div style={{ width: '100%', height: `${h}px`, borderRadius: '3px 3px 0 0', background: isLast ? 'var(--accent-primary)' : 'var(--accent-soft-bg)' }} />
                      {r.weight != null && (
                        <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '8px', color: isLast ? 'var(--accent-primary)' : 'var(--text-tertiary)' }}>
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
                  <div key={key} style={{ background: 'var(--bg-card-soft)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                    <p style={{ ...MICRO_LABEL, margin: '0 0 4px' }}>{label}</p>
                    <p style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '20px', letterSpacing: '-0.5px', color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>
                      {curr != null ? curr : '—'}
                    </p>
                    {d && d !== '0' && (
                      <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '10px', color: deltaColor(d), margin: '2px 0 0' }}>
                        {d}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── LATEST PHOTO ── */}
        {latestPhotoUrl && (
          <div style={SECTION}>
            <p style={LABEL}>Фото (последний отчёт)</p>
            <img
              src={latestPhotoUrl}
              alt="Фото прогресса"
              style={{ width: '120px', height: '160px', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--divider)' }}
            />
          </div>
        )}

        {/* ── THIS WEEK ── */}
        <div style={SECTION}>
          <p style={LABEL}>Эта неделя</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {weekDays.map((dateStr, i) => {
              const title = scheduleByDate[dateStr]
              const now = new Date(); const isToday = dateStr === `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
              return (
                <div key={dateStr} style={{ textAlign: 'center' }}>
                  <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: isToday ? 'var(--accent-primary)' : 'var(--text-tertiary)', margin: '0 0 6px' }}>
                    {WEEK_DAYS_RU[i]}
                  </p>
                  <div style={{ minHeight: '36px', borderRadius: '8px', background: title ? 'var(--accent-soft-bg)' : 'var(--bg-card-soft)', border: isToday ? '1px solid rgba(220,80,0,0.2)' : '1px solid transparent', padding: '4px 2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '8px', color: title ? 'var(--accent-primary)' : 'var(--text-tertiary)', margin: 0, lineHeight: 1.2, textAlign: 'center' }}>
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
                      <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {score}
                      </span>
                    )}
                  </div>
                  <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '8px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
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
            <div style={{ background: 'var(--bg-card-soft)', borderRadius: 'var(--radius-md)', padding: '14px 18px', flex: '1 1 0' }}>
              <p style={{ ...MICRO_LABEL, margin: '0 0 6px' }}>Тренировок</p>
              <p style={{ ...BIG, fontSize: '32px' }}>{totalSessions}</p>
            </div>
            <div style={{ background: 'var(--bg-card-soft)', borderRadius: 'var(--radius-md)', padding: '14px 18px', flex: '1 1 0' }}>
              <p style={{ ...MICRO_LABEL, margin: '0 0 6px' }}>Последняя</p>
              <p style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '18px', letterSpacing: '-0.5px', color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>
                {lastSessionDate ? fmtDate(lastSessionDate) : '—'}
              </p>
            </div>
          </div>
          {mostTrainedName && (
            <div style={{ background: 'var(--bg-card-soft)', borderRadius: 'var(--radius-md)', padding: '14px 18px', marginTop: '10px' }}>
              <p style={{ ...MICRO_LABEL, margin: '0 0 6px' }}>Чаще всего</p>
              <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '15px', color: 'var(--text-primary)', margin: 0 }}>
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
                <div key={i} style={{ borderLeft: '2px solid rgba(220,80,0,0.15)', paddingLeft: '12px' }}>
                  <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 4px', lineHeight: 1.4 }}>
                    {fb.message}
                  </p>
                  <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '10px', color: 'var(--text-tertiary)', margin: 0, letterSpacing: '1px' }}>
                    {fmtDate(fb.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        </>}

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
              style={{ flex: 1, background: 'var(--bg-card-soft)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', color: 'var(--text-primary)', outline: 'none' }}
            />
            <button
              onClick={sendFeedback}
              disabled={sendingFeedback || !feedbackInput.trim()}
              style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', background: feedbackSent ? '#1a7a3c' : 'var(--accent-primary)', color: '#fff', border: 'none', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', cursor: 'pointer', transition: 'background 0.2s', opacity: !feedbackInput.trim() ? 0.5 : 1, flexShrink: 0 }}
            >
              {feedbackSent ? '✓' : sendingFeedback ? '...' : 'Отправить'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
