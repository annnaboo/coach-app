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
  const [clients, setClients] = useState<ClientData[]>([])
  const [loading, setLoading] = useState(true)
  const [openClient, setOpenClient] = useState<string | null>(null)
  const [totalReports, setTotalReports] = useState(0)
  const [payments, setPayments] = useState<{ paid: number; total: number }>({ paid: 0, total: 0 })
  const [updatingPayment, setUpdatingPayment] = useState<string | null>(null)
  const [workoutsList, setWorkoutsList] = useState<any[]>([])
  // КБЖУ inline editing
  const [editingNutrition, setEditingNutrition] = useState<string | null>(null)
  const [nutritionForms, setNutritionForms] = useState<Record<string, NutritionForm>>({})
  const [savingNutrition, setSavingNutrition] = useState<string | null>(null)
  // Workout assignment
  const [assigningWorkout, setAssigningWorkout] = useState<string | null>(null)
  const [savingWorkout, setSavingWorkout] = useState<string | null>(null)
  // Invite client
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const router = useRouter()

  async function loadData() {
    const supabase = createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) { router.push('/'); return }

    const { data: prof } = await supabase.from('profiles').select('name, role').eq('id', authData.user.id).single()
    if (prof?.role !== 'coach') { router.push('/client'); return }
    setCoachName(prof.name || 'Тренер')

    const { data: profiles } = await supabase.from('profiles').select('id, name').eq('role', 'client')
    if (!profiles) { setLoading(false); return }

    // Load workouts list for assignment
    const { data: wList } = await supabase.from('workouts').select('id, title, subtitle').order('created_at', { ascending: false })
    setWorkoutsList(wList || [])

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)

    const clientsData: ClientData[] = await Promise.all(
      profiles.map(async (p) => {
        const [logsRes, reportRes, paymentRes, moodRes, nutritionRes, workoutRes] = await Promise.all([
          supabase.from('workout_logs').select('exercise_id, w1, w2, w3, saved_at').eq('player', p.id).order('saved_at', { ascending: false }),
          supabase.from('weekly_reports').select('*').eq('player_id', p.id).order('week_start', { ascending: false }).limit(1).single(),
          supabase.from('payments').select('*').eq('player_id', p.id).gte('period_start', monthStart).lte('period_end', monthEnd).order('period_start', { ascending: false }).limit(1).single(),
          supabase.from('mood_logs').select('*').eq('player_id', p.id).gte('logged_date', twoDaysAgo).order('logged_date', { ascending: false }).limit(1).single(),
          supabase.from('nutrition_plans').select('*').eq('player_id', p.id).single(),
          supabase.from('workouts').select('id, title, subtitle').eq('assigned_to', p.id).order('created_at', { ascending: false }).limit(1).single(),
        ])
        return {
          id: p.id, name: p.name,
          lastSeen: logsRes.data?.[0]?.saved_at || null,
          logs: logsRes.data || [],
          report: reportRes.data || null,
          payment: paymentRes.data || null,
          moodLog: moodRes.data || null,
          nutrition: nutritionRes.data || null,
          assignedWorkout: workoutRes.data || null,
        }
      })
    )

    // Signed URLs for reports
    for (const c of clientsData) {
      if (!c.report) continue
      for (const key of ['photo_front', 'photo_side', 'photo_back'] as const) {
        const path = c.report[key]
        if (path) {
          const { data: s } = await supabase.storage.from('reports').createSignedUrl(path, 3600)
          if (s) c.report[`${key}_url`] = s.signedUrl
        }
      }
    }

    // Stats
    const { count: rCount } = await supabase.from('weekly_reports').select('*', { count: 'exact', head: true }).in('player_id', profiles.map(p => p.id))
    setTotalReports(rCount || 0)

    const paid = clientsData.filter(c => c.payment?.paid === true).length
    const total = clientsData.filter(c => c.payment !== null).length
    setPayments({ paid, total })

    // Init nutrition forms
    const forms: Record<string, NutritionForm> = {}
    clientsData.forEach(c => {
      const n = c.nutrition
      forms[c.id] = { calories: n?.calories ?? '', protein: n?.protein ?? '', fat: n?.fat ?? '', carbs: n?.carbs ?? '', notes: n?.notes ?? '' }
    })
    setNutritionForms(forms)

    setClients(clientsData)
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
    await supabase.from('workouts').update({ assigned_to: clientId }).eq('id', workoutId)
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

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ fontFamily: 'Chillax, sans-serif', color: 'rgba(45,31,14,0.4)', fontSize: '16px' }}>Загружаем...</p>
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
            <button onClick={handleLogout} style={{
              background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.7)', borderRadius: '999px',
              color: 'rgba(45,31,14,0.5)', fontFamily: 'Chillax, sans-serif',
              fontWeight: 300, fontSize: '13px', padding: '8px 18px', cursor: 'pointer', marginTop: '6px',
            }}>
              Выйти
            </button>
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
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <button
              onClick={() => router.push('/coach/workout/new')}
              style={{
                position: 'relative', overflow: 'hidden', borderRadius: '999px',
                padding: '10px 20px', border: 'none', cursor: 'pointer',
                fontFamily: 'Chillax, sans-serif', fontSize: '13px', fontWeight: 500, color: '#fff',
                background: 'transparent',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(122,74,32,0.85)', borderRadius: '999px' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 60%)', borderRadius: '999px' }} />
              <span style={{ position: 'relative' }}>+ Создать тренировку</span>
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

            return (
              <div key={client.id} style={glass}>
                {/* A — HEADER */}
                <div onClick={() => setOpenClient(isOpen ? null : client.id)} style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0, background: 'rgba(122,74,32,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '17px', color: '#7a4a20' }}>
                    {client.name[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, color: '#2d1f0e', fontSize: '17px', margin: '0 0 2px' }}>{client.name}</h3>
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

                {/* Mark paid */}
                {payment && !payment.paid && (
                  <button onClick={e => { e.stopPropagation(); markPaid(client.id, payment.id) }} disabled={updatingPayment === client.id} style={{ marginTop: '10px', padding: '5px 14px', borderRadius: '999px', background: 'rgba(39,174,96,0.12)', border: '1px solid rgba(39,174,96,0.25)', color: '#1a7a3c', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', cursor: 'pointer' }}>
                    ✓ Отметить
                  </button>
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

                    {/* В — ПРОГРЕСС */}
                    <Divider />
                    <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.35)', margin: '0 0 12px' }}>Прогресс по весам</p>
                    {top3.length === 0 ? (
                      <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.3)', fontSize: '12px', margin: 0 }}>Нет данных</p>
                    ) : (
                      top3.map(([exId, weight]) => (
                        <div key={exId} style={{ marginBottom: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.65)' }}>{EXERCISE_NAMES[exId] || exId}</span>
                            <span style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 300, fontSize: '11px', color: '#7a4a20' }}>{weight} кг</span>
                          </div>
                          <div style={{ height: '4px', borderRadius: '999px', background: 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: '999px', width: `${(weight / clientMax) * 100}%`, background: 'linear-gradient(90deg, rgba(122,74,32,0.4), #7a4a20)', transition: 'width 0.5s ease' }} />
                          </div>
                        </div>
                      ))
                    )}

                    {/* Г — ОТЧЁТ */}
                    {report && (
                      <>
                        <Divider />
                        <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.35)', margin: '0 0 12px' }}>Отчёт недели</p>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                            {(['photo_front_url', 'photo_side_url', 'photo_back_url'] as const).map((key, i) => (
                              report[key] ? (
                                <img key={i} src={report[key]} alt="" style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.06)' }} />
                              ) : (
                                <div key={i} style={{ width: '52px', height: '52px', borderRadius: '10px', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="rgba(45,31,14,0.2)" strokeWidth="1.5" fill="none" /><circle cx="12" cy="13" r="4" stroke="rgba(45,31,14,0.2)" strokeWidth="1.5" fill="none" /></svg>
                                </div>
                              )
                            ))}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                              {[['weight', 'кг'], ['chest', 'см'], ['waist', 'см'], ['hips', 'см'], ['waist_navel', 'см'], ['one_thigh', 'см'], ['arm', 'см']].map(([field, unit]) =>
                                report[field] ? <span key={field} style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: 'rgba(45,31,14,0.6)', background: 'rgba(0,0,0,0.04)', borderRadius: '999px', padding: '2px 8px' }}>{report[field]} {unit}</span> : null
                              )}
                            </div>
                            <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: 'rgba(45,31,14,0.3)', margin: 0 }}>{fmtDate(report.week_start)}</p>
                          </div>
                        </div>
                        {report.notes && (
                          <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.5)', fontSize: '12px', fontStyle: 'italic', marginTop: '10px', marginBottom: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                            "{report.notes}"
                          </p>
                        )}
                      </>
                    )}

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
                            <button
                              key={w.id}
                              onClick={() => assignWorkout(client.id, w.id)}
                              disabled={savingWorkout === client.id}
                              style={{
                                padding: '9px 14px', borderRadius: '12px', textAlign: 'left',
                                background: assignedWorkout?.id === w.id ? 'rgba(122,74,32,0.12)' : 'rgba(0,0,0,0.04)',
                                border: assignedWorkout?.id === w.id ? '1px solid rgba(122,74,32,0.2)' : '1px solid transparent',
                                cursor: 'pointer',
                              }}
                            >
                              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', color: '#2d1f0e', margin: 0 }}>{w.title}</p>
                              {w.subtitle && <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: 'rgba(45,31,14,0.4)', margin: '2px 0 0' }}>{w.subtitle}</p>}
                            </button>
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
                  </>
                )}
              </div>
            )
          })}

        </div>
      </div>
    </div>
  )
}
