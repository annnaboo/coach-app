'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'
import { getPaymentStatus, localDateStr } from '@/lib/utils'
import ArtName from '@/app/components/ArtName'
import BrandLogo from '@/app/components/BrandLogo'
import { LABEL } from '@/lib/design/tokens'

// ─── Types ────────────────────────────────────────────────────────────────────

type Client = {
  id: string
  name: string
  payment: any | null
  latestReportDate: string | null
  lastSeenDate: string | null
  activityDays: number        // unique workout days in last 28 days
  programTitle: string | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CoachPage() {
  const [coachName, setCoachName] = useState('')
  const [coachId, setCoachId] = useState<string | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [totalReports, setTotalReports] = useState(0)
  const [swapRequests, setSwapRequests] = useState<any[]>([])
  const [approvingSwap, setApprovingSwap] = useState<string | null>(null)
  const [swapWorkoutSelected, setSwapWorkoutSelected] = useState<Record<string, string>>({})
  const [workoutsList, setWorkoutsList] = useState<any[]>([])
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePassword, setInvitePassword] = useState('')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const router = useRouter()

  const inputSm: React.CSSProperties = {
    background: 'var(--bg-card-soft)',
    border: '1px solid var(--divider)',
    borderRadius: 'var(--radius-sm)',
    padding: '9px 12px',
    fontFamily: 'var(--font-text)',
    fontSize: '14px',
    color: 'var(--text-primary)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  }

  async function loadData() {
    const supabase = createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) { router.push('/'); return }

    const { data: prof } = await supabase
      .from('profiles').select('name, role').eq('id', authData.user.id).single()
    if (prof?.role !== 'coach') { router.push('/client'); return }
    setCoachName(prof.name || 'Тренер')
    setCoachId(authData.user.id)

    const { data: profiles } = await supabase
      .from('profiles').select('id, name').eq('role', 'client').order('name')
    if (!profiles?.length) { setLoading(false); return }

    const ids = profiles.map(p => p.id)
    const now = new Date()
    const fourWeeksAgo = new Date(now.getTime() - 28 * 86400000).toISOString()

    // Four parallel queries total — one per data type across ALL clients
    const [paymentsRes, reportsRes, logsRes, programsRes, swapsRes, workoutsRes, reportCountRes] = await Promise.all([
      supabase.from('payments').select('*').in('player_id', ids).order('created_at', { ascending: false }),
      supabase.from('weekly_reports').select('player_id, week_start').in('player_id', ids).order('week_start', { ascending: false }),
      supabase.from('workout_logs').select('player, saved_at').in('player', ids).gte('saved_at', fourWeeksAgo),
      supabase.from('programs').select('id, title, assigned_to, end_date').eq('is_active', true),
      supabase.from('workout_swap_requests')
        .select('id, player_id, reason, status, created_at, current_workout_id')
        .eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('workouts').select('id, title, subtitle, assigned_to_multiple').eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('weekly_reports').select('*', { count: 'exact', head: true }).in('player_id', ids),
    ])

    setTotalReports(reportCountRes.count || 0)
    setWorkoutsList(workoutsRes.data || [])

    // Build per-client aggregates from the flat result sets
    const paymentMap: Record<string, any> = {}
    ;(paymentsRes.data || []).forEach(p => { if (!paymentMap[p.player_id]) paymentMap[p.player_id] = p })

    const latestReportMap: Record<string, string> = {}
    ;(reportsRes.data || []).forEach(r => { if (!latestReportMap[r.player_id]) latestReportMap[r.player_id] = r.week_start })

    const lastSeenMap: Record<string, string> = {}
    const activityMap: Record<string, Set<string>> = {}
    ;(logsRes.data || []).forEach(l => {
      if (!lastSeenMap[l.player] || l.saved_at > lastSeenMap[l.player]) lastSeenMap[l.player] = l.saved_at
      if (!activityMap[l.player]) activityMap[l.player] = new Set()
      activityMap[l.player].add(l.saved_at.slice(0, 10))
    })

    const programMap: Record<string, string> = {}
    ;(programsRes.data || []).forEach((p: any) => {
      if (Array.isArray(p.assigned_to)) {
        p.assigned_to.forEach((cid: string) => {
          if (!programMap[cid]) programMap[cid] = p.title + (p.end_date ? ` · до ${new Date(p.end_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}` : '')
        })
      }
    })

    const clientsData: Client[] = profiles.map(p => ({
      id: p.id,
      name: p.name,
      payment: paymentMap[p.id] || null,
      latestReportDate: latestReportMap[p.id] || null,
      lastSeenDate: lastSeenMap[p.id] || null,
      activityDays: activityMap[p.id]?.size || 0,
      programTitle: programMap[p.id] || null,
    }))

    setClients(clientsData)

    // Swap requests with client names
    const swapWithNames = (swapsRes.data || []).map((req: any) => ({
      ...req,
      player_name: profiles.find(p => p.id === req.player_id)?.name || 'Клиент',
      current_workout_title: (workoutsRes.data || []).find((w: any) => w.id === req.current_workout_id)?.title || '—',
    }))
    setSwapRequests(swapWithNames)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function resolveSwap(id: string, status: 'approved' | 'declined') {
    const supabase = createClient()
    await supabase.from('workout_swap_requests').update({ status }).eq('id', id)
    setSwapRequests(prev => prev.filter(r => r.id !== id))
  }

  async function approveWithWorkout(req: any) {
    const workoutId = swapWorkoutSelected[req.id]
    if (!workoutId) return
    const supabase = createClient()
    await supabase.from('workout_swap_requests').update({ status: 'approved' }).eq('id', req.id)
    const { data: w } = await supabase.from('workouts').select('assigned_to_multiple').eq('id', workoutId).single()
    const current: string[] = w?.assigned_to_multiple || []
    if (!current.includes(req.player_id)) {
      await supabase.from('workouts').update({ assigned_to_multiple: [...current, req.player_id] }).eq('id', workoutId)
    }
    // Use today's local date — not req.created_at which is UTC and may be yesterday in client's timezone
    const requestDate = localDateStr(new Date())
    await supabase.from('workout_schedule')
      .delete()
      .eq('player_id', req.player_id)
      .eq('scheduled_date', requestDate)
    await supabase.from('workout_schedule').insert({
      player_id: req.player_id,
      workout_id: workoutId,
      scheduled_date: requestDate,
    })
    setSwapRequests(prev => prev.filter(r => r.id !== req.id))
    setApprovingSwap(null)
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
      setInviteSending(false)
      setTimeout(() => {
        setShowInviteForm(false)
        setInviteSuccess(false)
        setInviteName(''); setInviteEmail(''); setInvitePassword('')
        loadData()
      }, 3000)
    } else {
      setInviteError(data.error || 'Ошибка при создании')
      setInviteSending(false)
    }
  }

  async function handleLogout() {
    await createClient().auth.signOut()
    router.push('/')
  }

  // ─── Loading skeleton ───────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, padding: '48px 24px 80px' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <div style={{ marginBottom: '32px' }}>
            <div className="skeleton" style={{ height: '40px', borderRadius: 'var(--radius-md)', width: '50%', marginBottom: '8px' }} />
            <div className="skeleton" style={{ height: '10px', borderRadius: '5px', width: '30%' }} />
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ borderRadius: 'var(--radius-md)', height: '72px', marginBottom: '8px' }} />
          ))}
        </div>
      </div>
    </div>
  )

  // ─── Derived stats ──────────────────────────────────────────────────────────

  const now = new Date()
  const paidCount = clients.filter(c => c.payment?.paid).length
  const allPaid = clients.length > 0 && paidCount === clients.length
  const totalExpected = clients.reduce((s, c) => s + (c.payment?.monthly_rate || c.payment?.amount || 0), 0)
  const totalReceived = clients.reduce((s, c) => s + (c.payment?.paid ? (c.payment?.monthly_rate || c.payment?.amount || 0) : 0), 0)
  const receivedPct = totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 0
  const overdueClients = clients.filter(c => {
    if (!c.payment || c.payment.paid) return false
    const end = c.payment.period_end ? new Date(c.payment.period_end) : null
    return end && end < now
  })
  const noReportThisWeek = clients.filter(c => {
    if (!c.latestReportDate) return true
    return Math.floor((now.getTime() - new Date(c.latestReportDate).getTime()) / 86400000) > 7
  })

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, padding: '48px 24px 80px' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>

          <BrandLogo />

          {/* HEADER */}
          <div className="card-enter" style={{ paddingBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => window.location.reload()} className="pressable" style={{ background: 'transparent', border: '1px solid var(--divider)', borderRadius: '999px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '15px', padding: '6px 10px', lineHeight: 1 }}>↻</button>
                <button onClick={handleLogout} className="pressable" style={{ background: 'transparent', border: '1px solid var(--divider)', borderRadius: '999px', color: 'var(--text-secondary)', fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '11px', padding: '7px 16px', cursor: 'pointer', letterSpacing: '0.05em' }}>Выйти</button>
              </div>
            </div>
            <ArtName name={coachName} />
            <p style={{ fontFamily: 'var(--font-text)', fontWeight: 400, color: 'var(--text-secondary)', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '6px 0 0' }}>
              Тренерский дашборд · {now.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* STATS */}
          <div className="card-enter" style={{ background: 'var(--bg-card)', border: '1px solid var(--divider)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: '12px' }}>
            <p style={{ ...LABEL }}>Обзор</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0' }}>
              {[
                { value: clients.length, label: 'Клиентов' },
                { value: totalReports, label: 'Отчётов' },
                { value: `${paidCount}/${clients.length}`, label: 'Оплат', color: allPaid ? 'var(--success)' : undefined },
                { value: swapRequests.length, label: 'Заявок', color: swapRequests.length > 0 ? 'var(--accent-primary)' : undefined },
              ].map(({ value, label, color }, i) => (
                <div key={label} style={{ textAlign: 'center', borderRight: i < 3 ? '1px solid var(--divider)' : 'none', padding: '0 4px' }}>
                  <p style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '32px', color: color || 'var(--text-primary)', margin: '0 0 4px', lineHeight: 1 }}>{value}</p>
                  <p style={{ fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* FINANCES */}
          <div className="card-enter" style={{ background: 'var(--bg-card)', border: '1px solid var(--divider)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: '12px' }}>
            <p style={{ ...LABEL }}>Финансы</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
              <p style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '48px', color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>
                €{totalReceived.toLocaleString('ru-RU')}
              </p>
              {totalExpected > 0 && (
                <span style={{ fontFamily: 'var(--font-text)', fontSize: '13px', color: 'var(--text-tertiary)' }}>из €{totalExpected.toLocaleString('ru-RU')}</span>
              )}
            </div>
            <p style={{ fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)', margin: '6px 0 12px' }}>Получено</p>
            {totalExpected > 0 && (
              <div style={{ height: '3px', borderRadius: '999px', background: 'var(--divider)', marginBottom: '16px' }}>
                <div style={{ height: '3px', width: `${receivedPct}%`, background: 'var(--accent-primary)', borderRadius: '999px', transition: 'width 0.6s ease' }} />
              </div>
            )}
            {(overdueClients.length > 0 || noReportThisWeek.length > 0) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {overdueClients.length > 0 && (
                  <div style={{ borderLeft: '2px solid var(--error)', paddingLeft: '12px' }}>
                    <p style={{ fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '10px', color: 'var(--error)', margin: '0 0 3px', letterSpacing: '1px', textTransform: 'uppercase' }}>Просроченная оплата</p>
                    {overdueClients.map(c => <p key={c.id} style={{ fontFamily: 'var(--font-text)', fontSize: '12px', color: 'var(--error)', margin: 0 }}>{c.name}</p>)}
                  </div>
                )}
                {noReportThisWeek.length > 0 && (
                  <div style={{ borderLeft: '2px solid var(--warning)', paddingLeft: '12px' }}>
                    <p style={{ fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '10px', color: 'var(--warning)', margin: '0 0 3px', letterSpacing: '1px', textTransform: 'uppercase' }}>Нет отчёта</p>
                    {noReportThisWeek.map(c => <p key={c.id} style={{ fontFamily: 'var(--font-text)', fontSize: '12px', color: 'var(--warning)', margin: 0 }}>{c.name}</p>)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SWAP REQUESTS */}
          {swapRequests.length > 0 && (
            <div className="card-enter" style={{ background: 'var(--bg-card)', border: '1px solid var(--divider)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: '12px' }}>
              <p style={{ ...LABEL }}>Заявки на замену · {swapRequests.length}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {swapRequests.map(req => (
                  <div key={req.id} style={{ borderBottom: '1px solid var(--divider)', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <p style={{ fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '14px', color: 'var(--text-primary)', margin: 0 }}>{req.player_name}</p>
                        <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '12px', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
                          {req.current_workout_title}{req.reason ? ` · ${req.reason}` : ''}
                        </p>
                      </div>
                      <p style={{ fontFamily: 'var(--font-text)', fontSize: '10px', color: 'var(--text-tertiary)', margin: 0 }}>
                        {new Date(req.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    {approvingSwap === req.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <select
                          value={swapWorkoutSelected[req.id] || ''}
                          onChange={e => setSwapWorkoutSelected(prev => ({ ...prev, [req.id]: e.target.value }))}
                          style={{ background: 'var(--bg-card-soft)', border: '1px solid var(--divider)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', fontFamily: 'var(--font-text)', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', width: '100%' }}
                        >
                          <option value="">Выбрать тренировку...</option>
                          {workoutsList.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
                        </select>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => approveWithWorkout(req)} disabled={!swapWorkoutSelected[req.id]} style={{ flex: 1, padding: '8px', borderRadius: '999px', background: swapWorkoutSelected[req.id] ? 'var(--accent-primary)' : 'var(--bg-card-soft)', color: swapWorkoutSelected[req.id] ? '#fff' : 'var(--text-tertiary)', border: 'none', fontFamily: 'var(--font-text)', fontSize: '12px', cursor: 'pointer' }}>Одобрить</button>
                          <button onClick={() => setApprovingSwap(null)} style={{ padding: '8px 14px', borderRadius: '999px', background: 'transparent', border: '1px solid var(--divider)', color: 'var(--text-secondary)', fontFamily: 'var(--font-text)', fontSize: '12px', cursor: 'pointer' }}>Отмена</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => setApprovingSwap(req.id)} style={{ flex: 1, padding: '7px', borderRadius: '999px', background: 'var(--accent-soft-bg)', border: '1px solid rgba(0,0,0,0.06)', color: 'var(--accent-primary)', fontFamily: 'var(--font-text)', fontSize: '12px', cursor: 'pointer' }}>+ Одобрить</button>
                        <button onClick={() => { if (confirm('Отклонить заявку?')) resolveSwap(req.id, 'declined') }} style={{ flex: 1, padding: '7px', borderRadius: '999px', background: 'transparent', border: '1px solid var(--divider)', color: 'var(--text-secondary)', fontFamily: 'var(--font-text)', fontSize: '12px', cursor: 'pointer' }}>Отклонить</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CLIENT LIST */}
          <div className="card-enter" style={{ background: 'var(--bg-card)', border: '1px solid var(--divider)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{ ...LABEL, margin: 0 }}>Клиенты · {clients.length}</p>
              <button
                onClick={() => setShowInviteForm(v => !v)}
                className="pressable"
                style={{ padding: '6px 14px', borderRadius: '999px', background: showInviteForm ? 'var(--accent-primary)' : 'var(--accent-soft-bg)', border: '1px solid rgba(0,0,0,0.08)', color: showInviteForm ? '#fff' : 'var(--accent-primary)', fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '12px', cursor: 'pointer' }}
              >
                {showInviteForm ? '✕ Отмена' : '+ Добавить'}
              </button>
            </div>

            {/* Invite form */}
            {showInviteForm && (
              <div style={{ background: 'var(--bg-card-soft)', border: '1px solid var(--divider)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '16px' }}>
                {inviteSuccess ? (
                  <p style={{ fontFamily: 'var(--font-text)', fontSize: '13px', color: 'var(--success)', textAlign: 'center', margin: 0 }}>✓ Клиент добавлен</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input placeholder="Имя" value={inviteName} onChange={e => setInviteName(e.target.value)} style={inputSm} />
                    <input placeholder="Email" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} style={inputSm} />
                    <input placeholder="Пароль" type="password" value={invitePassword} onChange={e => setInvitePassword(e.target.value)} style={inputSm} />
                    {inviteError && <p style={{ fontFamily: 'var(--font-text)', fontSize: '12px', color: 'var(--error)', margin: 0 }}>{inviteError}</p>}
                    <button onClick={sendInvite} disabled={inviteSending} style={{ padding: '9px', borderRadius: '999px', background: 'var(--accent-primary)', color: '#fff', border: 'none', fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '13px', cursor: 'pointer', opacity: inviteSending ? 0.7 : 1 }}>
                      {inviteSending ? 'Создаём...' : 'Создать аккаунт'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Compact client cards */}
            {clients.length === 0 ? (
              <p style={{ fontFamily: 'var(--font-text)', fontSize: '14px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '16px 0', margin: 0 }}>Клиентов пока нет</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {clients.map(c => {
                  const payStatus = c.payment ? getPaymentStatus(c.payment) : null
                  const daysSinceReport = c.latestReportDate
                    ? Math.floor((now.getTime() - new Date(c.latestReportDate).getTime()) / 86400000)
                    : null
                  const completionPct = Math.min(100, Math.round((c.activityDays / 16) * 100))
                  const isActive = c.lastSeenDate
                    ? Math.floor((now.getTime() - new Date(c.lastSeenDate).getTime()) / 86400000) <= 3
                    : false

                  return (
                    <div
                      key={c.id}
                      onClick={() => router.push(`/coach/clients/${c.id}`)}
                      className="pressable"
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--divider)', cursor: 'pointer' }}
                    >
                      {/* Avatar */}
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-soft-bg)', border: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontFamily: 'var(--font-text)', fontWeight: 600, fontSize: '15px', color: 'var(--accent-primary)' }}>{c.name[0]?.toUpperCase()}</span>
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <p style={{ fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '15px', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                          <span style={{ fontFamily: 'var(--font-text)', fontSize: '10px', color: isActive ? 'var(--success)' : 'var(--text-tertiary)', flexShrink: 0, marginLeft: '8px' }}>
                            {isActive ? '● online' : daysSinceReport !== null ? `${daysSinceReport}д отчёт` : 'нет отчётов'}
                          </span>
                        </div>

                        {/* Badges row */}
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          {payStatus && (
                            <span style={{ fontFamily: 'var(--font-text)', fontSize: '9px', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', padding: '2px 7px', borderRadius: '999px', border: payStatus.border, color: payStatus.color, lineHeight: 1.6, whiteSpace: 'nowrap' }}>
                              {payStatus.label}
                            </span>
                          )}
                          {c.programTitle && (
                            <span style={{ fontFamily: 'var(--font-text)', fontSize: '9px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{c.programTitle}</span>
                          )}
                        </div>

                        {/* Activity bar */}
                        {c.activityDays > 0 && (
                          <div style={{ height: '2px', borderRadius: '999px', background: 'var(--divider)', marginTop: '6px' }}>
                            <div style={{ height: '2px', width: `${completionPct}%`, background: completionPct >= 75 ? 'var(--success)' : completionPct >= 40 ? 'var(--warning)' : 'var(--accent-primary)', borderRadius: '999px' }} />
                          </div>
                        )}
                      </div>

                      {/* Arrow */}
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '16px', flexShrink: 0 }}>›</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* QUICK NAV */}
          <div className="card-enter" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            {[
              { label: 'Тренировки', path: '/coach/workouts', emoji: '🏋️' },
              { label: 'Программы', path: '/coach/programs', emoji: '📋' },
            ].map(item => (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className="pressable"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--divider)', borderRadius: 'var(--radius-md)', padding: '16px 14px', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ fontSize: '22px', marginBottom: '6px' }}>{item.emoji}</div>
                <p style={{ fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '13px', color: 'var(--text-primary)', margin: 0 }}>{item.label}</p>
              </button>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
