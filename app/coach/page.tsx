'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'
import { getPaymentStatus, fmtDate, fmtPeriod, daysSince } from '@/lib/utils'
import { EXERCISE_NAMES, MOOD_EMOJIS } from '@/lib/exercises'
import ArtName from '@/app/components/ArtName'
import BrandLogo from '@/app/components/BrandLogo'
import { LABEL } from '@/lib/design/tokens'

const glass: React.CSSProperties = {
  borderBottom: '1px solid var(--divider)',
  padding: '28px 0',
  marginBottom: '0',
}

const inputSm: React.CSSProperties = {
  background: 'var(--bg-card-soft)',
  border: '1px solid var(--divider)',
  borderRadius: 'var(--radius-sm)',
  padding: '7px 10px',
  fontFamily: 'var(--font-text)',
  fontWeight: 400,
  fontSize: '13px',
  color: 'var(--text-primary)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

type ClientData = {
  id: string
  name: string
  lastSeen: string | null
  logs: any[]
  reports: any[]
  report: any | null
  payment: any | null
  moodLog: any | null
  nutrition: any | null
  assignedWorkout: any | null
}

function Divider() {
  return <div style={{ borderTop: '1px solid var(--divider)', margin: '16px 0' }} />
}


type NutritionForm = { calories: string; protein: string; fat: string; carbs: string; notes: string }

export default function CoachPage() {
  const [coachName, setCoachName] = useState('')
  const [coachId, setCoachId] = useState<string | null>(null)
  const [clients, setClients] = useState<ClientData[]>([])
  const [loading, setLoading] = useState(true)
  const [openClient, setOpenClient] = useState<string | null>(null)
  const [totalReports, setTotalReports] = useState(0)
  const [payments, setPayments] = useState<{ paid: number; total: number }>({ paid: 0, total: 0 })
  const [updatingPayment, setUpdatingPayment] = useState<string | null>(null)
  const [monthlyRates, setMonthlyRates] = useState<Record<string, string>>({})
  const [savingRate, setSavingRate] = useState<string | null>(null)
  const [editingRate, setEditingRate] = useState<string | null>(null)
  const [workoutsList, setWorkoutsList] = useState<any[]>([])
  const [programsList, setProgramsList] = useState<any[]>([])
  // КБЖУ inline editing
  const [editingNutrition, setEditingNutrition] = useState<string | null>(null)
  const [nutritionForms, setNutritionForms] = useState<Record<string, NutritionForm>>({})
  const [savingNutrition, setSavingNutrition] = useState<string | null>(null)
  // Workout assignment
  const [assigningWorkout, setAssigningWorkout] = useState<string | null>(null)
  const [savingWorkout, setSavingWorkout] = useState<string | null>(null)
  // Payment form
  const [addingPayment, setAddingPayment] = useState<string | null>(null)
  const [paymentForms, setPaymentForms] = useState<Record<string, { period_start: string; period_end: string; amount: string; paid: boolean }>>({})
  const [savingPayment, setSavingPayment] = useState<string | null>(null)
  // Starter report
  const [addingStarterReport, setAddingStarterReport] = useState<string | null>(null)
  const [starterForms, setStarterForms] = useState<Record<string, { date: string; weight: string; chest: string; waist: string; waist_navel: string; hips: string; left_thigh: string; right_thigh: string; left_arm: string; right_arm: string; notes: string }>>({})
  const [savingStarterReport, setSavingStarterReport] = useState<string | null>(null)
  // Invite client
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePassword, setInvitePassword] = useState('')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [inviteError, setInviteError] = useState('')
  // Password reset
  const [resetPasswordFor, setResetPasswordFor] = useState<string | null>(null)
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({})
  const [savingReset, setSavingReset] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)
  const router = useRouter()
  const [swapRequests, setSwapRequests] = useState<any[]>([])
  const [swapRequestCount, setSwapRequestCount] = useState(0)
  const [viewingReport, setViewingReport] = useState<{ client: string; report: any } | null>(null)
  const [viewingReportHistory, setViewingReportHistory] = useState<{ client: string; reports: any[] } | null>(null)
  const [approvingSwap, setApprovingSwap] = useState<string | null>(null)
  const [swapWorkoutSelected, setSwapWorkoutSelected] = useState<Record<string, string>>({})
  const [feedbackInputs, setFeedbackInputs] = useState<Record<string, string>>({})
  const [savedFeedbacks, setSavedFeedbacks] = useState<Record<string, string>>({})

  async function loadData() {
    const supabase = createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) { router.push('/'); return }

    const { data: prof } = await supabase.from('profiles').select('name, role').eq('id', authData.user.id).single()
    if (prof?.role !== 'coach') { router.push('/client'); return }
    setCoachName(prof.name || 'Тренер')
    setCoachId(authData.user.id)

    const { data: profiles } = await supabase.from('profiles').select('id, name').eq('role', 'client')
    if (!profiles) { setLoading(false); return }

    // Load workouts list once for assignment UI + client tags
    const { data: allWorkoutsData } = await supabase
      .from('workouts')
      .select('id, title, subtitle, assigned_to_multiple')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    const allWorkouts = allWorkoutsData || []
    setWorkoutsList(allWorkouts)

    const { data: programsData } = await supabase
      .from('programs').select('*').eq('is_active', true)
    const allPrograms = programsData || []

    // Helper: find workout assigned to a specific client (personal first, then "for all")
    const getClientWorkout = (clientId: string) => {
      const personal = allWorkouts.find(w =>
        Array.isArray(w.assigned_to_multiple) && w.assigned_to_multiple.includes(clientId)
      )
      if (personal) return personal
      const forAll = allWorkouts.find(w =>
        !w.assigned_to_multiple || w.assigned_to_multiple.length === 0
      )
      return forAll || null
    }

    const clientsData: ClientData[] = await Promise.all(
      profiles.map(async (p) => {
        const [logsRes, reportsRes, paymentRes, moodRes, nutritionRes] = await Promise.all([
          supabase.from('workout_logs').select('*').eq('player', p.id).order('saved_at', { ascending: false }).limit(30),
          supabase.from('weekly_reports').select('*').eq('player_id', p.id).order('week_start', { ascending: false }).limit(5),
          supabase.from('payments').select('*').eq('player_id', p.id).order('created_at', { ascending: false }).limit(1),
          supabase.from('mood_logs').select('*').eq('player_id', p.id).order('logged_date', { ascending: false }).limit(1),
          supabase.from('nutrition_plans').select('*').eq('player_id', p.id).single(),
        ])

        const payment = paymentRes.data?.[0] || null
        const moodLog = moodRes.data?.[0] || null
        const assignedWorkout = getClientWorkout(p.id)

        const reports = reportsRes.data || []
        return {
          id: p.id, name: p.name,
          lastSeen: logsRes.data?.[0]?.saved_at || null,
          logs: logsRes.data || [],
          reports,
          report: reports[0] || null,
          payment,
          moodLog,
          nutrition: nutritionRes.data || null,
          assignedWorkout,
        }
      })
    )

    // Signed URLs for all report photos (latest + history)
    for (const c of clientsData) {
      for (const r of c.reports) {
        for (const key of ['photo_front', 'photo_side', 'photo_back'] as const) {
          const path = r[key]
          if (path) {
            const { data: s } = await supabase.storage.from('reports').createSignedUrl(path, 3600)
            if (s) r[`${key}_url`] = s.signedUrl
          }
        }
      }
      // Keep c.report in sync (it's a reference to reports[0])
      if (c.reports.length > 0) c.report = c.reports[0]
    }

    // Stats
    const { count: rCount } = await supabase.from('weekly_reports').select('*', { count: 'exact', head: true }).in('player_id', profiles.map(p => p.id))
    setTotalReports(rCount || 0)

    const paid = clientsData.filter(c => c.payment?.paid === true).length
    const total = profiles.length
    setPayments({ paid, total })

    // Init nutrition forms
    const forms: Record<string, NutritionForm> = {}
    clientsData.forEach(c => {
      const n = c.nutrition
      forms[c.id] = { calories: n?.calories ?? '', protein: n?.protein ?? '', fat: n?.fat ?? '', carbs: n?.carbs ?? '', notes: n?.notes ?? '' }
    })
    setNutritionForms(forms)

    const { data: feedbacks } = await supabase
      .from('coach_feedback')
      .select('client_id, message, created_at')
      .eq('coach_id', authData.user.id)
      .order('created_at', { ascending: false })

    const fbMap: Record<string, string> = {}
    ;(feedbacks || []).forEach((f: any) => {
      if (!fbMap[f.client_id]) fbMap[f.client_id] = f.message
    })
    setSavedFeedbacks(fbMap)

    setClients(clientsData)

    const { data: swapReqData } = await supabase
      .from('workout_swap_requests')
      .select('id, player_id, reason, status, created_at, current_workout_id')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    const swapWithNames = (swapReqData || []).map((req: any) => ({
      ...req,
      player_name: profiles.find((p: any) => p.id === req.player_id)?.name || 'Клиент',
      current_workout_title: allWorkouts.find((w: any) => w.id === req.current_workout_id)?.title || '—',
    }))
    setSwapRequests(swapWithNames)
    setSwapRequestCount(swapWithNames.length)

    setProgramsList(allPrograms)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function markPaid(clientId: string, paymentId: string, currentPaid: boolean) {
    setUpdatingPayment(clientId)
    const supabase = createClient()
    const newPaid = !currentPaid
    await supabase.from('payments').update({ paid: newPaid }).eq('id', paymentId)
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, payment: { ...c.payment, paid: newPaid } } : c))
    setPayments(prev => ({ ...prev, paid: newPaid ? prev.paid + 1 : Math.max(0, prev.paid - 1) }))
    setUpdatingPayment(null)
  }

  async function saveFeedback(clientId: string) {
    const supabase = createClient()
    const msg = feedbackInputs[clientId]?.trim()
    if (!msg || !coachId) return
    await supabase.from('coach_feedback').insert({
      coach_id: coachId,
      client_id: clientId,
      message: msg,
    })
    setSavedFeedbacks(prev => ({ ...prev, [clientId]: msg }))
    setFeedbackInputs(prev => ({ ...prev, [clientId]: '' }))
  }

  function calcTotal(rate: string, start: string, end: string): number | null {
    const r = parseFloat(rate)
    if (!r || !start || !end) return null
    const days = (new Date(end).getTime() - new Date(start).getTime()) / 86400000
    if (days <= 0) return null
    return Math.round(r * (days / 30) * 100) / 100
  }

  async function saveMonthlyRate(clientId: string, paymentId: string) {
    setSavingRate(clientId)
    const supabase = createClient()
    const rate = parseFloat(monthlyRates[clientId] || '0') || null
    const form = paymentForms[clientId]
    const total = rate && form?.period_start && form?.period_end
      ? calcTotal(String(rate), form.period_start, form.period_end)
      : null
    const updates: Record<string, unknown> = { monthly_rate: rate }
    if (form?.period_start) updates.period_start = form.period_start
    if (form?.period_end) updates.period_end = form.period_end
    if (total !== null) updates.amount = total
    // #30 — check for error so the button doesn't stay in "saving" state forever
    const { error } = await supabase.from('payments').update(updates).eq('id', paymentId)
    if (error) {
      console.error('saveMonthlyRate error:', error.message)
      alert('Не удалось сохранить ставку. Попробуй ещё раз.')
      setSavingRate(null)
      return
    }
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, payment: { ...c.payment, monthly_rate: rate, amount: total ?? c.payment?.amount, period_start: form?.period_start || c.payment?.period_start, period_end: form?.period_end || c.payment?.period_end } } : c))
    setEditingRate(null)
    setSavingRate(null)
  }

  async function saveNutrition(clientId: string) {
    setSavingNutrition(clientId)
    const supabase = createClient()
    const form = nutritionForms[clientId]
    await supabase.from('nutrition_plans').upsert({
      player_id: clientId,
      calories: parseFloat(form.calories) || null,
      protein: parseFloat(form.protein) || null,
      fat: parseFloat(form.fat) || null,
      carbs: parseFloat(form.carbs) || null,
      notes: form.notes || null,
      created_by: coachId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'player_id' })
    // Update local state
    setClients(prev => prev.map(c => c.id === clientId ? {
      ...c, nutrition: { ...c.nutrition, calories: parseFloat(form.calories) || null, protein: parseFloat(form.protein) || null, fat: parseFloat(form.fat) || null, carbs: parseFloat(form.carbs) || null, notes: form.notes || null }
    } : c))
    setEditingNutrition(null)
    setSavingNutrition(null)
  }

  async function assignWorkout(clientId: string, workoutId: string) {
    setSavingWorkout(clientId)
    const supabase = createClient()

    // Remove client from their previous workout first
    const prevWorkout = clients.find(c => c.id === clientId)?.assignedWorkout
    if (prevWorkout && prevWorkout.id !== workoutId) {
      const { data: prevData } = await supabase.from('workouts').select('assigned_to_multiple').eq('id', prevWorkout.id).single()
      const prevArr = (prevData?.assigned_to_multiple || []).filter((id: string) => id !== clientId)
      await supabase.from('workouts').update({ assigned_to_multiple: prevArr }).eq('id', prevWorkout.id)
    }

    // Add client to new workout's assigned_to_multiple
    const { data: workoutData } = await supabase.from('workouts').select('assigned_to_multiple').eq('id', workoutId).single()
    const current = workoutData?.assigned_to_multiple || []
    if (!current.includes(clientId)) {
      await supabase.from('workouts').update({ assigned_to_multiple: [...current, clientId] }).eq('id', workoutId)
    }

    // Update local workoutsList
    setWorkoutsList(prev => prev.map(w => {
      if (w.id === workoutId) {
        const arr = w.assigned_to_multiple || []
        return { ...w, assigned_to_multiple: arr.includes(clientId) ? arr : [...arr, clientId] }
      }
      if (prevWorkout && w.id === prevWorkout.id) {
        return { ...w, assigned_to_multiple: (w.assigned_to_multiple || []).filter((id: string) => id !== clientId) }
      }
      return w
    }))

    const workout = workoutsList.find(w => w.id === workoutId)
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, assignedWorkout: workout || null } : c))
    setAssigningWorkout(null)
    setSavingWorkout(null)
  }

  async function sendInvite() {
    if (!inviteName.trim() || !inviteEmail.trim() || !invitePassword.trim()) return
    if (invitePassword.length < 6) { setInviteError('Пароль — минимум 6 символов'); return }
    setInviteSending(true)
    setInviteError('')
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim(), name: inviteName.trim(), password: invitePassword }),
    })
    const data = await res.json()
    if (data.success) {
      setInviteSuccess(true)
      // #27 — reset inviteSending so the button isn't stuck; #28 — use loadData() not reload()
      setInviteSending(false)
      setTimeout(() => {
        setShowInviteForm(false)
        setInviteSuccess(false)
        setInviteName('')
        setInviteEmail('')
        setInvitePassword('')
        loadData()
      }, 4000)
    } else {
      setInviteError(data.error || 'Ошибка при создании')
      setInviteSending(false)
    }
  }

  async function addPayment(clientId: string) {
    const form = paymentForms[clientId]
    if (!form?.period_start || !form?.period_end) return
    setSavingPayment(clientId)
    const supabase = createClient()
    const { error: insertError } = await supabase.from('payments').insert({
      player_id: clientId,
      period_start: form.period_start,
      period_end: form.period_end,
      amount: form.amount ? parseFloat(form.amount) : null,
      paid: form.paid,
    })
    if (insertError) { alert('Ошибка: ' + insertError.message); setSavingPayment(null); return }
    // Re-fetch to get the real row (avoids RLS issues with select-after-insert)
    const { data: fetched } = await supabase.from('payments').select('*').eq('player_id', clientId).order('created_at', { ascending: false }).limit(1).single()
    const payment = fetched || { player_id: clientId, period_start: form.period_start, period_end: form.period_end, amount: form.amount ? parseFloat(form.amount) : null, paid: form.paid }
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, payment } : c))
    if (payment.paid) setPayments(prev => ({ ...prev, paid: prev.paid + 1 }))
    setAddingPayment(null)
    setSavingPayment(null)
  }

  async function saveStarterReport(clientId: string) {
    const form = starterForms[clientId]
    if (!form?.date) return
    setSavingStarterReport(clientId)
    const supabase = createClient()
    const { data, error } = await supabase.from('weekly_reports').insert({
      player_id: clientId,
      week_start: form.date,
      weight: form.weight ? parseFloat(form.weight) : null,
      chest: form.chest ? parseFloat(form.chest) : null,
      waist: form.waist ? parseFloat(form.waist) : null,
      waist_navel: form.waist_navel ? parseFloat(form.waist_navel) : null,
      hips: form.hips ? parseFloat(form.hips) : null,
      left_thigh: form.left_thigh ? parseFloat(form.left_thigh) : null,
      right_thigh: form.right_thigh ? parseFloat(form.right_thigh) : null,
      left_arm: form.left_arm ? parseFloat(form.left_arm) : null,
      right_arm: form.right_arm ? parseFloat(form.right_arm) : null,
      notes: form.notes || null,
    }).select().single()
    if (error) { alert('Ошибка: ' + error.message); setSavingStarterReport(null); return }
    setClients(prev => prev.map(c => c.id === clientId ? {
      ...c, report: data, reports: [data, ...c.reports]
    } : c))
    setAddingStarterReport(null)
    setSavingStarterReport(null)
  }

  async function deleteWorkout(workoutId: string) {
    if (!confirm('Удалить тренировку?')) return
    const supabase = createClient()
    await supabase.from('workouts').delete().eq('id', workoutId)
    setWorkoutsList(prev => prev.filter(w => w.id !== workoutId))
    setClients(prev => prev.map(c => c.assignedWorkout?.id === workoutId ? { ...c, assignedWorkout: null } : c))
  }

  async function resolveSwap(id: string, status: 'approved' | 'declined') {
    const supabase = createClient()
    await supabase.from('workout_swap_requests').update({ status }).eq('id', id)
    setSwapRequests(prev => prev.filter(r => r.id !== id))
    setSwapRequestCount(prev => Math.max(0, prev - 1))
  }

  async function approveWithWorkout(req: any) {
    const workoutId = swapWorkoutSelected[req.id]
    if (!workoutId) return
    const supabase = createClient()
    await supabase.from('workout_swap_requests').update({ status: 'approved' }).eq('id', req.id)
    // Add player to assigned_to_multiple of chosen workout
    const { data: w } = await supabase.from('workouts').select('assigned_to_multiple').eq('id', workoutId).single()
    const current: string[] = w?.assigned_to_multiple || []
    if (!current.includes(req.player_id)) {
      await supabase.from('workouts').update({ assigned_to_multiple: [...current, req.player_id] }).eq('id', workoutId)
    }
    setSwapRequests(prev => prev.filter(r => r.id !== req.id))
    setSwapRequestCount(prev => Math.max(0, prev - 1))
    setApprovingSwap(null)
  }

  async function deleteClient(clientId: string, clientName: string) {
    if (!confirm(`Удалить клиента ${clientName}?`)) return
    if (!confirm('Это удалит все данные клиента. Вы уверены?')) return
    const supabase = createClient()
    await supabase.from('workout_logs').delete().eq('player', clientId)
    await supabase.from('mood_logs').delete().eq('player_id', clientId)
    await supabase.from('weekly_reports').delete().eq('player_id', clientId)
    await supabase.from('nutrition_plans').delete().eq('player_id', clientId)
    await supabase.from('payments').delete().eq('player_id', clientId)
    await supabase.from('workout_swap_requests').delete().eq('player_id', clientId)
    // Remove from workouts
    const { data: wks } = await supabase.from('workouts').select('id, assigned_to_multiple')
    for (const w of wks || []) {
      if (Array.isArray(w.assigned_to_multiple) && w.assigned_to_multiple.includes(clientId)) {
        await supabase.from('workouts').update({ assigned_to_multiple: w.assigned_to_multiple.filter((x: string) => x !== clientId) }).eq('id', w.id)
      }
    }
    // Remove from programs
    const { data: progs } = await supabase.from('programs').select('id, assigned_to')
    for (const p of progs || []) {
      if (Array.isArray(p.assigned_to) && p.assigned_to.includes(clientId)) {
        await supabase.from('programs').update({ assigned_to: p.assigned_to.filter((x: string) => x !== clientId) }).eq('id', p.id)
      }
    }
    await supabase.from('profiles').delete().eq('id', clientId)
    setClients(prev => prev.filter(c => c.id !== clientId))
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
  <div style={{ position: 'relative', minHeight: '100vh' }}>
    <AnimatedBackground />
    <div style={{ position: 'relative', zIndex: 1, padding: '28px 20px 60px' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px' }}>
          <div className="skeleton" style={{ height: '40px', borderRadius: 'var(--radius-md)', width: '50%', marginBottom: '8px' }} />
          <div className="skeleton" style={{ height: '10px', borderRadius: '5px', width: '30%' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton" style={{ borderRadius: 'var(--radius-md)', padding: '16px 10px', height: '64px' }} />
          ))}
        </div>
        {[1, 2].map(i => (
          <div key={i} className="skeleton" style={{ borderRadius: 'var(--radius-md)', padding: '22px', marginBottom: '12px', height: '88px' }} />
        ))}
      </div>
    </div>
  </div>
)

  const totalLogs = clients.reduce((s, c) => s + c.logs.length, 0)
  const allPaid = payments.total > 0 && payments.paid === payments.total

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, padding: '48px 24px 80px' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>

          <BrandLogo />

          {/* HEADER */}
          <div className="card-enter" style={{ paddingBottom: '32px', marginBottom: '0' }}>
            {/* Top bar: branding + actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={() => window.location.reload()} className="pressable" style={{
                  background: 'transparent', border: '1px solid var(--divider)',
                  borderRadius: '999px', cursor: 'pointer',
                  color: 'var(--text-secondary)', fontSize: '15px', padding: '6px 10px', lineHeight: 1,
                }}>↻</button>
                <button onClick={handleLogout} className="pressable" style={{
                  background: 'transparent',
                  border: '1px solid var(--divider)', borderRadius: '999px',
                  color: 'var(--text-secondary)', fontFamily: 'var(--font-text)',
                  fontWeight: 500, fontSize: '11px', padding: '7px 16px', cursor: 'pointer',
                  letterSpacing: '0.05em',
                }}>
                  Выйти
                </button>
              </div>
            </div>
            {/* Hero */}
            <ArtName name={coachName} />
            <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, color: 'var(--text-secondary)', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '6px 0 0' }}>
              Тренерский дашборд · {new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* STATS card row */}
          <div className="card-enter" style={{ background: 'var(--bg-card)', border: '1px solid var(--divider)', borderRadius: '28px', boxShadow: 'var(--shadow-soft)', padding: '20px 24px', marginBottom: '12px' }}>
            <p style={{ ...LABEL }}>Обзор</p>
            <div style={{ display: 'flex', gap: '0' }}>
              {[
                { value: clients.length, label: 'Клиентов' },
                { value: totalLogs, label: 'Тренировок' },
                { value: totalReports, label: 'Отчётов' },
              ].map(({ value, label }) => (
                <div key={label} style={{ flex: 1, textAlign: 'center', borderRight: '1px solid var(--divider)' }}>
                  <p className="number-mount" style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '36px', color: 'var(--text-primary)', margin: '0 0 4px', lineHeight: 1 }}>{value}</p>
                  <p style={{ fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', margin: 0 }}>{label}</p>
                </div>
              ))}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <p className="number-mount" style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '36px', color: allPaid ? 'var(--success)' : 'var(--error)', margin: '0 0 4px', lineHeight: 1 }}>
                  {payments.paid}/{payments.total}
                </p>
                <p style={{ fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', margin: 0 }}>Оплат</p>
              </div>
            </div>
          </div>

          {/* EARNINGS DASHBOARD */}
          {(() => {
            const totalExpected = clients.reduce((sum, c) => sum + (c.payment?.monthly_rate || c.payment?.amount || 0), 0)
            const totalReceived = clients.reduce((sum, c) => sum + (c.payment?.paid ? (c.payment?.monthly_rate || c.payment?.amount || 0) : 0), 0)
            const receivedPct = totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 0
            const now = new Date()
            const overdueClients = clients.filter(c => {
              if (!c.payment || c.payment.paid) return false
              const end = c.payment.period_end ? new Date(c.payment.period_end) : null
              return end && end < now
            })
            const noReportThisWeek = clients.filter(c => {
              if (!c.report) return true
              const reportDate = new Date(c.report.week_start)
              const daysSince = Math.floor((now.getTime() - reportDate.getTime()) / 86400000)
              return daysSince > 7
            })
            return (
              <div className="card-enter" style={{ background: 'var(--bg-card)', border: '1px solid var(--divider)', borderRadius: '28px', boxShadow: 'var(--shadow-soft)', padding: '20px 24px', marginBottom: '12px' }}>
                <p style={{ ...LABEL }}>Финансы</p>
                {/* Big earnings number */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <p className="number-mount" style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '48px', color: 'var(--text-primary)', margin: '0', lineHeight: 1 }}>
                      €{totalReceived.toLocaleString('ru-RU')}
                    </p>
                    {totalExpected > 0 && (
                      <span style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '13px', color: 'var(--text-tertiary)' }}>из €{totalExpected.toLocaleString('ru-RU')}</span>
                    )}
                  </div>
                  <p style={{ fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)', margin: '8px 0 0' }}>Получено в этом месяце</p>
                  {totalExpected > 0 && (
                    <div style={{ marginTop: '12px', height: '3px', borderRadius: '999px', background: 'var(--divider)' }}>
                      <div style={{ height: '3px', width: `${receivedPct}%`, background: 'var(--accent-primary)', borderRadius: '999px', transition: 'width 0.6s ease' }} />
                    </div>
                  )}
                </div>
                {/* Alerts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: overdueClients.length > 0 || noReportThisWeek.length > 0 ? '20px' : '0' }}>
                  {overdueClients.length > 0 && (
                    <div style={{ borderLeft: '2px solid var(--error)', paddingLeft: '12px' }}>
                      <p style={{ fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '10px', color: 'var(--error)', margin: '0 0 2px', letterSpacing: '1px', textTransform: 'uppercase' }}>Просроченная оплата</p>
                      {overdueClients.map(c => (
                        <p key={c.id} style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '12px', color: 'var(--error)', margin: 0 }}>{c.name}</p>
                      ))}
                    </div>
                  )}
                  {noReportThisWeek.length > 0 && (
                    <div style={{ borderLeft: '2px solid var(--warning)', paddingLeft: '12px' }}>
                      <p style={{ fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '10px', color: 'var(--warning)', margin: '0 0 2px', letterSpacing: '1px', textTransform: 'uppercase' }}>Нет отчёта</p>
                      {noReportThisWeek.map(c => (
                        <p key={c.id} style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '12px', color: 'var(--warning)', margin: 0 }}>{c.name}</p>
                      ))}
                    </div>
                  )}
                </div>
                {/* Client activity */}
                {clients.length > 0 && (
                  <div>
                    <p style={{ ...LABEL, marginBottom: '12px' }}>Активность · 4 недели</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {clients.map(c => {
                        const daysOff = c.lastSeen ? Math.floor((now.getTime() - new Date(c.lastSeen).getTime()) / 86400000) : null
                        const isActive = daysOff !== null && daysOff <= 3
                        const fourWeeksAgo = new Date(now.getTime() - 28 * 86400000)
                        const recentLogs = c.logs.filter(l => new Date(l.saved_at) >= fourWeeksAgo)
                        const uniqueDays = new Set(recentLogs.map(l => l.saved_at?.slice(0, 10))).size
                        const completionPct = Math.min(100, Math.round((uniqueDays / 16) * 100))
                        const clientProgram = programsList.find(p => Array.isArray(p.assigned_to) && p.assigned_to.includes(c.id))
                        return (
                          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--accent-soft-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ fontFamily: 'var(--font-text)', fontWeight: 600, fontSize: '14px', color: 'var(--accent-primary)' }}>{c.name[0]}</span>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', alignItems: 'center' }}>
                                <span style={{ fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '14px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                                <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
                                  <span style={{ fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '10px', color: isActive ? 'var(--success)' : 'var(--text-tertiary)', letterSpacing: '0.05em' }}>{isActive ? '● активна' : '● неактивна'}</span>
                                  <span style={{ fontFamily: 'var(--font-text)', fontWeight: 600, fontSize: '12px', color: 'var(--text-secondary)' }}>{completionPct}%</span>
                                </div>
                              </div>
                              <div style={{ height: '3px', borderRadius: '999px', background: 'var(--divider)' }}>
                                <div style={{ height: '3px', width: `${completionPct}%`, background: completionPct >= 75 ? 'var(--accent-primary)' : completionPct >= 40 ? 'var(--warning)' : 'var(--error)', borderRadius: '999px' }} />
                              </div>
                              {clientProgram && (
                                <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '10px', color: 'var(--text-tertiary)', margin: '3px 0 0' }}>
                                  {clientProgram.title}{clientProgram.end_date ? ` · до ${new Date(clientProgram.end_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}` : ''}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* ACTION BUTTONS */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '0', padding: '20px 0 28px', borderBottom: '1px solid var(--divider)', flexWrap: 'wrap' }}>
            <button
              onClick={() => router.push('/coach/workout/new')}
              className="pressable"
              style={{ padding: '9px 18px', borderRadius: '999px', background: 'var(--accent-primary)', border: 'none', color: '#fff', fontFamily: 'var(--font-text)', fontWeight: 600, fontSize: '12px', cursor: 'pointer', letterSpacing: '0.02em' }}
            >
              + Создать тренировку
            </button>
            <button
              onClick={() => router.push('/coach/workouts')}
              className="pressable"
              style={{ padding: '9px 16px', borderRadius: '999px', background: 'var(--bg-card)', border: '1px solid var(--divider)', color: 'var(--accent-primary)', fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '12px', cursor: 'pointer' }}
            >
              Тренировки ({workoutsList.length})
            </button>
            <button
              onClick={() => router.push('/coach/programs')}
              className="pressable"
              style={{ padding: '9px 16px', borderRadius: '999px', background: 'var(--bg-card)', border: '1px solid var(--divider)', color: 'var(--accent-primary)', fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '12px', cursor: 'pointer' }}
            >
              Программы ({programsList.length})
            </button>
            <button
              onClick={() => router.push('/coach/programs/new')}
              className="pressable"
              style={{ padding: '9px 16px', borderRadius: '999px', background: 'var(--bg-card)', border: '1px solid var(--divider)', color: 'var(--accent-primary)', fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '12px', cursor: 'pointer' }}
            >
              + Программа
            </button>
            <button
              onClick={() => { setShowInviteForm(v => !v); setInviteSuccess(false); setInviteError('') }}
              className="pressable"
              style={{ padding: '9px 18px', borderRadius: '999px', background: 'var(--accent-soft-bg)', border: '1px solid rgba(139,30,63,0.25)', color: 'var(--accent-primary)', fontFamily: 'var(--font-text)', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
            >
              + Добавить клиента
            </button>
          </div>

          {/* INVITE FORM */}
          {showInviteForm && (
            <div style={{ borderBottom: '1px solid var(--divider)', padding: '28px 0' }}>
              <h3 style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '18px', color: 'var(--text-primary)', margin: '0 0 16px' }}>
                Новый клиент
              </h3>
              {inviteSuccess ? (
                <div style={{ background: 'var(--success-bg)', border: '1px solid rgba(39,174,96,0.2)', borderRadius: '14px', padding: '16px' }}>
                  <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '13px', color: 'var(--success)', margin: '0 0 10px' }}>
                    ✓ Клиент создан! Передай данные для входа:
                  </p>
                  <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '13px', color: 'var(--text-primary)', margin: '0 0 4px' }}>
                    Email: <strong>{inviteEmail}</strong>
                  </p>
                  <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '13px', color: 'var(--text-primary)', margin: 0 }}>
                    Пароль: <strong>{invitePassword}</strong>
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Имя"
                    value={inviteName}
                    onChange={e => setInviteName(e.target.value)}
                    style={{
                      width: '100%', background: 'var(--bg-card-soft)',
                      border: '1px solid var(--divider)',
                      borderRadius: 'var(--radius-sm)', padding: '12px 18px',
                      fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '14px',
                      color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    style={{
                      width: '100%', background: 'var(--bg-card-soft)',
                      border: '1px solid var(--divider)',
                      borderRadius: 'var(--radius-sm)', padding: '12px 18px',
                      fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '14px',
                      color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Пароль (передашь клиенту)"
                    value={invitePassword}
                    onChange={e => setInvitePassword(e.target.value)}
                    style={{
                      width: '100%', background: 'var(--bg-card-soft)',
                      border: '1px solid var(--divider)',
                      borderRadius: 'var(--radius-sm)', padding: '12px 18px',
                      fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '14px',
                      color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                  {inviteError && (
                    <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '12px', color: 'var(--error)', margin: 0 }}>{inviteError}</p>
                  )}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={sendInvite}
                      disabled={inviteSending || !inviteName.trim() || !inviteEmail.trim() || !invitePassword.trim()}
                      className="pressable"
                      style={{
                        flex: 1, padding: '12px', borderRadius: '999px',
                        background: 'var(--accent-primary)', color: '#fff', border: 'none',
                        fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '14px',
                        cursor: inviteSending || !inviteName.trim() || !inviteEmail.trim() || !invitePassword.trim() ? 'not-allowed' : 'pointer',
                        opacity: inviteSending || !inviteName.trim() || !inviteEmail.trim() || !invitePassword.trim() ? 0.5 : 1,
                      }}
                    >
                      {inviteSending ? 'Создаём...' : 'Создать клиента'}
                    </button>
                    <button
                      onClick={() => { setShowInviteForm(false); setInviteError('') }}
                      style={{
                        padding: '12px 18px', borderRadius: '999px',
                        background: 'var(--bg-card-soft)', color: 'var(--text-secondary)', border: '1px solid var(--divider)',
                        fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '14px',
                        cursor: 'pointer',
                      }}
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SWAP REQUESTS */}
          {swapRequests.length > 0 && (
            <div style={{ borderBottom: '1px solid var(--divider)', padding: '28px 0' }}>
              <p style={{ ...LABEL }}>
                Замена тренировки · {swapRequests.length}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {swapRequests.map(req => (
                  <div key={req.id} style={{ background: 'var(--accent-soft-bg)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '14px', color: 'var(--text-primary)', margin: '0 0 2px' }}>{req.player_name}</p>
                        <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 4px' }}>Тренировка: {req.current_workout_title}</p>
                        {req.reason && <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '12px', color: 'var(--text-secondary)', margin: '0', fontStyle: 'italic' }}>«{req.reason}»</p>}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button
                          onClick={() => setApprovingSwap(approvingSwap === req.id ? null : req.id)}
                          className="pressable"
                          style={{ padding: '4px 12px', borderRadius: '999px', background: 'var(--success-bg)', border: '1px solid rgba(39,174,96,0.25)', color: 'var(--success)', fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '11px', cursor: 'pointer' }}
                        >
                          ✓ Одобрить
                        </button>
                        <button
                          onClick={() => resolveSwap(req.id, 'declined')}
                          className="pressable"
                          style={{ padding: '4px 12px', borderRadius: '999px', background: 'var(--error-bg)', border: '1px solid rgba(178,58,72,0.2)', color: 'var(--error)', fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '11px', cursor: 'pointer' }}
                        >
                          ✕ Отклонить
                        </button>
                      </div>
                    </div>
                    {approvingSwap === req.id && (
                      <div style={{ marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select
                          value={swapWorkoutSelected[req.id] || ''}
                          onChange={e => setSwapWorkoutSelected(prev => ({ ...prev, [req.id]: e.target.value }))}
                          style={{ flex: 1, background: 'var(--bg-card-soft)', border: '1px solid var(--divider)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '13px', color: 'var(--text-primary)', outline: 'none' }}
                        >
                          <option value="">— выбери тренировку —</option>
                          {workoutsList.map(w => (
                            <option key={w.id} value={w.id}>{w.title}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => approveWithWorkout(req)}
                          disabled={!swapWorkoutSelected[req.id]}
                          style={{ padding: '8px 16px', borderRadius: '999px', background: swapWorkoutSelected[req.id] ? 'var(--success)' : 'var(--success-bg)', color: swapWorkoutSelected[req.id] ? '#fff' : 'var(--success)', border: 'none', fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '12px', cursor: swapWorkoutSelected[req.id] ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}
                        >
                          Назначить
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CLIENTS */}
          <p style={{ ...LABEL, marginTop: '32px', marginBottom: '14px' }}>Клиенты · {clients.length}</p>

          {clients.map(client => {
            const isOpen = openClient === client.id
            const daysOff = daysSince(client.lastSeen)
            const inactive = daysOff !== null && daysOff > 3
            const report = client.report
            const payment = client.payment
            const mood = client.moodLog
            const nutrition = client.nutrition
            const assignedWorkout = client.assignedWorkout
            const isEditingNutrition = editingNutrition === client.id
            const isAssigningWorkout = assigningWorkout === client.id
            const nForm = nutritionForms[client.id] || { calories: '', protein: '', fat: '', carbs: '', notes: '' }

            const maxByEx: Record<string, number> = {}
            client.logs.forEach(l => {
              const w = Math.max(parseFloat(l.w1 || '0') || 0, parseFloat(l.w2 || '0') || 0, parseFloat(l.w3 || '0') || 0)
              if (w > (maxByEx[l.exercise_id] || 0)) maxByEx[l.exercise_id] = w
            })
            const top3 = Object.entries(maxByEx).sort(([, a], [, b]) => b - a).slice(0, 3)
            const clientMax = top3[0]?.[1] || 1

            // Last workout session logs
            const lastDate = client.logs[0]?.saved_at?.slice(0, 10)
            const lastSessionLogs = lastDate
              ? client.logs.filter(l => l.saved_at?.slice(0, 10) === lastDate && (l.w1 || l.reps))
              : []

            // Reports
            const latestReport = client.report
            const prevReport = client.reports[1] || null
            const weightDiff = latestReport?.weight != null && prevReport?.weight != null
              ? +(latestReport.weight - prevReport.weight).toFixed(1)
              : null
            const weeksBetween = latestReport && prevReport
              ? Math.round((new Date(latestReport.week_start).getTime() - new Date(prevReport.week_start).getTime()) / (7 * 86400000))
              : null

            return (
              <div key={client.id} className="card-enter" style={{ background: 'var(--bg-card)', border: '1px solid var(--divider)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-soft)', padding: '16px 18px', marginBottom: '10px' }}>
                {/* A — HEADER */}
                <div onClick={() => setOpenClient(isOpen ? null : client.id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <div onClick={e => { e.stopPropagation(); router.push(`/coach/clients/${client.id}`) }} style={{ width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0, background: 'var(--accent-soft-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-text)', fontWeight: 600, fontSize: '16px', color: 'var(--accent-primary)' }}>
                    {client.name[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
                      <h3 onClick={e => { e.stopPropagation(); router.push(`/coach/clients/${client.id}`) }} style={{ fontFamily: 'var(--font-text)', fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px', margin: 0 }}>{client.name}</h3>
                      {assignedWorkout && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center',
                          background: 'var(--bg-card-soft)', border: '1px solid var(--divider)',
                          borderRadius: '999px', padding: '2px 10px',
                          fontSize: '10px', color: 'var(--accent-primary)',
                          fontFamily: 'var(--font-text)', fontWeight: 500, flexShrink: 0,
                          letterSpacing: '0.03em',
                        }}>
                          {assignedWorkout.title}
                        </span>
                      )}
                    </div>
                    <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '11px', margin: 0, color: inactive ? 'var(--error)' : 'var(--text-tertiary)' }}>
                      {client.lastSeen ? (inactive ? `Не заходила ${daysOff} дн.` : `Активна ${fmtDate(client.lastSeen)}`) : 'Ещё нет записей'}
                    </p>
                  </div>
                  <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    {payment ? (
                      <>
                        {(() => { const ps = getPaymentStatus(payment); return (
                          <span style={{ fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '10px', padding: '3px 10px', borderRadius: '999px', background: 'transparent', border: ps.border, color: ps.color, whiteSpace: 'nowrap', letterSpacing: '1px' }}>
                            {ps.label}
                          </span>
                        )})()}
                        {(payment.monthly_rate || payment.amount) && (
                          <span style={{ fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>€{(payment.monthly_rate || payment.amount).toLocaleString('ru-RU')}/мес</span>
                        )}
                        {payment.period_start && (
                          <span style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '9px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{fmtPeriod(payment.period_start, payment.period_end)}</span>
                        )}
                      </>
                    ) : (
                      <span style={{ fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '10px', padding: '4px 10px', borderRadius: '999px', background: 'var(--bg-card-soft)', border: '1px solid var(--divider)', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>Нет оплаты</span>
                    )}
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>{isOpen ? '▴' : '▾'}</span>
                  </div>
                </div>

                {/* Coach feedback */}
                <div style={{ marginTop: '12px' }}>
                  {savedFeedbacks[client.id] && (
                    <p style={{ fontFamily: 'var(--font-primary)', fontStyle: 'italic', fontSize: '12px', color: 'var(--text-tertiary)', margin: '0 0 8px', borderLeft: '2px solid rgba(139,30,63,0.2)', paddingLeft: '10px' }}>
                      {savedFeedbacks[client.id]}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Написать клиенту..."
                      value={feedbackInputs[client.id] || ''}
                      onChange={e => setFeedbackInputs(prev => ({ ...prev, [client.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && saveFeedback(client.id)}
                      onClick={e => e.stopPropagation()}
                      style={{ flex: 1, background: 'var(--bg-card-soft)', border: '1px solid var(--divider)', borderRadius: '999px', padding: '8px 14px', fontFamily: 'var(--font-text)', fontSize: '13px', color: 'var(--text-primary)', outline: 'none' }}
                    />
                    <button
                      onClick={e => { e.stopPropagation(); saveFeedback(client.id) }}
                      className="pressable"
                      style={{ padding: '8px 16px', borderRadius: '999px', background: 'var(--accent-primary)', border: 'none', color: '#fff', fontFamily: 'var(--font-text)', fontSize: '12px', cursor: 'pointer' }}
                    >
                      →
                    </button>
                  </div>
                </div>

                {/* Mark paid + Add payment */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                  {payment && (
                    <button onClick={e => { e.stopPropagation(); markPaid(client.id, payment.id, payment.paid) }} disabled={updatingPayment === client.id} className="pressable" style={{ padding: '5px 14px', borderRadius: '999px', background: payment.paid ? 'var(--error-bg)' : 'var(--success-bg)', border: payment.paid ? '1px solid rgba(178,58,72,0.2)' : '1px solid rgba(39,174,96,0.25)', color: payment.paid ? 'var(--error)' : 'var(--success)', fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '11px', cursor: 'pointer' }}>
                      {updatingPayment === client.id ? '...' : payment.paid ? '✕ Отменить оплату' : '✓ Отметить оплату'}
                    </button>
                  )}
                  {!payment && (
                    <button onClick={e => { e.stopPropagation(); setAddingPayment(addingPayment === client.id ? null : client.id); if (!paymentForms[client.id]) setPaymentForms(prev => ({ ...prev, [client.id]: { period_start: '', period_end: '', amount: '', paid: false } })) }} className="pressable" style={{ padding: '5px 14px', borderRadius: '999px', background: 'var(--accent-soft-bg)', border: '1px solid rgba(139,30,63,0.2)', color: 'var(--accent-primary)', fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '11px', cursor: 'pointer' }}>
                      + Добавить оплату
                    </button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); setResetPasswordFor(resetPasswordFor === client.id ? null : client.id); setResetSuccess(null) }}
                    style={{ padding: '5px 14px', borderRadius: '999px', background: 'var(--bg-card-soft)', border: '1px solid var(--divider)', color: 'var(--text-secondary)', fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '11px', cursor: 'pointer' }}
                  >
                    🔑 Пароль
                  </button>
                </div>

                {/* Reset password form */}
                {resetPasswordFor === client.id && (
                  <div style={{ background: 'var(--bg-card-soft)', border: '1px solid var(--divider)', borderRadius: '14px', padding: '14px', marginTop: '10px' }} onClick={e => e.stopPropagation()}>
                    <p style={{ fontFamily: 'var(--font-text)', fontWeight: 600, fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '0 0 8px' }}>Новый пароль</p>
                    {resetSuccess === client.id ? (
                      <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '13px', color: 'var(--success)', margin: 0 }}>✓ Пароль обновлён</p>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          placeholder="Введи новый пароль"
                          value={resetPasswords[client.id] || ''}
                          onChange={e => setResetPasswords(prev => ({ ...prev, [client.id]: e.target.value }))}
                          style={{ ...inputSm, flex: 1 }}
                        />
                        <button
                          disabled={savingReset === client.id || (resetPasswords[client.id] || '').length < 6}
                          onClick={async () => {
                            setSavingReset(client.id)
                            const res = await fetch('/api/reset-password', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ userId: client.id, password: resetPasswords[client.id] }),
                            })
                            const data = await res.json()
                            setSavingReset(null)
                            if (data.success) {
                              setResetSuccess(client.id)
                              setResetPasswords(prev => ({ ...prev, [client.id]: '' }))
                              setTimeout(() => { setResetPasswordFor(null); setResetSuccess(null) }, 2000)
                            } else {
                              alert(data.error || 'Ошибка')
                            }
                          }}
                          style={{ padding: '7px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-primary)', color: '#fff', border: 'none', fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '12px', cursor: 'pointer', opacity: (resetPasswords[client.id] || '').length < 6 ? 0.4 : 1, flexShrink: 0 }}
                        >
                          {savingReset === client.id ? '...' : 'Сохранить'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Payment form */}
                {addingPayment === client.id && (
                  <div style={{ background: 'var(--bg-card-soft)', border: '1px solid var(--divider)', borderRadius: '14px', padding: '14px', marginTop: '10px' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      <div>
                        <p style={{ fontFamily: 'var(--font-text)', fontWeight: 600, fontSize: '9px', color: 'var(--text-tertiary)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Начало периода</p>
                        <input type="date" value={paymentForms[client.id]?.period_start || ''} onChange={e => setPaymentForms(prev => ({ ...prev, [client.id]: { ...prev[client.id], period_start: e.target.value } }))} style={{ ...inputSm, borderRadius: 'var(--radius-sm)' }} />
                      </div>
                      <div>
                        <p style={{ fontFamily: 'var(--font-text)', fontWeight: 600, fontSize: '9px', color: 'var(--text-tertiary)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Конец периода</p>
                        <input type="date" value={paymentForms[client.id]?.period_end || ''} onChange={e => setPaymentForms(prev => ({ ...prev, [client.id]: { ...prev[client.id], period_end: e.target.value } }))} style={{ ...inputSm, borderRadius: 'var(--radius-sm)' }} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                      <div>
                        <p style={{ fontFamily: 'var(--font-text)', fontWeight: 600, fontSize: '9px', color: 'var(--text-tertiary)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Сумма €</p>
                        <input type="number" placeholder="5000" value={paymentForms[client.id]?.amount || ''} onChange={e => setPaymentForms(prev => ({ ...prev, [client.id]: { ...prev[client.id], amount: e.target.value } }))} className="no-spin" style={{ ...inputSm, borderRadius: 'var(--radius-sm)' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '18px' }}>
                        <input type="checkbox" id={`paid-${client.id}`} checked={paymentForms[client.id]?.paid || false} onChange={e => setPaymentForms(prev => ({ ...prev, [client.id]: { ...prev[client.id], paid: e.target.checked } }))} style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }} />
                        <label htmlFor={`paid-${client.id}`} style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>Оплачено</label>
                      </div>
                    </div>
                    <button onClick={() => addPayment(client.id)} disabled={savingPayment === client.id} className="pressable" style={{ padding: '7px 18px', borderRadius: '999px', background: 'var(--accent-primary)', color: '#fff', border: 'none', fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '12px', cursor: 'pointer' }}>
                      {savingPayment === client.id ? 'Сохраняем...' : 'Сохранить'}
                    </button>
                  </div>
                )}

                {/* EXPANDED */}
                {isOpen && (
                  <>
                    {/* А2 — СТОИМОСТЬ В МЕСЯЦ */}
                    {payment && (
                      <>
                        <Divider />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <p style={{ fontFamily: 'var(--font-text)', fontWeight: 600, fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>Стоимость / месяц</p>
                          <button onClick={() => {
                            if (editingRate === client.id) { setEditingRate(null); return }
                            setEditingRate(client.id)
                            if (!monthlyRates[client.id]) setMonthlyRates(prev => ({ ...prev, [client.id]: String(payment.monthly_rate || payment.amount || '') }))
                            setPaymentForms(prev => ({ ...prev, [client.id]: { ...prev[client.id], period_start: payment.period_start?.slice(0, 10) || '', period_end: payment.period_end?.slice(0, 10) || '', amount: String(payment.monthly_rate || payment.amount || ''), paid: payment.paid ?? false } }))
                          }} style={{ background: 'none', border: 'none', fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '11px', color: 'var(--accent-primary)', cursor: 'pointer', padding: 0 }}>
                            {editingRate === client.id ? 'Отмена' : 'Изменить'}
                          </button>
                        </div>
                        {editingRate === client.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <input
                              type="number"
                              className="no-spin"
                              value={monthlyRates[client.id] || ''}
                              onChange={e => setMonthlyRates(prev => ({ ...prev, [client.id]: e.target.value }))}
                              placeholder="Сумма в €"
                              style={{ ...inputSm, borderRadius: 'var(--radius-sm)' }}
                            />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <div>
                                <p style={{ fontFamily: 'var(--font-text)', fontWeight: 600, fontSize: '9px', color: 'var(--text-tertiary)', margin: '0 0 4px', letterSpacing: '1px', textTransform: 'uppercase' }}>С</p>
                                <input type="date" value={paymentForms[client.id]?.period_start || ''} onChange={e => setPaymentForms(prev => ({ ...prev, [client.id]: { ...prev[client.id], period_start: e.target.value } }))} style={{ ...inputSm, borderRadius: 'var(--radius-sm)' }} />
                              </div>
                              <div>
                                <p style={{ fontFamily: 'var(--font-text)', fontWeight: 600, fontSize: '9px', color: 'var(--text-tertiary)', margin: '0 0 4px', letterSpacing: '1px', textTransform: 'uppercase' }}>До</p>
                                <input type="date" value={paymentForms[client.id]?.period_end || ''} onChange={e => setPaymentForms(prev => ({ ...prev, [client.id]: { ...prev[client.id], period_end: e.target.value } }))} style={{ ...inputSm, borderRadius: 'var(--radius-sm)' }} />
                              </div>
                            </div>
                            {(() => {
                              const total = calcTotal(monthlyRates[client.id] || '', paymentForms[client.id]?.period_start || '', paymentForms[client.id]?.period_end || '')
                              return total !== null ? (
                                <p style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '18px', color: 'var(--text-primary)', margin: '2px 0 0' }}>
                                  Итого: €{total.toLocaleString('ru-RU')}
                                </p>
                              ) : null
                            })()}
                            <button onClick={() => saveMonthlyRate(client.id, payment.id)} disabled={savingRate === client.id} className="pressable" style={{ padding: '7px 14px', borderRadius: '999px', background: 'var(--accent-primary)', color: '#fff', border: 'none', fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '12px', cursor: 'pointer' }}>
                              {savingRate === client.id ? '...' : 'Сохранить'}
                            </button>
                          </div>
                        ) : (
                          <p style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '22px', color: 'var(--text-primary)', margin: 0 }}>
                            {payment.monthly_rate || payment.amount ? `€${(payment.monthly_rate || payment.amount).toLocaleString('ru-RU')}` : '—'}
                          </p>
                        )}
                      </>
                    )}

                    {/* Б — КБЖУ */}
                    <Divider />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <p style={{ fontFamily: 'var(--font-text)', fontWeight: 600, fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>КБЖУ</p>
                      <button onClick={() => setEditingNutrition(isEditingNutrition ? null : client.id)} style={{ background: 'none', border: 'none', fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '11px', color: 'var(--accent-primary)', cursor: 'pointer', padding: 0 }}>
                        {isEditingNutrition ? 'Отмена' : 'Изменить КБЖУ'}
                      </button>
                    </div>

                    {isEditingNutrition ? (
                      <div style={{ background: 'var(--bg-card-soft)', border: '1px solid var(--divider)', borderRadius: '14px', padding: '14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                          {[
                            { key: 'calories', label: 'Калории' },
                            { key: 'protein', label: 'Белки (г)' },
                            { key: 'fat', label: 'Жиры (г)' },
                            { key: 'carbs', label: 'Углеводы (г)' },
                          ].map(({ key, label }) => (
                            <div key={key}>
                              <p style={{ fontFamily: 'var(--font-text)', fontWeight: 600, fontSize: '9px', color: 'var(--text-tertiary)', margin: '0 0 4px', letterSpacing: '1px', textTransform: 'uppercase' }}>{label}</p>
                              <input
                                type="number"
                                value={(nForm as any)[key]}
                                onChange={e => setNutritionForms(prev => ({ ...prev, [client.id]: { ...prev[client.id], [key]: e.target.value } }))}
                                className="no-spin"
                                style={inputSm}
                              />
                            </div>
                          ))}
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                          <p style={{ fontFamily: 'var(--font-text)', fontWeight: 600, fontSize: '9px', color: 'var(--text-tertiary)', margin: '0 0 4px', letterSpacing: '1px', textTransform: 'uppercase' }}>Заметка тренера</p>
                          <input
                            type="text"
                            value={nForm.notes}
                            onChange={e => setNutritionForms(prev => ({ ...prev, [client.id]: { ...prev[client.id], notes: e.target.value } }))}
                            placeholder="Рекомендация по питанию..."
                            style={inputSm}
                          />
                        </div>
                        <button onClick={() => saveNutrition(client.id)} disabled={savingNutrition === client.id} className="pressable" style={{ padding: '7px 18px', borderRadius: '999px', background: 'var(--accent-primary)', color: '#fff', border: 'none', fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '12px', cursor: 'pointer' }}>
                          {savingNutrition === client.id ? 'Сохраняем...' : 'Сохранить'}
                        </button>
                      </div>
                    ) : nutrition ? (
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'baseline' }}>
                        {[
                          { v: nutrition.calories, u: 'ккал' },
                          { v: nutrition.protein, u: 'б' },
                          { v: nutrition.fat, u: 'ж' },
                          { v: nutrition.carbs, u: 'у' },
                        ].filter(x => x.v).map(({ v, u }, i) => (
                          <div key={i} style={{ textAlign: 'center' }}>
                            <span style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '16px', color: 'var(--text-primary)' }}>{v}</span>
                            <span style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '10px', color: 'var(--text-tertiary)', marginLeft: '2px' }}>{u}</span>
                          </div>
                        ))}
                        {nutrition.notes && <span style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', marginLeft: '4px' }}>{nutrition.notes}</span>}
                      </div>
                    ) : (
                      <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, color: 'var(--text-tertiary)', fontSize: '12px', margin: 0 }}>Не задано</p>
                    )}

                    {/* В — ПОСЛЕДНЯЯ ТРЕНИРОВКА */}
                    <Divider />
                    <p style={{ fontFamily: 'var(--font-text)', fontWeight: 600, fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '0 0 10px' }}>Последняя тренировка</p>
                    {lastSessionLogs.length === 0 ? (
                      <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, color: 'var(--text-tertiary)', fontSize: '12px', margin: 0 }}>Тренировок ещё не было</p>
                    ) : (
                      <>
                        <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '10px', color: 'var(--text-tertiary)', margin: '0 0 8px' }}>{fmtDate(lastDate!)}</p>
                        {lastSessionLogs.map((l: any, i: number) => {
                          const parts: string[] = []
                          if (l.w1) parts.push(`П1: ${l.w1}кг`)
                          if (l.w2) parts.push(`П2: ${l.w2}кг`)
                          if (l.w3) parts.push(`П3: ${l.w3}кг`)
                          if (l.reps) parts.push(`${l.reps} повт`)
                          return (
                            <div key={i} style={{ marginBottom: l.notes ? '6px' : '4px' }}>
                              <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                                {EXERCISE_NAMES[l.exercise_id] || l.exercise_id}
                                {parts.length > 0 && <span style={{ color: 'var(--text-tertiary)' }}> — {parts.join(' · ')}</span>}
                              </p>
                              {l.notes && (
                                <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '10px', color: 'var(--text-tertiary)', fontStyle: 'italic', margin: '1px 0 0' }}>{l.notes}</p>
                              )}
                            </div>
                          )
                        })}
                      </>
                    )}

                    {/* Г — ОТЧЁТ */}
                    <Divider />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <p style={{ fontFamily: 'var(--font-text)', fontWeight: 600, fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>Отчёт недели</p>
                      {!latestReport && (
                        <button
                          onClick={() => {
                            const today = new Date().toISOString().slice(0, 10)
                            if (!starterForms[client.id]) setStarterForms(prev => ({ ...prev, [client.id]: { date: today, weight: '', chest: '', waist: '', waist_navel: '', hips: '', left_thigh: '', right_thigh: '', left_arm: '', right_arm: '', notes: '' } }))
                            setAddingStarterReport(addingStarterReport === client.id ? null : client.id)
                          }}
                          style={{ background: 'none', border: 'none', fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '11px', color: 'var(--accent-primary)', cursor: 'pointer', padding: 0 }}
                        >
                          {addingStarterReport === client.id ? 'Отмена' : '+ Стартовый отчёт'}
                        </button>
                      )}
                    </div>
                    {!latestReport && addingStarterReport === client.id && (
                      <div style={{ background: 'var(--bg-card-soft)', border: '1px solid var(--divider)', borderRadius: '14px', padding: '14px', marginBottom: '10px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ marginBottom: '8px' }}>
                          <p style={{ fontFamily: 'var(--font-text)', fontWeight: 600, fontSize: '9px', color: 'var(--text-tertiary)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Дата</p>
                          <input type="date" value={starterForms[client.id]?.date || ''} onChange={e => setStarterForms(prev => ({ ...prev, [client.id]: { ...prev[client.id], date: e.target.value } }))} style={{ ...inputSm }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                          {[
                            { key: 'weight', label: 'Вес (кг)' },
                            { key: 'chest', label: 'Грудь (см)' },
                            { key: 'waist', label: 'Талия (см)' },
                            { key: 'waist_navel', label: 'Пупок (см)' },
                            { key: 'hips', label: 'Бёдра (см)' },
                            { key: 'left_thigh', label: 'Бедро Л (см)' },
                            { key: 'right_thigh', label: 'Бедро П (см)' },
                            { key: 'left_arm', label: 'Рука Л (см)' },
                            { key: 'right_arm', label: 'Рука П (см)' },
                          ].map(({ key, label }) => (
                            <div key={key}>
                              <p style={{ fontFamily: 'var(--font-text)', fontWeight: 600, fontSize: '9px', color: 'var(--text-tertiary)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</p>
                              <input
                                type="number"
                                className="no-spin"
                                placeholder="—"
                                value={(starterForms[client.id] as any)?.[key] || ''}
                                onChange={e => setStarterForms(prev => ({ ...prev, [client.id]: { ...prev[client.id], [key]: e.target.value } }))}
                                style={inputSm}
                              />
                            </div>
                          ))}
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                          <p style={{ fontFamily: 'var(--font-text)', fontWeight: 600, fontSize: '9px', color: 'var(--text-tertiary)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Заметки</p>
                          <textarea
                            value={starterForms[client.id]?.notes || ''}
                            onChange={e => setStarterForms(prev => ({ ...prev, [client.id]: { ...prev[client.id], notes: e.target.value } }))}
                            placeholder="Стартовые показатели..."
                            rows={2}
                            style={{ ...inputSm, borderRadius: 'var(--radius-sm)', resize: 'none', lineHeight: 1.5 }}
                          />
                        </div>
                        <button
                          onClick={() => saveStarterReport(client.id)}
                          disabled={savingStarterReport === client.id}
                          className="pressable"
                          style={{ padding: '7px 18px', borderRadius: '999px', background: 'var(--accent-primary)', color: '#fff', border: 'none', fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '12px', cursor: 'pointer' }}
                        >
                          {savingStarterReport === client.id ? 'Сохраняем...' : 'Сохранить отчёт'}
                        </button>
                      </div>
                    )}
                    {!latestReport && addingStarterReport !== client.id ? (
                      <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, color: 'var(--text-tertiary)', fontSize: '12px', margin: 0 }}>Отчёт ещё не отправлен</p>
                    ) : latestReport ? (() => {
                      // Spark line from reports
                      const sparkWeights = client.reports.filter((r: any) => r.weight != null).map((r: any) => r.weight as number).reverse()
                      let sparkSvg = null
                      if (sparkWeights.length >= 2) {
                        const W = 80, H = 30, PAD = 3
                        const minW = Math.min(...sparkWeights)
                        const maxW = Math.max(...sparkWeights)
                        const range = maxW - minW || 1
                        const pts = sparkWeights.map((w, i) => ({
                          x: PAD + (i / (sparkWeights.length - 1)) * (W - PAD * 2),
                          y: H - PAD - ((w - minW) / range) * (H - PAD * 2),
                        }))
                        sparkSvg = pts.map(p => `${p.x},${p.y}`).join(' ')
                      }
                      return (
                        <>
                          {/* Date + weight + sparkline row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '10px', color: 'var(--text-tertiary)', margin: '0 0 2px' }}>{fmtDate(latestReport.week_start)}</p>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                {latestReport.weight != null && (
                                  <span className="number-mount" style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '22px', color: 'var(--text-primary)', lineHeight: 1 }}>{latestReport.weight} кг</span>
                                )}
                                {weightDiff !== null && (
                                  <span style={{ fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '11px', color: weightDiff <= 0 ? 'var(--success)' : 'var(--error)' }}>
                                    {weightDiff <= 0 ? `↓${Math.abs(weightDiff)}` : `↑${weightDiff}`}
                                  </span>
                                )}
                              </div>
                            </div>
                            {sparkSvg && (
                              <svg width="80" height="30" viewBox="0 0 80 30" style={{ flexShrink: 0 }}>
                                <polyline points={sparkSvg} fill="none" stroke="#8B1E3F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
                              </svg>
                            )}
                          </div>
                          {/* Params inline */}
                          <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '10px', color: 'var(--text-secondary)', margin: '0 0 8px', lineHeight: 1.8 }}>
                            {[
                              latestReport.chest != null && `Гр: ${latestReport.chest}`,
                              latestReport.waist != null && `Тал: ${latestReport.waist}`,
                              latestReport.hips != null && `Бёд: ${latestReport.hips}`,
                              latestReport.waist_navel != null && `Пуп: ${latestReport.waist_navel}`,
                              (latestReport.left_thigh ?? latestReport.one_thigh) != null && `Бедро Л: ${latestReport.left_thigh ?? latestReport.one_thigh}`,
                              (latestReport.right_thigh) != null && `Бедро П: ${latestReport.right_thigh}`,
                              (latestReport.left_arm ?? latestReport.arm) != null && `Рука Л: ${latestReport.left_arm ?? latestReport.arm}`,
                              (latestReport.right_arm) != null && `Рука П: ${latestReport.right_arm}`,
                            ].filter(Boolean).join(' · ')}
                          </p>
                          {/* Photos */}
                          <div style={{ display: 'flex', gap: '6px', marginBottom: latestReport.notes ? '8px' : 0 }}>
                            {(['photo_front_url', 'photo_side_url', 'photo_back_url'] as const).map((key, i) => (
                              latestReport[key] ? (
                                <img key={i} src={latestReport[key]} alt="" style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--divider)' }} />
                              ) : null
                            ))}
                          </div>
                          {latestReport.notes && (
                            <p style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, color: 'var(--text-secondary)', fontSize: '11px', fontStyle: 'italic', margin: 0 }}>
                              "{latestReport.notes}"
                            </p>
                          )}
                          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                            <button
                              onClick={e => { e.stopPropagation(); setViewingReport({ client: client.name, report: latestReport }) }}
                              className="pressable"
                              style={{ padding: '7px 16px', borderRadius: '999px', background: 'var(--accent-soft-bg)', border: '1px solid rgba(139,30,63,0.2)', color: 'var(--accent-primary)', fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '12px', cursor: 'pointer' }}
                            >
                              Открыть полный отчёт
                            </button>
                            {client.reports && client.reports.length > 1 && (
                              <button
                                onClick={e => { e.stopPropagation(); setViewingReportHistory({ client: client.name, reports: client.reports }) }}
                                className="pressable"
                                style={{ padding: '7px 16px', borderRadius: '999px', background: 'var(--bg-card-soft)', border: '1px solid var(--divider)', color: 'var(--text-secondary)', fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '12px', cursor: 'pointer' }}
                              >
                                Все отчёты ({client.reports.length})
                              </button>
                            )}
                          </div>
                        </>
                      )
                    })() : null}

                    {/* Д — НАСТРОЕНИЕ */}
                    {mood && (
                      <>
                        <Divider />
                        <p style={{ fontFamily: 'var(--font-text)', fontWeight: 600, fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '0 0 8px' }}>Самочувствие</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '24px' }}>{MOOD_EMOJIS[mood.mood] || '😐'}</span>
                          <span style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '12px', color: 'var(--text-secondary)' }}>Энергия: {mood.energy}/10 · Мышцы: {mood.muscle_pain}/10</span>
                        </div>
                      </>
                    )}

                    {/* Е — НАЗНАЧЕННАЯ ТРЕНИРОВКА */}
                    <Divider />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <p style={{ fontFamily: 'var(--font-text)', fontWeight: 600, fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>Тренировка</p>
                      <button onClick={() => setAssigningWorkout(isAssigningWorkout ? null : client.id)} style={{ background: 'none', border: 'none', fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '11px', color: 'var(--accent-primary)', cursor: 'pointer', padding: 0 }}>
                        {isAssigningWorkout ? 'Отмена' : 'Сменить'}
                      </button>
                    </div>

                    {isAssigningWorkout ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {workoutsList.length === 0 ? (
                          <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>Нет созданных тренировок</p>
                        ) : (
                          workoutsList.map(w => (
                            <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                onClick={() => assignWorkout(client.id, w.id)}
                                disabled={savingWorkout === client.id}
                                className="pressable"
                                style={{
                                  flex: 1, padding: '9px 14px', borderRadius: 'var(--radius-md)', textAlign: 'left',
                                  background: assignedWorkout?.id === w.id ? 'var(--accent-soft-bg)' : 'var(--bg-card-soft)',
                                  border: assignedWorkout?.id === w.id ? '1px solid rgba(139,30,63,0.2)' : '1px solid var(--divider)',
                                  cursor: 'pointer',
                                }}
                              >
                                <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '13px', color: 'var(--text-primary)', margin: 0 }}>{w.title}</p>
                                {w.subtitle && <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '11px', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>{w.subtitle}</p>}
                              </button>
                              <button
                                onClick={() => deleteWorkout(w.id)}
                                style={{ background: 'none', border: 'none', color: 'var(--error)', fontSize: '14px', cursor: 'pointer', padding: '6px', flexShrink: 0, opacity: 0.5 }}
                              >
                                ✕
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    ) : assignedWorkout ? (
                      <div style={{ background: 'var(--accent-soft-bg)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                        <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '13px', color: 'var(--text-primary)', margin: 0 }}>{assignedWorkout.title}</p>
                        {assignedWorkout.subtitle && <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '11px', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>{assignedWorkout.subtitle}</p>}
                      </div>
                    ) : (
                      <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, color: 'var(--text-tertiary)', fontSize: '12px', margin: 0 }}>Не назначено</p>
                    )}

                    {/* Ж — ПРОГРАММА */}
                    <Divider />
                    {(() => {
                      const prog = programsList.find((p: any) => Array.isArray(p.assigned_to) && p.assigned_to.includes(client.id))
                      return (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <p style={{ fontFamily: 'var(--font-text)', fontWeight: 600, fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>Программа</p>
                            {prog && <button onClick={() => router.push(`/coach/programs/edit/${prog.id}`)} style={{ background: 'none', border: 'none', fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '11px', color: 'var(--accent-primary)', cursor: 'pointer', padding: 0 }}>Изменить</button>}
                          </div>
                          {prog ? (
                            <div style={{ background: 'var(--accent-soft-bg)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                              <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '13px', color: 'var(--text-primary)', margin: '0 0 4px' }}>{prog.title}</p>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {prog.start_date && <span style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '10px', color: 'var(--text-tertiary)' }}>Старт: {new Date(prog.start_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</span>}
                                {prog.end_date && <span style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '10px', color: 'var(--text-tertiary)' }}>До: {new Date(prog.end_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</span>}
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, color: 'var(--text-tertiary)', fontSize: '12px', margin: 0 }}>Программа не назначена</p>
                              <button onClick={() => router.push('/coach/programs/new')} style={{ background: 'none', border: 'none', fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '11px', color: 'var(--accent-primary)', cursor: 'pointer', padding: 0 }}>+ Создать</button>
                            </div>
                          )}
                        </>
                      )
                    })()}

                    {/* Удаление клиента */}
                    <div style={{ marginTop: '16px', textAlign: 'center' }}>
                      <button
                        onClick={() => deleteClient(client.id, client.name)}
                        style={{ background: 'none', border: 'none', color: 'var(--error)', fontSize: '12px', fontFamily: 'var(--font-text)', cursor: 'pointer', padding: 0, opacity: 0.5 }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
                      >
                        Удалить клиента
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })}

        </div>
      </div>

      {/* REPORT MODAL */}
      {viewingReport && (
        <div
          onClick={() => setViewingReport(null)}
          style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '480px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '24px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}
          >
            {/* Close */}
            <button
              onClick={() => setViewingReport(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'var(--bg-card-soft)', border: '1px solid var(--divider)', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: 'var(--text-secondary)' }}
            >
              ✕
            </button>

            {/* Header */}
            <h2 style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '22px', color: 'var(--text-primary)', margin: '0 0 4px' }}>{viewingReport.client}</h2>
            <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '12px', color: 'var(--text-tertiary)', margin: '0 0 20px' }}>
              {viewingReport.report.week_start ? new Date(viewingReport.report.week_start).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
            </p>

            {/* Photos */}
            {(viewingReport.report.photo_front_url || viewingReport.report.photo_side_url || viewingReport.report.photo_back_url) && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                {[
                  { url: viewingReport.report.photo_front_url, label: 'Спереди' },
                  { url: viewingReport.report.photo_side_url, label: 'Сбоку' },
                  { url: viewingReport.report.photo_back_url, label: 'Сзади' },
                ].map(({ url, label }) => url ? (
                  <div key={label} style={{ flex: 1 }}>
                    <img
                      src={url}
                      alt={label}
                      style={{ width: '100%', height: '130px', objectFit: 'cover', borderRadius: 'var(--radius-md)', display: 'block' }}
                    />
                    <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '10px', color: 'var(--text-tertiary)', textAlign: 'center', margin: '4px 0 0' }}>{label}</p>
                  </div>
                ) : null)}
              </div>
            )}

            {/* Weight */}
            {viewingReport.report.weight && (
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <p className="number-mount" style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '40px', color: 'var(--text-primary)', margin: '0 0 2px', lineHeight: 1 }}>{viewingReport.report.weight}</p>
                <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '11px', color: 'var(--text-tertiary)', margin: 0, textTransform: 'uppercase', letterSpacing: '1.5px' }}>кг</p>
              </div>
            )}

            {/* Params grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              {[
                { key: 'chest', label: 'Грудь' },
                { key: 'waist', label: 'Талия' },
                { key: 'waist_navel', label: 'Пупок' },
                { key: 'hips', label: 'Бёдра' },
                { key: 'left_thigh', label: 'Бедро Л' },
                { key: 'right_thigh', label: 'Бедро П' },
                { key: 'left_arm', label: 'Рука Л' },
                { key: 'right_arm', label: 'Рука П' },
              ].filter(({ key }) => (viewingReport.report[key] ?? viewingReport.report[key === 'left_thigh' || key === 'right_thigh' ? 'one_thigh' : key === 'left_arm' || key === 'right_arm' ? 'arm' : key]) != null).map(({ key, label }) => (
                <div key={key} style={{ background: 'var(--bg-card-soft)', borderRadius: 'var(--radius-md)', padding: '12px', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '22px', color: 'var(--text-primary)', margin: '0 0 2px', lineHeight: 1 }}>{viewingReport.report[key] ?? viewingReport.report[key === 'left_thigh' || key === 'right_thigh' ? 'one_thigh' : 'arm']}</p>
                  <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '10px', color: 'var(--text-tertiary)', margin: 0 }}>{label} см</p>
                </div>
              ))}
            </div>

            {/* Notes */}
            {viewingReport.report.notes && (
              <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0, lineHeight: 1.6 }}>«{viewingReport.report.notes}»</p>
            )}
          </div>
        </div>
      )}

      {/* REPORT HISTORY MODAL */}
      {viewingReportHistory && (
        <div
          onClick={() => setViewingReportHistory(null)}
          style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '28px 24px', width: '100%', maxWidth: '480px', marginTop: '40px', position: 'relative' }}
          >
            <button onClick={() => setViewingReportHistory(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'var(--bg-card-soft)', border: '1px solid var(--divider)', borderRadius: '50%', width: '32px', height: '32px', fontSize: '16px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>✕</button>
            <h2 style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '22px', color: 'var(--text-primary)', margin: '0 0 4px' }}>{viewingReportHistory.client}</h2>
            <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '12px', color: 'var(--text-tertiary)', margin: '0 0 20px', letterSpacing: '1px', textTransform: 'uppercase' }}>Все отчёты · {viewingReportHistory.reports.length}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[...viewingReportHistory.reports].sort((a, b) => new Date(b.week_start || b.created_at || 0).getTime() - new Date(a.week_start || a.created_at || 0).getTime()).map((r, i, arr) => {
                const next = arr[i + 1]
                const diff = r.weight != null && next?.weight != null ? +(r.weight - next.weight).toFixed(1) : null
                return (
                  <div key={r.id || i} style={{ background: 'var(--bg-card-soft)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                      <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '11px', color: 'var(--text-tertiary)', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {r.week_start ? new Date(r.week_start).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                      </p>
                      {r.weight != null && (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                          <span style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '20px', color: 'var(--text-primary)' }}>{r.weight} кг</span>
                          {diff !== null && (
                            <span style={{ fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '11px', color: diff <= 0 ? 'var(--success)' : 'var(--error)' }}>
                              {diff <= 0 ? `↓${Math.abs(diff)}` : `↑${diff}`}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {(r.photo_front_url || r.photo_side_url || r.photo_back_url) && (
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                        {[r.photo_front_url, r.photo_side_url, r.photo_back_url].filter(Boolean).map((url, j) => (
                          <img key={j} src={url} alt="" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--divider)' }} />
                        ))}
                      </div>
                    )}
                    {r.notes && (
                      <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>«{r.notes}»</p>
                    )}
                    <button
                      onClick={() => { setViewingReportHistory(null); setViewingReport({ client: viewingReportHistory.client, report: r }) }}
                      className="pressable"
                      style={{ marginTop: '8px', padding: '5px 14px', borderRadius: '999px', background: 'var(--accent-soft-bg)', border: '1px solid rgba(139,30,63,0.18)', color: 'var(--accent-primary)', fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '11px', cursor: 'pointer' }}
                    >
                      Открыть
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
