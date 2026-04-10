'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.55)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.7)',
  borderRadius: '20px',
  padding: '22px',
  marginBottom: '12px',
}

const inputSm: React.CSSProperties = {
  background: 'rgba(0,0,0,0.05)',
  border: 'none',
  borderRadius: '10px',
  padding: '7px 10px',
  fontFamily: 'Chillax, sans-serif',
  fontWeight: 300,
  fontSize: '13px',
  color: '#2d1f0e',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const EXERCISE_NAMES: Record<string, string> = {
  'foam': 'Миофасциальный релиз', 'ankle': 'Вращения голеностопа',
  'glute-bridge': 'Ягодичный мост', 'bird-dog': 'Bird Dog',
  'wall-squat': 'Присед у стены', 'box-squat': 'Присед на тумбу',
  'rdl': 'Румынская тяга', 'db-press': 'Жим гантелей лёжа',
  'lat-pulldown': 'Тяга верхнего блока', 'cable-row': 'Тяга горизонтального блока',
  'abductor': 'Разведение ног', 'dead-bug': 'Dead Bug',
}

const MOOD_EMOJIS = ['', '😔', '😕', '😐', '🙂', '😄']

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

function ArtName({ name }: { name: string }) {
  if (!name) return null
  const split = Math.max(1, name.length - 2)
  return (
    <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontStyle: 'italic', fontSize: '38px', lineHeight: 1.05, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
      <span style={{ color: '#2d1f0e' }}>{name.slice(0, split)}</span>
      <span style={{ color: '#7a4a20' }}>{name.slice(split)}</span>
      <span style={{ color: '#7a4a20' }}>.</span>
    </h1>
  )
}

function Divider() {
  return <div style={{ borderTop: '1px solid rgba(45,31,14,0.07)', margin: '16px 0' }} />
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function fmtPeriod(start: string, end: string) {
  return `${new Date(start).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} — ${new Date(end).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`
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
  const [starterForms, setStarterForms] = useState<Record<string, { date: string; weight: string; chest: string; waist: string; waist_navel: string; hips: string; one_thigh: string; arm: string; notes: string }>>({})
  const [savingStarterReport, setSavingStarterReport] = useState<string | null>(null)
  // Invite client
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const router = useRouter()
  const [swapRequests, setSwapRequests] = useState<any[]>([])
  const [swapRequestCount, setSwapRequestCount] = useState(0)
  const [viewingReport, setViewingReport] = useState<{ client: string; report: any } | null>(null)
  const [viewingReportHistory, setViewingReportHistory] = useState<{ client: string; reports: any[] } | null>(null)
  const [approvingSwap, setApprovingSwap] = useState<string | null>(null)
  const [swapWorkoutSelected, setSwapWorkoutSelected] = useState<Record<string, string>>({})

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

  async function markPaid(clientId: string, paymentId: string) {
    setUpdatingPayment(clientId)
    const supabase = createClient()
    await supabase.from('payments').update({ paid: true }).eq('id', paymentId)
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, payment: { ...c.payment, paid: true } } : c))
    setPayments(prev => ({ ...prev, paid: prev.paid + 1 }))
    setUpdatingPayment(null)
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
    if (!inviteName.trim() || !inviteEmail.trim()) return
    setInviteSending(true)
    setInviteError('')
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim(), name: inviteName.trim() }),
    })
    const data = await res.json()
    if (data.success) {
      setInviteSuccess(true)
      setTimeout(() => {
        setShowInviteForm(false)
        setInviteSuccess(false)
        window.location.reload()
      }, 2000)
    } else {
      setInviteError(data.error || 'Ошибка при отправке')
      setInviteSending(false)
    }
  }

  async function addPayment(clientId: string) {
    const form = paymentForms[clientId]
    if (!form?.period_start || !form?.period_end) return
    setSavingPayment(clientId)
    const supabase = createClient()
    const { data } = await supabase.from('payments').insert({
      player_id: clientId,
      period_start: form.period_start,
      period_end: form.period_end,
      amount: form.amount ? parseFloat(form.amount) : null,
      paid: form.paid,
    }).select().single()
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, payment: data || null } : c))
    if (data?.paid) setPayments(prev => ({ ...prev, paid: prev.paid + 1 }))
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
      one_thigh: form.one_thigh ? parseFloat(form.one_thigh) : null,
      arm: form.arm ? parseFloat(form.arm) : null,
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
          <div style={{ height: '40px', background: 'rgba(255,255,255,0.5)', borderRadius: '12px', width: '50%', marginBottom: '8px', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ height: '10px', background: 'rgba(255,255,255,0.4)', borderRadius: '5px', width: '30%', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.45)', borderRadius: '16px', padding: '16px 10px', animation: 'pulse 1.5s ease-in-out infinite' }}>
              <div style={{ height: '28px', background: 'rgba(0,0,0,0.06)', borderRadius: '6px', marginBottom: '6px' }} />
              <div style={{ height: '8px', background: 'rgba(0,0,0,0.04)', borderRadius: '4px' }} />
            </div>
          ))}
        </div>
        {[1, 2].map(i => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.45)', borderRadius: '20px', padding: '22px', marginBottom: '12px', animation: 'pulse 1.5s ease-in-out infinite' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(0,0,0,0.06)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: '16px', background: 'rgba(0,0,0,0.06)', borderRadius: '6px', width: '55%', marginBottom: '6px' }} />
                <div style={{ height: '10px', background: 'rgba(0,0,0,0.04)', borderRadius: '4px', width: '35%' }} />
              </div>
            </div>
          </div>
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
      <div style={{ position: 'relative', zIndex: 1, padding: '28px 20px 60px' }}>
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>

          {/* HEADER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
            <div>
              <ArtName name={coachName} />
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.35)', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', margin: 0 }}>
                Тренерский дашборд
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
              <button onClick={() => window.location.reload()} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(45,31,14,0.35)', fontSize: '18px', padding: '6px 8px', lineHeight: 1,
              }}>↻</button>
              <button onClick={handleLogout} style={{
                background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.7)', borderRadius: '999px',
                color: 'rgba(45,31,14,0.5)', fontFamily: 'Chillax, sans-serif',
                fontWeight: 300, fontSize: '13px', padding: '8px 18px', cursor: 'pointer',
              }}>
                Выйти
              </button>
            </div>
          </div>

          {/* STATS — 4 cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            {[
              { value: clients.length, label: 'Клиентов' },
              { value: totalLogs, label: 'Тренировок' },
              { value: totalReports, label: 'Отчётов' },
            ].map(({ value, label }) => (
              <div key={label} style={{ ...glass, marginBottom: 0, borderRadius: '16px', padding: '16px 10px', textAlign: 'center' }}>
                <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 300, fontSize: '26px', color: '#2d1f0e', margin: '0 0 4px', lineHeight: 1 }}>{value}</p>
                <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.35)', margin: 0 }}>{label}</p>
              </div>
            ))}
            <div style={{ ...glass, marginBottom: 0, borderRadius: '16px', padding: '16px 10px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 300, fontSize: '26px', color: allPaid ? '#1a7a3c' : '#8a2520', margin: '0 0 4px', lineHeight: 1 }}>
                {payments.paid}/{payments.total}
              </p>
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.35)', margin: 0 }}>Оплат</p>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <button
              onClick={() => router.push('/coach/workout/new')}
              style={{
                position: 'relative', overflow: 'hidden', borderRadius: '999px',
                padding: '10px 18px', border: 'none', cursor: 'pointer',
                fontFamily: 'Chillax, sans-serif', fontSize: '13px', fontWeight: 500, color: '#fff',
                background: 'transparent',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(122,74,32,0.85)', borderRadius: '999px' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 60%)', borderRadius: '999px' }} />
              <span style={{ position: 'relative' }}>+ Создать тренировку</span>
            </button>
            <button
              onClick={() => router.push('/coach/workouts')}
              style={{ padding: '10px 18px', borderRadius: '999px', background: 'rgba(122,74,32,0.08)', border: '1px solid rgba(122,74,32,0.2)', color: '#7a4a20', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', cursor: 'pointer' }}
            >
              Все тренировки ({workoutsList.length})
            </button>
            <button
              onClick={() => router.push('/coach/programs/new')}
              style={{ padding: '10px 18px', borderRadius: '999px', background: 'rgba(122,74,32,0.08)', border: '1px solid rgba(122,74,32,0.2)', color: '#7a4a20', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', cursor: 'pointer' }}
            >
              + Программа
            </button>
            <button
              onClick={() => { setShowInviteForm(v => !v); setInviteSuccess(false); setInviteError('') }}
              style={{
                position: 'relative', overflow: 'hidden', borderRadius: '999px',
                padding: '10px 20px', border: '1px solid rgba(122,74,32,0.3)', cursor: 'pointer',
                fontFamily: 'Chillax, sans-serif', fontSize: '13px', fontWeight: 500, color: '#7a4a20',
                background: 'rgba(122,74,32,0.4)',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 60%)', borderRadius: '999px' }} />
              <span style={{ position: 'relative' }}>+ Добавить клиента</span>
            </button>
          </div>

          {/* INVITE FORM */}
          {showInviteForm && (
            <div style={{
              ...glass,
              marginBottom: '16px',
            }}>
              <h3 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '18px', color: '#2d1f0e', margin: '0 0 16px' }}>
                Новый клиент
              </h3>
              {inviteSuccess ? (
                <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '14px', color: '#1a7a3c', margin: 0, textAlign: 'center', padding: '8px 0' }}>
                  Приглашение отправлено на {inviteEmail}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Имя"
                    value={inviteName}
                    onChange={e => setInviteName(e.target.value)}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.6)',
                      border: '1px solid rgba(0,0,0,0.08)',
                      borderRadius: '999px', padding: '12px 18px',
                      fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '14px',
                      color: '#2d1f0e', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.6)',
                      border: '1px solid rgba(0,0,0,0.08)',
                      borderRadius: '999px', padding: '12px 18px',
                      fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '14px',
                      color: '#2d1f0e', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                  {inviteError && (
                    <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: '#8a2520', margin: 0 }}>{inviteError}</p>
                  )}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={sendInvite}
                      disabled={inviteSending || !inviteName.trim() || !inviteEmail.trim()}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '999px',
                        background: '#7a4a20', color: '#fff', border: 'none',
                        fontFamily: 'Chillax, sans-serif', fontWeight: 500, fontSize: '14px',
                        cursor: inviteSending || !inviteName.trim() || !inviteEmail.trim() ? 'not-allowed' : 'pointer',
                        opacity: inviteSending || !inviteName.trim() || !inviteEmail.trim() ? 0.5 : 1,
                      }}
                    >
                      {inviteSending ? 'Отправляем...' : 'Отправить приглашение'}
                    </button>
                    <button
                      onClick={() => { setShowInviteForm(false); setInviteError('') }}
                      style={{
                        padding: '12px 18px', borderRadius: '999px',
                        background: 'rgba(0,0,0,0.05)', color: 'rgba(45,31,14,0.5)', border: 'none',
                        fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '14px',
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
            <div style={{ ...glass, marginBottom: '16px', borderLeft: '3px solid rgba(122,74,32,0.4)' }}>
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.35)', margin: '0 0 12px' }}>
                Запросы на замену тренировки · {swapRequests.length}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {swapRequests.map(req => (
                  <div key={req.id} style={{ background: 'rgba(122,74,32,0.05)', borderRadius: '12px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '14px', color: '#2d1f0e', margin: '0 0 2px' }}>{req.player_name}</p>
                        <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: 'rgba(45,31,14,0.5)', margin: '0 0 4px' }}>Тренировка: {req.current_workout_title}</p>
                        {req.reason && <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.65)', margin: '0', fontStyle: 'italic' }}>«{req.reason}»</p>}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button
                          onClick={() => setApprovingSwap(approvingSwap === req.id ? null : req.id)}
                          style={{ padding: '4px 12px', borderRadius: '999px', background: 'rgba(26,122,60,0.1)', border: '1px solid rgba(26,122,60,0.25)', color: '#1a7a3c', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', cursor: 'pointer' }}
                        >
                          ✓ Одобрить
                        </button>
                        <button
                          onClick={() => resolveSwap(req.id, 'declined')}
                          style={{ padding: '4px 12px', borderRadius: '999px', background: 'rgba(138,37,32,0.08)', border: '1px solid rgba(138,37,32,0.2)', color: '#8a2520', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', cursor: 'pointer' }}
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
                          style={{ flex: 1, background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '10px', padding: '8px 12px', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', color: '#2d1f0e', outline: 'none' }}
                        >
                          <option value="">— выбери тренировку —</option>
                          {workoutsList.map(w => (
                            <option key={w.id} value={w.id}>{w.title}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => approveWithWorkout(req)}
                          disabled={!swapWorkoutSelected[req.id]}
                          style={{ padding: '8px 16px', borderRadius: '999px', background: swapWorkoutSelected[req.id] ? '#1a7a3c' : 'rgba(26,122,60,0.3)', color: '#fff', border: 'none', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', cursor: swapWorkoutSelected[req.id] ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}
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
          <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.35)', margin: '0 0 12px' }}>
            Клиенты
          </p>

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
              <div key={client.id} style={glass}>
                {/* A — HEADER */}
                <div onClick={() => setOpenClient(isOpen ? null : client.id)} style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0, background: 'rgba(122,74,32,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '17px', color: '#7a4a20' }}>
                    {client.name[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '2px' }}>
                      <h3 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, color: '#2d1f0e', fontSize: '17px', margin: 0 }}>{client.name}</h3>
                      {assignedWorkout && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center',
                          background: 'rgba(122,74,32,0.1)', border: '1px solid rgba(122,74,32,0.2)',
                          borderRadius: '999px', padding: '2px 10px',
                          fontSize: '10px', color: '#7a4a20',
                          fontFamily: 'Chillax, sans-serif', fontWeight: 300, flexShrink: 0,
                        }}>
                          {assignedWorkout.title}
                        </span>
                      )}
                    </div>
                    <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', margin: 0, color: inactive ? '#8a2520' : 'rgba(45,31,14,0.4)' }}>
                      {client.lastSeen ? (inactive ? `Не заходила ${daysOff} дн.` : `Активна ${fmtDate(client.lastSeen)}`) : 'Ещё нет записей'}
                    </p>
                  </div>
                  <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    {payment ? (
                      <>
                        <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', padding: '3px 9px', borderRadius: '999px', background: payment.paid ? 'rgba(39,174,96,0.1)' : 'rgba(192,57,43,0.08)', border: payment.paid ? '1px solid rgba(39,174,96,0.2)' : '1px solid rgba(192,57,43,0.15)', color: payment.paid ? '#1a7a3c' : '#8a2520', whiteSpace: 'nowrap' }}>
                          {payment.paid ? 'Оплачено' : 'Не оплачено'}
                        </span>
                        {payment.period_start && (
                          <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', color: 'rgba(45,31,14,0.3)', whiteSpace: 'nowrap' }}>{fmtPeriod(payment.period_start, payment.period_end)}</span>
                        )}
                      </>
                    ) : (
                      <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: 'rgba(45,31,14,0.3)' }}>—</span>
                    )}
                    <span style={{ color: 'rgba(45,31,14,0.25)', fontSize: '12px' }}>{isOpen ? '▴' : '▾'}</span>
                  </div>
                </div>

                {/* Mark paid + Add payment */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                  {payment && !payment.paid && (
                    <button onClick={e => { e.stopPropagation(); markPaid(client.id, payment.id) }} disabled={updatingPayment === client.id} style={{ padding: '5px 14px', borderRadius: '999px', background: 'rgba(39,174,96,0.12)', border: '1px solid rgba(39,174,96,0.25)', color: '#1a7a3c', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', cursor: 'pointer' }}>
                      ✓ Отметить
                    </button>
                  )}
                  {!payment && (
                    <button onClick={e => { e.stopPropagation(); setAddingPayment(addingPayment === client.id ? null : client.id); if (!paymentForms[client.id]) setPaymentForms(prev => ({ ...prev, [client.id]: { period_start: '', period_end: '', amount: '', paid: false } })) }} style={{ padding: '5px 14px', borderRadius: '999px', background: 'rgba(122,74,32,0.08)', border: '1px solid rgba(122,74,32,0.2)', color: '#7a4a20', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', cursor: 'pointer' }}>
                      + Добавить оплату
                    </button>
                  )}
                </div>

                {/* Payment form */}
                {addingPayment === client.id && (
                  <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: '14px', padding: '14px', marginTop: '10px' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      <div>
                        <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', color: 'rgba(45,31,14,0.4)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Начало периода</p>
                        <input type="date" value={paymentForms[client.id]?.period_start || ''} onChange={e => setPaymentForms(prev => ({ ...prev, [client.id]: { ...prev[client.id], period_start: e.target.value } }))} style={{ ...inputSm, borderRadius: '10px' }} />
                      </div>
                      <div>
                        <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', color: 'rgba(45,31,14,0.4)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Конец периода</p>
                        <input type="date" value={paymentForms[client.id]?.period_end || ''} onChange={e => setPaymentForms(prev => ({ ...prev, [client.id]: { ...prev[client.id], period_end: e.target.value } }))} style={{ ...inputSm, borderRadius: '10px' }} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                      <div>
                        <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', color: 'rgba(45,31,14,0.4)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Сумма €</p>
                        <input type="number" placeholder="5000" value={paymentForms[client.id]?.amount || ''} onChange={e => setPaymentForms(prev => ({ ...prev, [client.id]: { ...prev[client.id], amount: e.target.value } }))} className="no-spin" style={{ ...inputSm, borderRadius: '10px' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '18px' }}>
                        <input type="checkbox" id={`paid-${client.id}`} checked={paymentForms[client.id]?.paid || false} onChange={e => setPaymentForms(prev => ({ ...prev, [client.id]: { ...prev[client.id], paid: e.target.checked } }))} style={{ accentColor: '#7a4a20', width: '16px', height: '16px' }} />
                        <label htmlFor={`paid-${client.id}`} style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.6)', cursor: 'pointer' }}>Оплачено</label>
                      </div>
                    </div>
                    <button onClick={() => addPayment(client.id)} disabled={savingPayment === client.id} style={{ padding: '7px 18px', borderRadius: '999px', background: '#7a4a20', color: '#fff', border: 'none', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', cursor: 'pointer' }}>
                      {savingPayment === client.id ? 'Сохраняем...' : 'Сохранить'}
                    </button>
                  </div>
                )}

                {/* EXPANDED */}
                {isOpen && (
                  <>
                    {/* Б — КБЖУ */}
                    <Divider />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.35)', margin: 0 }}>КБЖУ</p>
                      <button onClick={() => setEditingNutrition(isEditingNutrition ? null : client.id)} style={{ background: 'none', border: 'none', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: '#7a4a20', cursor: 'pointer', padding: 0 }}>
                        {isEditingNutrition ? 'Отмена' : 'Изменить КБЖУ'}
                      </button>
                    </div>

                    {isEditingNutrition ? (
                      <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: '14px', padding: '14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                          {[
                            { key: 'calories', label: 'Калории' },
                            { key: 'protein', label: 'Белки (г)' },
                            { key: 'fat', label: 'Жиры (г)' },
                            { key: 'carbs', label: 'Углеводы (г)' },
                          ].map(({ key, label }) => (
                            <div key={key}>
                              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', color: 'rgba(45,31,14,0.4)', margin: '0 0 4px', letterSpacing: '1px', textTransform: 'uppercase' }}>{label}</p>
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
                          <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', color: 'rgba(45,31,14,0.4)', margin: '0 0 4px', letterSpacing: '1px', textTransform: 'uppercase' }}>Заметка тренера</p>
                          <input
                            type="text"
                            value={nForm.notes}
                            onChange={e => setNutritionForms(prev => ({ ...prev, [client.id]: { ...prev[client.id], notes: e.target.value } }))}
                            placeholder="Рекомендация по питанию..."
                            style={inputSm}
                          />
                        </div>
                        <button onClick={() => saveNutrition(client.id)} disabled={savingNutrition === client.id} style={{ padding: '7px 18px', borderRadius: '999px', background: '#7a4a20', color: '#fff', border: 'none', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', cursor: 'pointer' }}>
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
                            <span style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 300, fontSize: '16px', color: '#2d1f0e' }}>{v}</span>
                            <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: 'rgba(45,31,14,0.4)', marginLeft: '2px' }}>{u}</span>
                          </div>
                        ))}
                        {nutrition.notes && <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: 'rgba(45,31,14,0.45)', fontStyle: 'italic', marginLeft: '4px' }}>{nutrition.notes}</span>}
                      </div>
                    ) : (
                      <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.3)', fontSize: '12px', margin: 0 }}>Не задано</p>
                    )}

                    {/* В — ПОСЛЕДНЯЯ ТРЕНИРОВКА */}
                    <Divider />
                    <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.35)', margin: '0 0 10px' }}>Последняя тренировка</p>
                    {lastSessionLogs.length === 0 ? (
                      <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.3)', fontSize: '12px', margin: 0 }}>Тренировок ещё не было</p>
                    ) : (
                      <>
                        <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: 'rgba(45,31,14,0.3)', margin: '0 0 8px' }}>{fmtDate(lastDate!)}</p>
                        {lastSessionLogs.map((l: any, i: number) => {
                          const parts: string[] = []
                          if (l.w1) parts.push(`П1: ${l.w1}кг`)
                          if (l.w2) parts.push(`П2: ${l.w2}кг`)
                          if (l.w3) parts.push(`П3: ${l.w3}кг`)
                          if (l.reps) parts.push(`${l.reps} повт`)
                          return (
                            <div key={i} style={{ marginBottom: l.notes ? '6px' : '4px' }}>
                              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: 'rgba(45,31,14,0.65)', margin: 0 }}>
                                {EXERCISE_NAMES[l.exercise_id] || l.exercise_id}
                                {parts.length > 0 && <span style={{ color: 'rgba(45,31,14,0.4)' }}> — {parts.join(' · ')}</span>}
                              </p>
                              {l.notes && (
                                <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: 'rgba(45,31,14,0.4)', fontStyle: 'italic', margin: '1px 0 0' }}>{l.notes}</p>
                              )}
                            </div>
                          )
                        })}
                      </>
                    )}

                    {/* Г — ОТЧЁТ */}
                    <Divider />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.35)', margin: 0 }}>Отчёт недели</p>
                      {!latestReport && (
                        <button
                          onClick={() => {
                            const today = new Date().toISOString().slice(0, 10)
                            if (!starterForms[client.id]) setStarterForms(prev => ({ ...prev, [client.id]: { date: today, weight: '', chest: '', waist: '', waist_navel: '', hips: '', one_thigh: '', arm: '', notes: '' } }))
                            setAddingStarterReport(addingStarterReport === client.id ? null : client.id)
                          }}
                          style={{ background: 'none', border: 'none', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: '#7a4a20', cursor: 'pointer', padding: 0 }}
                        >
                          {addingStarterReport === client.id ? 'Отмена' : '+ Стартовый отчёт'}
                        </button>
                      )}
                    </div>
                    {!latestReport && addingStarterReport === client.id && (
                      <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: '14px', padding: '14px', marginBottom: '10px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ marginBottom: '8px' }}>
                          <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', color: 'rgba(45,31,14,0.4)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Дата</p>
                          <input type="date" value={starterForms[client.id]?.date || ''} onChange={e => setStarterForms(prev => ({ ...prev, [client.id]: { ...prev[client.id], date: e.target.value } }))} style={{ ...inputSm }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                          {[
                            { key: 'weight', label: 'Вес (кг)' },
                            { key: 'chest', label: 'Грудь (см)' },
                            { key: 'waist', label: 'Талия (см)' },
                            { key: 'waist_navel', label: 'Пупок (см)' },
                            { key: 'hips', label: 'Бёдра (см)' },
                            { key: 'one_thigh', label: 'Бедро (см)' },
                            { key: 'arm', label: 'Рука (см)' },
                          ].map(({ key, label }) => (
                            <div key={key}>
                              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', color: 'rgba(45,31,14,0.4)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</p>
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
                          <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', color: 'rgba(45,31,14,0.4)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Заметки</p>
                          <textarea
                            value={starterForms[client.id]?.notes || ''}
                            onChange={e => setStarterForms(prev => ({ ...prev, [client.id]: { ...prev[client.id], notes: e.target.value } }))}
                            placeholder="Стартовые показатели..."
                            rows={2}
                            style={{ ...inputSm, borderRadius: '10px', resize: 'none', lineHeight: 1.5 }}
                          />
                        </div>
                        <button
                          onClick={() => saveStarterReport(client.id)}
                          disabled={savingStarterReport === client.id}
                          style={{ padding: '7px 18px', borderRadius: '999px', background: '#7a4a20', color: '#fff', border: 'none', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', cursor: 'pointer' }}
                        >
                          {savingStarterReport === client.id ? 'Сохраняем...' : 'Сохранить отчёт'}
                        </button>
                      </div>
                    )}
                    {!latestReport && addingStarterReport !== client.id ? (
                      <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.3)', fontSize: '12px', margin: 0 }}>Отчёт ещё не отправлен</p>
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
                              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: 'rgba(45,31,14,0.35)', margin: '0 0 2px' }}>{fmtDate(latestReport.week_start)}</p>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                {latestReport.weight != null && (
                                  <span style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 300, fontSize: '22px', color: '#2d1f0e', lineHeight: 1 }}>{latestReport.weight} кг</span>
                                )}
                                {weightDiff !== null && (
                                  <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 500, fontSize: '11px', color: weightDiff <= 0 ? '#1a7a3c' : '#8a2520' }}>
                                    {weightDiff <= 0 ? `↓${Math.abs(weightDiff)}` : `↑${weightDiff}`}
                                  </span>
                                )}
                              </div>
                            </div>
                            {sparkSvg && (
                              <svg width="80" height="30" viewBox="0 0 80 30" style={{ flexShrink: 0 }}>
                                <polyline points={sparkSvg} fill="none" stroke="#7a4a20" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
                              </svg>
                            )}
                          </div>
                          {/* Params inline */}
                          <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: 'rgba(45,31,14,0.45)', margin: '0 0 8px', lineHeight: 1.8 }}>
                            {[
                              latestReport.chest != null && `Гр: ${latestReport.chest}`,
                              latestReport.waist != null && `Тал: ${latestReport.waist}`,
                              latestReport.hips != null && `Бёд: ${latestReport.hips}`,
                              latestReport.waist_navel != null && `Пуп: ${latestReport.waist_navel}`,
                              latestReport.one_thigh != null && `Бедро: ${latestReport.one_thigh}`,
                              latestReport.arm != null && `Рука: ${latestReport.arm}`,
                            ].filter(Boolean).join(' · ')}
                          </p>
                          {/* Photos */}
                          <div style={{ display: 'flex', gap: '6px', marginBottom: latestReport.notes ? '8px' : 0 }}>
                            {(['photo_front_url', 'photo_side_url', 'photo_back_url'] as const).map((key, i) => (
                              latestReport[key] ? (
                                <img key={i} src={latestReport[key]} alt="" style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.06)' }} />
                              ) : null
                            ))}
                          </div>
                          {latestReport.notes && (
                            <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.45)', fontSize: '11px', fontStyle: 'italic', margin: 0 }}>
                              "{latestReport.notes}"
                            </p>
                          )}
                          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                            <button
                              onClick={e => { e.stopPropagation(); setViewingReport({ client: client.name, report: latestReport }) }}
                              style={{ padding: '7px 16px', borderRadius: '999px', background: 'rgba(122,74,32,0.08)', border: '1px solid rgba(122,74,32,0.2)', color: '#7a4a20', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', cursor: 'pointer' }}
                            >
                              Открыть полный отчёт
                            </button>
                            {client.reports && client.reports.length > 1 && (
                              <button
                                onClick={e => { e.stopPropagation(); setViewingReportHistory({ client: client.name, reports: client.reports }) }}
                                style={{ padding: '7px 16px', borderRadius: '999px', background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.1)', color: 'rgba(45,31,14,0.5)', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', cursor: 'pointer' }}
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
                        <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.35)', margin: '0 0 8px' }}>Самочувствие</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '24px' }}>{MOOD_EMOJIS[mood.mood] || '😐'}</span>
                          <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.55)' }}>Энергия: {mood.energy}/10 · Мышцы: {mood.muscle_pain}/10</span>
                        </div>
                      </>
                    )}

                    {/* Е — НАЗНАЧЕННАЯ ТРЕНИРОВКА */}
                    <Divider />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.35)', margin: 0 }}>Тренировка</p>
                      <button onClick={() => setAssigningWorkout(isAssigningWorkout ? null : client.id)} style={{ background: 'none', border: 'none', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: '#7a4a20', cursor: 'pointer', padding: 0 }}>
                        {isAssigningWorkout ? 'Отмена' : 'Сменить'}
                      </button>
                    </div>

                    {isAssigningWorkout ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {workoutsList.length === 0 ? (
                          <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.4)', margin: 0 }}>Нет созданных тренировок</p>
                        ) : (
                          workoutsList.map(w => (
                            <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                onClick={() => assignWorkout(client.id, w.id)}
                                disabled={savingWorkout === client.id}
                                style={{
                                  flex: 1, padding: '9px 14px', borderRadius: '12px', textAlign: 'left',
                                  background: assignedWorkout?.id === w.id ? 'rgba(122,74,32,0.12)' : 'rgba(0,0,0,0.04)',
                                  border: assignedWorkout?.id === w.id ? '1px solid rgba(122,74,32,0.2)' : '1px solid transparent',
                                  cursor: 'pointer',
                                }}
                              >
                                <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', color: '#2d1f0e', margin: 0 }}>{w.title}</p>
                                {w.subtitle && <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: 'rgba(45,31,14,0.4)', margin: '2px 0 0' }}>{w.subtitle}</p>}
                              </button>
                              <button
                                onClick={() => deleteWorkout(w.id)}
                                style={{ background: 'none', border: 'none', color: 'rgba(138,37,32,0.4)', fontSize: '14px', cursor: 'pointer', padding: '6px', flexShrink: 0 }}
                              >
                                ✕
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    ) : assignedWorkout ? (
                      <div style={{ background: 'rgba(122,74,32,0.07)', borderRadius: '12px', padding: '10px 14px' }}>
                        <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', color: '#2d1f0e', margin: 0 }}>{assignedWorkout.title}</p>
                        {assignedWorkout.subtitle && <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: 'rgba(45,31,14,0.4)', margin: '2px 0 0' }}>{assignedWorkout.subtitle}</p>}
                      </div>
                    ) : (
                      <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.3)', fontSize: '12px', margin: 0 }}>Не назначено</p>
                    )}

                    {/* Ж — ПРОГРАММА */}
                    <Divider />
                    {(() => {
                      const prog = programsList.find((p: any) => Array.isArray(p.assigned_to) && p.assigned_to.includes(client.id))
                      return prog ? (
                        <>
                          <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.35)', margin: '0 0 8px' }}>Программа</p>
                          <div style={{ background: 'rgba(122,74,32,0.07)', borderRadius: '12px', padding: '10px 14px' }}>
                            <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', color: '#2d1f0e', margin: '0 0 2px' }}>{prog.title}</p>
                            {prog.start_date && <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: 'rgba(45,31,14,0.4)', margin: 0 }}>Старт: {new Date(prog.start_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</p>}
                          </div>
                        </>
                      ) : (
                        <>
                          <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.35)', margin: '0 0 8px' }}>Программа</p>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.3)', fontSize: '12px', margin: 0 }}>Программа не назначена</p>
                            <button onClick={() => router.push('/coach/programs/new')} style={{ background: 'none', border: 'none', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: '#7a4a20', cursor: 'pointer', padding: 0 }}>+ Создать</button>
                          </div>
                        </>
                      )
                    })()}

                    {/* Удаление клиента */}
                    <div style={{ marginTop: '16px', textAlign: 'center' }}>
                      <button
                        onClick={() => deleteClient(client.id, client.name)}
                        style={{ background: 'none', border: 'none', color: 'rgba(138,37,32,0.5)', fontSize: '12px', fontFamily: 'Chillax, sans-serif', cursor: 'pointer', padding: 0 }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#8a2520')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(138,37,32,0.5)')}
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
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '480px', background: '#f5f0e8', borderRadius: '24px', padding: '24px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}
          >
            {/* Close */}
            <button
              onClick={() => setViewingReport(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(0,0,0,0.07)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: 'rgba(45,31,14,0.5)' }}
            >
              ✕
            </button>

            {/* Header */}
            <h2 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '22px', color: '#2d1f0e', margin: '0 0 4px' }}>{viewingReport.client}</h2>
            <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.4)', margin: '0 0 20px' }}>
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
                      style={{ width: '100%', height: '130px', objectFit: 'cover', borderRadius: '12px', display: 'block' }}
                    />
                    <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: 'rgba(45,31,14,0.35)', textAlign: 'center', margin: '4px 0 0' }}>{label}</p>
                  </div>
                ) : null)}
              </div>
            )}

            {/* Weight */}
            {viewingReport.report.weight && (
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 300, fontSize: '40px', color: '#2d1f0e', margin: '0 0 2px', lineHeight: 1 }}>{viewingReport.report.weight}</p>
                <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: 'rgba(45,31,14,0.4)', margin: 0, textTransform: 'uppercase', letterSpacing: '1.5px' }}>кг</p>
              </div>
            )}

            {/* Params grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              {[
                { key: 'chest', label: 'Грудь' },
                { key: 'waist', label: 'Талия' },
                { key: 'waist_navel', label: 'Пупок' },
                { key: 'hips', label: 'Бёдра' },
                { key: 'one_thigh', label: 'Бедро' },
                { key: 'arm', label: 'Рука' },
              ].filter(({ key }) => viewingReport.report[key] != null).map(({ key, label }) => (
                <div key={key} style={{ background: 'rgba(0,0,0,0.04)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 300, fontSize: '22px', color: '#2d1f0e', margin: '0 0 2px', lineHeight: 1 }}>{viewingReport.report[key]}</p>
                  <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: 'rgba(45,31,14,0.4)', margin: 0 }}>{label} см</p>
                </div>
              ))}
            </div>

            {/* Notes */}
            {viewingReport.report.notes && (
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', color: 'rgba(45,31,14,0.6)', fontStyle: 'italic', margin: 0, lineHeight: 1.6 }}>«{viewingReport.report.notes}»</p>
            )}
          </div>
        </div>
      )}

      {/* REPORT HISTORY MODAL */}
      {viewingReportHistory && (
        <div
          onClick={() => setViewingReportHistory(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '24px', padding: '28px 24px', width: '100%', maxWidth: '480px', marginTop: '40px', position: 'relative' }}
          >
            <button onClick={() => setViewingReportHistory(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'rgba(45,31,14,0.3)', lineHeight: 1 }}>✕</button>
            <h2 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '22px', color: '#2d1f0e', margin: '0 0 4px' }}>{viewingReportHistory.client}</h2>
            <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.4)', margin: '0 0 20px', letterSpacing: '1px', textTransform: 'uppercase' }}>Все отчёты · {viewingReportHistory.reports.length}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[...viewingReportHistory.reports].sort((a, b) => new Date(b.week_start || b.created_at || 0).getTime() - new Date(a.week_start || a.created_at || 0).getTime()).map((r, i, arr) => {
                const next = arr[i + 1]
                const diff = r.weight != null && next?.weight != null ? +(r.weight - next.weight).toFixed(1) : null
                return (
                  <div key={r.id || i} style={{ background: 'rgba(0,0,0,0.03)', borderRadius: '16px', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                      <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: 'rgba(45,31,14,0.4)', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {r.week_start ? new Date(r.week_start).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                      </p>
                      {r.weight != null && (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                          <span style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 300, fontSize: '20px', color: '#2d1f0e' }}>{r.weight} кг</span>
                          {diff !== null && (
                            <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 500, fontSize: '11px', color: diff <= 0 ? '#1a7a3c' : '#8a2520' }}>
                              {diff <= 0 ? `↓${Math.abs(diff)}` : `↑${diff}`}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {(r.photo_front_url || r.photo_side_url || r.photo_back_url) && (
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                        {[r.photo_front_url, r.photo_side_url, r.photo_back_url].filter(Boolean).map((url, j) => (
                          <img key={j} src={url} alt="" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.06)' }} />
                        ))}
                      </div>
                    )}
                    {r.notes && (
                      <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.55)', fontStyle: 'italic', margin: 0 }}>«{r.notes}»</p>
                    )}
                    <button
                      onClick={() => { setViewingReportHistory(null); setViewingReport({ client: viewingReportHistory.client, report: r }) }}
                      style={{ marginTop: '8px', padding: '5px 14px', borderRadius: '999px', background: 'rgba(122,74,32,0.07)', border: '1px solid rgba(122,74,32,0.18)', color: '#7a4a20', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', cursor: 'pointer' }}
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
