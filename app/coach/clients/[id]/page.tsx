'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'
import { LineChart, Line, AreaChart, Area, ResponsiveContainer } from 'recharts'
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
  if (score <= 2) return 'var(--error-bg)'
  if (score === 3) return 'var(--bg-card-soft)'
  return 'var(--success-bg)'
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
  const [exerciseNameMap, setExerciseNameMap] = useState<Record<string, string>>({})
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
  const [resetPassword, setResetPassword] = useState('')
  const [savingReset, setSavingReset] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  // Payment editing
  const [editingPayment, setEditingPayment] = useState(false)
  const [payPaid, setPayPaid] = useState(true)
  const [payPeriodEnd, setPayPeriodEnd] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [savingPayment, setSavingPayment] = useState(false)
  const [paymentSaved, setPaymentSaved] = useState(false)

  // Feature 3: compliance / all schedule
  const [allSchedule, setAllSchedule] = useState<any[]>([])

  // Feature 4: nutrition plan
  const [clientNutrition, setClientNutrition] = useState<any>(null)

  // Feature 6: progress photos
  const [progressPhotos, setProgressPhotos] = useState<{ id: string; url: string; taken_at: string; weight_kg: number | null }[]>([])

  // Feature 7: swap requests
  const [swapRequests, setSwapRequests] = useState<any[]>([])

  // Feature 9: coach notes
  const [clientNotes, setClientNotes] = useState<any[]>([])
  const [noteInput, setNoteInput] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  // Pre-compute date windows once per mount so loadAll and render share the same values.
  const { mondayStr, sundayStr } = getMondaySunday()
  const sevenAgo = sevenDaysAgo()

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  async function deleteClient() {
    if (!confirm(`Удалить клиента ${name}?`)) return
    if (!confirm('Все данные клиента будут удалены. Продолжить?')) return
    const supabase = createClient()
    await supabase.from('workout_logs').delete().eq('player', clientId)
    await supabase.from('mood_logs').delete().eq('player_id', clientId)
    await supabase.from('weekly_reports').delete().eq('player_id', clientId)
    await supabase.from('nutrition_plans').delete().eq('player_id', clientId)
    await supabase.from('payments').delete().eq('player_id', clientId)
    await supabase.from('workout_swap_requests').delete().eq('player_id', clientId)
    await supabase.from('profiles').delete().eq('id', clientId)
    router.push('/coach')
  }

  async function handleResetPassword() {
    if (resetPassword.length < 6) return
    setSavingReset(true)
    const res = await fetch('/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: clientId, password: resetPassword }),
    })
    setSavingReset(false)
    if (res.ok) { setResetDone(true); setResetPassword('') }
    else { alert('Ошибка при смене пароля') }
  }

  async function loadAll() {
    const supabase = createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) { router.push('/'); return }

    const { data: callerProf } = await supabase
      .from('profiles').select('role').eq('id', authData.user.id).single()
    if (callerProf?.role !== 'coach') { router.push('/client'); return }

    const currentCoachId = authData.user.id
    setCoachId(currentCoachId)

    const [
      profileRes,
      paymentRes,
      reportsRes,
      logsRes,
      programRes,
      feedbackRes,
      scheduleRes,
      moodRes,
      allScheduleRes,
      nutritionRes,
      swapRes,
      notesRes,
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
        .select('exercise_id, workout_id, w1, w2, w3, saved_at')
        .eq('player', clientId)
        .order('saved_at', { ascending: false }),
      supabase.from('programs')
        .select('title, workout_ids, start_date, end_date, assigned_to')
        .eq('is_active', true),
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
      // Feature 3: all schedule for compliance
      supabase.from('workout_schedule')
        .select('scheduled_date')
        .eq('player_id', clientId),
      // Feature 4: nutrition plan
      supabase.from('nutrition_plans')
        .select('calories,protein,fat,carbs,notes')
        .eq('player_id', clientId)
        .single(),
      // Feature 7: swap requests
      supabase.from('workout_swap_requests')
        .select('id,reason,status,created_at')
        .eq('player_id', clientId)
        .eq('status', 'pending'),
      // Feature 9: coach notes
      supabase.from('coach_client_notes')
        .select('id,content,created_at')
        .eq('coach_id', currentCoachId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false }),
    ])

    setName(profileRes.data?.name || '')
    setPayment(paymentRes.data?.[0] || null)
    setReports(reportsRes.data || [])
    setWorkoutLogs(logsRes.data || [])
    setProgram(programRes.data?.find((p: any) => p.assigned_to?.includes(clientId)) || null)
    setFeedbacks(feedbackRes.data || [])
    setSchedule(scheduleRes.data || [])
    setMoodLogs(moodRes.data || [])
    setAllSchedule(allScheduleRes.data || [])
    setClientNutrition(nutritionRes.data || null)
    setSwapRequests(swapRes.data || [])
    setClientNotes(notesRes.data || [])

    // Build exercise name map from the workouts referenced in this client's logs
    const workoutIds = [...new Set((logsRes.data || []).map((l: any) => l.workout_id).filter(Boolean))]
    if (workoutIds.length > 0) {
      const { data: workoutsData } = await supabase
        .from('workouts').select('exercises').in('id', workoutIds)
      const nameMap: Record<string, string> = {}
      ;(workoutsData || []).forEach((w: any) => {
        const exs = Array.isArray(w.exercises) ? w.exercises : []
        exs.forEach((ex: any) => { if (ex.id && ex.name) nameMap[ex.id] = ex.name })
      })
      setExerciseNameMap(nameMap)
    }

    // Signed URL for latest report photo
    const latestPhoto = reportsRes.data?.[0]?.photo_front
    if (latestPhoto) {
      if (latestPhoto.startsWith('http')) {
        setLatestPhotoUrl(latestPhoto)
      } else {
        const { data: urlData } = await supabase.storage.from('reports').createSignedUrl(latestPhoto, 3600)
        if (urlData?.signedUrl) setLatestPhotoUrl(urlData.signedUrl)
      }
    }

    setLoading(false)

    // Feature 6: progress photos — fetch after setLoading so page renders fast
    const { data: photosData } = await supabase
      .from('progress_photos')
      .select('id,photo_url,taken_at,weight_kg')
      .eq('user_id', clientId)
      .order('taken_at', { ascending: false })
      .limit(6)

    if (photosData && photosData.length > 0) {
      const paths = photosData.map((p: any) => p.photo_url).filter(Boolean)
      if (paths.length > 0) {
        const { data: signedData } = await supabase.storage
          .from('progress-photos')
          .createSignedUrls(paths, 3600)
        const urlMap: Record<string, string> = {}
        ;(signedData || []).forEach((s: any) => {
          if (s.path && s.signedUrl) urlMap[s.path] = s.signedUrl
        })
        setProgressPhotos(
          photosData.map((p: any) => ({
            id: p.id,
            url: urlMap[p.photo_url] || '',
            taken_at: p.taken_at,
            weight_kg: p.weight_kg ?? null,
          })).filter((p) => p.url)
        )
      }
    }
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

  // Feature 7: mark swap request as reviewed
  async function markSwapReviewed(id: string) {
    const supabase = createClient()
    await supabase.from('workout_swap_requests').update({ status: 'reviewed' }).eq('id', id)
    setSwapRequests((prev) => prev.filter((r) => r.id !== id))
  }

  // Feature 9: save coach note
  async function saveNote() {
    if (!noteInput.trim() || !coachId) return
    setSavingNote(true)
    const supabase = createClient()
    const { data } = await supabase.from('coach_client_notes').insert({
      coach_id: coachId,
      client_id: clientId,
      content: noteInput.trim(),
    }).select('id,content,created_at').single()
    if (data) setClientNotes((prev) => [data, ...prev])
    setNoteInput('')
    setSavingNote(false)
  }

  // Feature 9: delete coach note
  async function deleteNote(id: string) {
    const supabase = createClient()
    await supabase.from('coach_client_notes').delete().eq('id', id)
    setClientNotes((prev) => prev.filter((n) => n.id !== id))
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

  // All logs from the most recent session (for detail view)
  const lastSessionLogs = lastSessionDate
    ? workoutLogs.filter((l) => l.saved_at?.slice(0, 10) === lastSessionDate)
    : []

  const exerciseCounts: Record<string, number> = {}
  workoutLogs.forEach((l) => {
    if (l.exercise_id) exerciseCounts[l.exercise_id] = (exerciseCounts[l.exercise_id] || 0) + 1
  })
  const mostTrainedId = Object.entries(exerciseCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const mostTrainedName = mostTrainedId
    ? (exerciseNameMap[mostTrainedId] ?? EXERCISE_NAMES[mostTrainedId] ?? mostTrainedId)
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

  // ── Feature 1: Frequency heatmap (last 8 weeks) ──────────────────────────

  const logDateSet = new Set(workoutLogs.map((l) => l.saved_at?.slice(0, 10)).filter(Boolean))

  // Build 8-week grid: weeks[0] = oldest, weeks[7] = current week
  // Each week: Mon-Sun (7 days)
  const heatmapWeeks: string[][] = []
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  // Find Monday of current week
  const dayOfWeek = today.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const currentMonday = new Date(today)
  currentMonday.setDate(today.getDate() + diffToMonday)
  currentMonday.setHours(0, 0, 0, 0)
  for (let w = 7; w >= 0; w--) {
    const weekDates: string[] = []
    for (let d = 0; d < 7; d++) {
      const dt = new Date(currentMonday)
      dt.setDate(currentMonday.getDate() - w * 7 + d)
      weekDates.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`)
    }
    heatmapWeeks.push(weekDates)
  }

  // ── Feature 2: Personal records ──────────────────────────────────────────

  const prByExercise: Record<string, number> = {}
  workoutLogs.forEach((log) => {
    if (!log.exercise_id) return
    const maxVal = Math.max(
      parseFloat(log.w1 || '0') || 0,
      parseFloat(log.w2 || '0') || 0,
      parseFloat(log.w3 || '0') || 0,
    )
    if (maxVal > 0) {
      prByExercise[log.exercise_id] = Math.max(prByExercise[log.exercise_id] || 0, maxVal)
    }
  })
  const topPRs = Object.entries(prByExercise)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
  const maxPR = topPRs[0]?.[1] || 1

  // ── Feature 3: Compliance rate ────────────────────────────────────────────

  const now28 = new Date()
  now28.setDate(now28.getDate() - 28)
  const cutoff28Str = `${now28.getFullYear()}-${String(now28.getMonth() + 1).padStart(2, '0')}-${String(now28.getDate()).padStart(2, '0')}`
  const scheduledIn28 = allSchedule.filter((s: any) => s.scheduled_date >= cutoff28Str).length
  const loggedIn28 = new Set(
    workoutLogs
      .map((l) => l.saved_at?.slice(0, 10))
      .filter((d): d is string => Boolean(d) && d >= cutoff28Str)
  ).size
  const compliancePct = scheduledIn28 > 0 ? Math.round((loggedIn28 / scheduledIn28) * 100) : null

  // ── Feature 8: Streak counter ─────────────────────────────────────────────

  // Build set of week-monday-strings that have at least 1 workout
  const weeksWithWorkouts = new Set<string>()
  workoutLogs.forEach((log) => {
    if (!log.saved_at) return
    const d = new Date(log.saved_at)
    const day = d.getDay()
    const mon = new Date(d)
    mon.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
    mon.setHours(0, 0, 0, 0)
    weeksWithWorkouts.add(mon.toISOString().slice(0, 10))
  })
  // Walk back from current week
  let streakWeeks = 0
  for (let w = 0; w < 52; w++) {
    const mon = new Date(currentMonday)
    mon.setDate(currentMonday.getDate() - w * 7)
    mon.setHours(0, 0, 0, 0)
    const key = mon.toISOString().slice(0, 10)
    if (weeksWithWorkouts.has(key)) {
      streakWeeks++
    } else {
      break
    }
  }

  // ── Feature 10: Volume chart ──────────────────────────────────────────────

  const volumeByDate: Record<string, number> = {}
  workoutLogs.forEach((log) => {
    const date = log.saved_at?.slice(0, 10)
    if (!date) return
    const maxVal = Math.max(
      parseFloat(log.w1 || '0') || 0,
      parseFloat(log.w2 || '0') || 0,
      parseFloat(log.w3 || '0') || 0,
    )
    if (maxVal > 0) volumeByDate[date] = (volumeByDate[date] || 0) + maxVal
  })
  const volumeData = Object.entries(volumeByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, volume]) => ({ date, volume }))

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
      const maxWt = Math.max(
        parseFloat(log.w1 || '0') || 0,
        parseFloat(log.w2 || '0') || 0,
        parseFloat(log.w3 || '0') || 0,
      )
      if (maxWt === 0) return
      const d = new Date(log.saved_at)
      const day = d.getDay()
      const mon = new Date(d)
      mon.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
      mon.setHours(0, 0, 0, 0)
      const weekKey = mon.toISOString().slice(0, 10)
      if (!byExerciseWeek[exId]) byExerciseWeek[exId] = {}
      if (!byExerciseWeek[exId][weekKey] || maxWt > byExerciseWeek[exId][weekKey]) {
        byExerciseWeek[exId][weekKey] = maxWt
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
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', flexShrink: 0, background: 'var(--accent-soft-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '20px', color: 'var(--accent-primary)' }}>
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
                <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', padding: '3px 10px', borderRadius: '999px', background: 'var(--accent-soft-bg)', border: '1px solid rgba(0,0,0,0.06)', color: 'var(--accent-primary)', letterSpacing: '0.5px' }}>
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

        {/* ── FEATURE 4: NUTRITION PLAN ── */}
        <div style={SECTION}>
          <p style={LABEL}>Рацион клиента</p>
          {clientNutrition ? (
            <div>
              <p style={{ ...BIG, fontSize: '36px', marginBottom: '12px' }}>
                {clientNutrition.calories}
                <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '14px', color: 'var(--text-secondary)', marginLeft: '6px' }}>ккал</span>
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[
                  { label: 'Белки', value: clientNutrition.protein },
                  { label: 'Жиры', value: clientNutrition.fat },
                  { label: 'Углеводы', value: clientNutrition.carbs },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: 'var(--bg-card-soft)', borderRadius: 'var(--radius-md)', padding: '10px 14px', flex: '1 1 0', textAlign: 'center' }}>
                    <p style={{ ...MICRO_LABEL, margin: '0 0 4px', textAlign: 'center' }}>{label}</p>
                    <p style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '18px', color: 'var(--text-primary)', margin: 0 }}>
                      {value ?? '—'}
                    </p>
                  </div>
                ))}
              </div>
              {clientNutrition.notes && (
                <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '12px', color: 'var(--text-secondary)', margin: '10px 0 0', lineHeight: 1.5 }}>
                  {clientNutrition.notes}
                </p>
              )}
            </div>
          ) : (
            <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>
              Рацион не назначен
            </p>
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
                    border: trajPeriod === p ? '1px solid rgba(0,0,0,0.1)' : '1px solid var(--text-tertiary)',
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
                          {exerciseNameMap[exId] ?? EXERCISE_NAMES[exId] ?? exId}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {weeks.length > 1 && (
                            <LineChart width={56} height={20} data={sparkPoints}>
                              <Line type="monotone" dataKey="w" stroke="var(--accent-primary)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                            </LineChart>
                          )}
                          {diff !== 0 && (
                            <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', color: diff > 0 ? 'var(--success)' : 'var(--error)' }}>
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
        <div style={SECTION}>
          <p style={LABEL}>Замеры</p>
          {latestReport ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              {MEASUREMENTS.map(({ key, label }) => {
                const curr = latestReport?.[key] ?? null
                const first = firstReport?.[key] ?? null
                const d = delta(curr, first)
                // Feature 5: sparkline data for this measurement
                const sparkData = reportsAsc
                  .map((r) => ({ v: r[key] ?? null }))
                  .filter((p) => p.v != null)
                const hasSpark = sparkData.length >= 2
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
                    {hasSpark && (
                      <div style={{ marginTop: '6px' }}>
                        <LineChart width={80} height={32} data={sparkData}>
                          <Line type="monotone" dataKey="v" stroke="var(--accent-primary)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                        </LineChart>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>
              Клиент ещё не отправил отчёт с замерами
            </p>
          )}
        </div>

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
              const nowD = new Date(); const isToday = dateStr === `${nowD.getFullYear()}-${String(nowD.getMonth()+1).padStart(2,'0')}-${String(nowD.getDate()).padStart(2,'0')}`
              return (
                <div key={dateStr} style={{ textAlign: 'center' }}>
                  <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: isToday ? 'var(--accent-primary)' : 'var(--text-tertiary)', margin: '0 0 6px' }}>
                    {WEEK_DAYS_RU[i]}
                  </p>
                  <div style={{ minHeight: '36px', borderRadius: '8px', background: title ? 'var(--accent-soft-bg)' : 'var(--bg-card-soft)', border: isToday ? '1px solid rgba(0,0,0,0.08)' : '1px solid transparent', padding: '4px 2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '8px', color: title ? 'var(--accent-primary)' : 'var(--text-tertiary)', margin: 0, lineHeight: 1.2, textAlign: 'center' }}>
                      {title || '—'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── FEATURE 1: FREQUENCY HEATMAP ── */}
        <div style={SECTION}>
          <p style={LABEL}>Частота (8 недель)</p>
          <div style={{ display: 'flex', gap: '3px' }}>
            {heatmapWeeks.map((week, wi) => (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                {week.map((dateStr) => {
                  const hasWorkout = logDateSet.has(dateStr)
                  const isToday = dateStr === todayStr
                  let bg = 'var(--bg-card-soft)'
                  if (isToday) bg = 'rgba(0,0,0,0.12)'
                  else if (hasWorkout) bg = 'var(--accent-primary)'
                  return (
                    <div
                      key={dateStr}
                      title={dateStr}
                      style={{
                        width: '100%',
                        paddingBottom: '100%',
                        position: 'relative',
                        borderRadius: '3px',
                        background: bg,
                        opacity: hasWorkout ? 1 : 0.35,
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', alignItems: 'center' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--bg-card-soft)', opacity: 0.35 }} />
            <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '9px', color: 'var(--text-tertiary)' }}>нет</span>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--accent-primary)', marginLeft: '8px' }} />
            <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '9px', color: 'var(--text-tertiary)' }}>тренировка</span>
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
          {/* Feature 3: compliance + Feature 8: streak — second row */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '10px' }}>
            <div style={{ background: 'var(--bg-card-soft)', borderRadius: 'var(--radius-md)', padding: '14px 18px', flex: '1 1 0' }}>
              <p style={{ ...MICRO_LABEL, margin: '0 0 6px' }}>Выполнение</p>
              <p style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '20px', letterSpacing: '-0.5px', color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>
                {scheduledIn28 > 0 ? `${loggedIn28} / ${scheduledIn28}` : '—'}
              </p>
              {compliancePct !== null && (
                <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  {compliancePct}%
                </p>
              )}
            </div>
            <div style={{ background: 'var(--bg-card-soft)', borderRadius: 'var(--radius-md)', padding: '14px 18px', flex: '1 1 0' }}>
              <p style={{ ...MICRO_LABEL, margin: '0 0 6px' }}>Недель подряд</p>
              <p style={{ ...BIG, fontSize: '32px' }}>{streakWeeks}</p>
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

        {/* ── FEATURE 2: PERSONAL RECORDS ── */}
        {topPRs.length > 0 && (
          <div style={SECTION}>
            <p style={LABEL}>Личные рекорды</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {topPRs.map(([exId, weight]) => {
                const barWidth = Math.round((weight / maxPR) * 100)
                const exName = exerciseNameMap[exId] ?? EXERCISE_NAMES[exId] ?? exId
                return (
                  <div key={exId}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                      <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', color: 'var(--text-primary)' }}>
                        {exName}
                      </span>
                      <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '16px', color: 'var(--accent-primary)', letterSpacing: '-0.5px' }}>
                        {weight} <span style={{ fontFamily: 'var(--font-text)', fontSize: '10px', color: 'var(--text-tertiary)' }}>кг</span>
                      </span>
                    </div>
                    <div style={{ height: '3px', borderRadius: '2px', background: 'var(--bg-card-soft)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barWidth}%`, borderRadius: '2px', background: 'var(--accent-primary)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── FEATURE 10: VOLUME CHART ── */}
        {volumeData.length >= 2 && (
          <div style={SECTION}>
            <p style={LABEL}>Объём (кг / тренировка)</p>
            <LineChart width={440} height={80} data={volumeData} style={{ maxWidth: '100%' }}>
              <Line type="monotone" dataKey="volume" stroke="var(--accent-primary)" strokeWidth={2} dot={{ r: 3, fill: 'var(--accent-primary)', strokeWidth: 0 }} isAnimationActive={false} />
            </LineChart>
          </div>
        )}

        {/* ── LAST SESSION DETAIL ── */}
        {lastSessionLogs.length > 0 && (
          <div style={SECTION}>
            <p style={LABEL}>Последняя тренировка · {fmtDate(lastSessionDate!)}</p>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {lastSessionLogs.map((log, i) => {
                const sets = [log.w1, log.w2, log.w3].filter((w) => w && parseFloat(w) > 0)
                return (
                  <div
                    key={i}
                    style={{ borderBottom: '1px solid var(--bg-card-soft)', padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', color: 'var(--text-primary)' }}>
                      {exerciseNameMap[log.exercise_id] ?? EXERCISE_NAMES[log.exercise_id] ?? log.exercise_id}
                    </span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                      {sets.map((w, j) => (
                        <span key={j} style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '14px', color: 'var(--accent-primary)' }}>
                          {w}
                        </span>
                      ))}
                      {sets.length > 0 && (
                        <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '10px', color: 'var(--text-tertiary)' }}>кг</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── FEATURE 6: PROGRESS PHOTOS GALLERY ── */}
        {progressPhotos.length > 0 && (
          <div style={SECTION}>
            <p style={LABEL}>Фото прогресса</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {progressPhotos.map((photo) => (
                <div key={photo.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <img
                    src={photo.url}
                    alt={photo.taken_at}
                    style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--divider)' }}
                  />
                  <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '9px', color: 'var(--text-tertiary)', margin: 0, textAlign: 'center', letterSpacing: '0.5px' }}>
                    {new Date(photo.taken_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    {photo.weight_kg != null && ` · ${photo.weight_kg} кг`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FEATURE 7: SWAP REQUESTS ── */}
        {swapRequests.length > 0 && (
          <div style={SECTION}>
            <p style={LABEL}>Запросы на замену</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {swapRequests.map((req) => (
                <div key={req.id} style={{ background: 'var(--bg-card-soft)', borderRadius: 'var(--radius-md)', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '10px', color: 'var(--text-tertiary)', margin: '0 0 4px', letterSpacing: '1px' }}>
                      {fmtDate(req.created_at)}
                    </p>
                    {req.reason && (
                      <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', color: 'var(--text-primary)', margin: 0, lineHeight: 1.4 }}>
                        {req.reason}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => markSwapReviewed(req.id)}
                    style={{ flexShrink: 0, padding: '6px 14px', borderRadius: '999px', background: 'transparent', border: '1px solid var(--divider)', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer', letterSpacing: '0.5px' }}
                  >
                    Рассмотрено
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LAST FEEDBACK ── */}
        {feedbacks.length > 0 && (
          <div style={SECTION}>
            <p style={LABEL}>Последние отзывы тренера</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {feedbacks.map((fb, i) => (
                <div key={i} style={{ borderLeft: '2px solid rgba(0,0,0,0.06)', paddingLeft: '12px' }}>
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

        {/* ── FEATURE 9: COACH NOTES ── */}
        <div style={SECTION}>
          <p style={LABEL}>Заметки тренера</p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <textarea
              placeholder="Заметка о клиенте..."
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              rows={3}
              style={{ flex: 1, background: 'var(--bg-card-soft)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }}
            />
            <button
              onClick={saveNote}
              disabled={savingNote || !noteInput.trim()}
              style={{ alignSelf: 'flex-end', padding: '10px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-primary)', color: '#fff', border: 'none', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', cursor: 'pointer', opacity: !noteInput.trim() ? 0.5 : 1, flexShrink: 0 }}
            >
              {savingNote ? '...' : 'Сохранить'}
            </button>
          </div>
          {clientNotes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {clientNotes.map((note) => (
                <div key={note.id} style={{ background: 'var(--bg-card-soft)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', color: 'var(--text-primary)', margin: '0 0 4px', lineHeight: 1.4 }}>
                      {note.content}
                    </p>
                    <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '9px', color: 'var(--text-tertiary)', margin: 0, letterSpacing: '1px' }}>
                      {fmtDate(note.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteNote(note.id)}
                    style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '14px', padding: '0 4px', lineHeight: 1 }}
                    title="Удалить заметку"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RESET PASSWORD ── */}
        <div style={SECTION}>
          <p style={LABEL}>Сменить пароль клиента</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="password"
              placeholder="Новый пароль (мин. 6 символов)"
              value={resetPassword}
              onChange={e => { setResetPassword(e.target.value); setResetDone(false) }}
              style={{ flex: 1, background: 'var(--bg-card-soft)', border: '1px solid var(--divider)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontFamily: 'var(--font-text)', fontSize: '13px', color: 'var(--text-primary)', outline: 'none' }}
            />
            <button
              onClick={handleResetPassword}
              disabled={savingReset || resetPassword.length < 6}
              style={{ padding: '10px 16px', borderRadius: 'var(--radius-sm)', background: resetDone ? 'var(--success)' : 'var(--accent-primary)', color: '#fff', border: 'none', fontFamily: 'var(--font-text)', fontSize: '13px', cursor: 'pointer', opacity: resetPassword.length < 6 ? 0.5 : 1, flexShrink: 0 }}
            >
              {resetDone ? '✓' : savingReset ? '...' : 'Сохранить'}
            </button>
          </div>
        </div>

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
              style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', background: feedbackSent ? 'var(--success)' : 'var(--accent-primary)', color: '#fff', border: 'none', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', cursor: 'pointer', transition: 'background 0.2s', opacity: !feedbackInput.trim() ? 0.5 : 1, flexShrink: 0 }}
            >
              {feedbackSent ? '✓' : sendingFeedback ? '...' : 'Отправить'}
            </button>
          </div>
        </div>

        {/* ── DELETE CLIENT ── */}
        <div style={{ padding: '28px 0' }}>
          <button
            onClick={deleteClient}
            className="pressable"
            style={{ background: 'transparent', border: '1px solid var(--error)', borderRadius: '999px', color: 'var(--error)', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '12px', padding: '8px 20px', cursor: 'pointer', letterSpacing: '0.5px' }}
          >
            Удалить клиента
          </button>
        </div>

      </div>
    </div>
  )
}
