'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'

const glass: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--divider)',
  borderRadius: 'var(--radius-md)',
  padding: '22px',
  marginBottom: '12px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-card-soft)',
  border: '1px solid var(--divider)',
  borderRadius: 'var(--radius-md)',
  padding: '11px 14px',
  fontFamily: 'var(--font-text)',
  fontWeight: 300,
  fontSize: '14px',
  color: 'var(--text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
}

const fieldLabel: React.CSSProperties = {
  fontFamily: 'var(--font-text)',
  fontWeight: 300,
  fontSize: '11px',
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: 'var(--text-tertiary)',
  marginBottom: '6px',
  display: 'block',
}

type ClientProfile = { id: string; name: string }
type WorkoutItem = { id: string; title: string; subtitle: string | null }

export default function NewProgramPage() {
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState('') // #46 — added missing end_date field
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [clients, setClients] = useState<ClientProfile[]>([])
  const [allWorkouts, setAllWorkouts] = useState<WorkoutItem[]>([])
  const [selectedWorkoutIds, setSelectedWorkoutIds] = useState<string[]>([])
  const [orderedWorkouts, setOrderedWorkouts] = useState<WorkoutItem[]>([])
  const [loading, setLoading] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/'); return }
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
      if (prof?.role !== 'coach') { router.push('/client'); return }

      const [clientsRes, workoutsRes] = await Promise.all([
        supabase.from('profiles').select('id, name').eq('role', 'client').order('name'),
        supabase.from('workouts').select('id, title, subtitle').eq('created_by', data.user.id).eq('is_active', true).order('created_at', { ascending: false }),
      ])
      setClients(clientsRes.data || [])
      setAllWorkouts(workoutsRes.data || [])
      setAuthChecked(true)
    })
  }, [])

  function toggleClient(id: string) {
    setSelectedClients(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleWorkout(w: WorkoutItem) {
    if (selectedWorkoutIds.includes(w.id)) {
      setSelectedWorkoutIds(prev => prev.filter(id => id !== w.id))
      setOrderedWorkouts(prev => prev.filter(x => x.id !== w.id))
    } else {
      setSelectedWorkoutIds(prev => [...prev, w.id])
      setOrderedWorkouts(prev => [...prev, w])
    }
  }

  function moveUp(idx: number) {
    if (idx === 0) return
    setOrderedWorkouts(prev => {
      const arr = [...prev]
      ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
      return arr
    })
  }

  function moveDown(idx: number) {
    setOrderedWorkouts(prev => {
      if (idx === prev.length - 1) return prev
      const arr = [...prev]
      ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
      return arr
    })
  }

  async function handleSave() {
    if (!title.trim() || orderedWorkouts.length === 0) return
    setLoading(true)
    const supabase = createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) { setLoading(false); return }

    const { error } = await supabase.from('programs').insert({
      title: title.trim(),
      assigned_to: selectedClients,
      workout_ids: orderedWorkouts.map(w => w.id),
      start_date: startDate,
      end_date: endDate || null, // #46 — save end_date
      created_by: authData.user.id,
      is_active: true,
    })

    if (error) { alert('Ошибка: ' + error.message); setLoading(false); return }
    router.push('/coach/programs') // #45 — redirect to programs list, not coach home
  }

  if (!authChecked) return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ fontFamily: 'var(--font-text)', color: 'var(--text-tertiary)', fontSize: '16px' }}>Загружаем...</p>
      </div>
    </div>
  )

  const LETTERS = ['А','Б','В','Г','Д','Е','Ж','З','И','К']

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, padding: '28px 20px 60px' }}>
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>

          {/* HEADER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
            <button onClick={() => router.push('/coach')} style={{ background: 'var(--bg-card)', border: '1px solid var(--divider)', borderRadius: '999px', color: 'var(--text-secondary)', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', padding: '8px 18px', cursor: 'pointer', flexShrink: 0 }}>
              ← назад
            </button>
            <div>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--text-primary)', fontSize: '26px', margin: 0 }}>Новая программа</h1>
              <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, color: 'var(--text-tertiary)', fontSize: '11px', margin: 0, letterSpacing: '1px' }}>Цикл тренировок</p>
            </div>
          </div>

          {/* BASIC */}
          <div style={glass}>
            <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '0 0 16px' }}>Основное</p>
            <div style={{ marginBottom: '14px' }}>
              <span style={fieldLabel}>Название программы</span>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Базовый цикл" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <span style={fieldLabel}>Дата старта</span>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
            </div>
            {/* #46 — end_date field was missing from new program form */}
            <div>
              <span style={fieldLabel}>Дата окончания (необязательно)</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* CLIENTS */}
          <div style={glass}>
            <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '0 0 14px' }}>Клиенты</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {clients.length === 0 && <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>Нет клиентов</p>}
              {clients.map(c => (
                <div key={c.id} onClick={() => toggleClient(c.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, background: selectedClients.includes(c.id) ? 'var(--accent-primary)' : 'var(--bg-card-soft)', border: selectedClients.includes(c.id) ? 'none' : '1px solid var(--divider)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {selectedClients.includes(c.id) && <svg width="10" height="10" viewBox="0 0 10 10"><polyline points="2,5 4,7 8,3" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
                  </div>
                  <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '14px', color: 'var(--text-primary)' }}>{c.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* SELECT WORKOUTS */}
          <div style={glass}>
            <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '0 0 14px' }}>Добавить тренировки</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allWorkouts.length === 0 && <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>Нет тренировок — сначала создай</p>}
              {allWorkouts.map(w => (
                <div key={w.id} onClick={() => toggleWorkout(w)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: selectedWorkoutIds.includes(w.id) ? 'var(--accent-soft-bg)' : 'var(--bg-card-soft)', border: selectedWorkoutIds.includes(w.id) ? '1px solid rgba(220,80,0,0.15)' : '1px solid transparent', transition: 'all 0.15s' }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, background: selectedWorkoutIds.includes(w.id) ? 'var(--accent-primary)' : 'var(--bg-card-soft)', border: selectedWorkoutIds.includes(w.id) ? 'none' : '1px solid var(--divider)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {selectedWorkoutIds.includes(w.id) && <svg width="10" height="10" viewBox="0 0 10 10"><polyline points="2,5 4,7 8,3" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '14px', color: 'var(--text-primary)', margin: 0 }}>{w.title}</p>
                    {w.subtitle && <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', color: 'var(--text-tertiary)', margin: '1px 0 0' }}>{w.subtitle}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ORDER */}
          {orderedWorkouts.length > 0 && (
            <div style={glass}>
              <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '0 0 14px' }}>Порядок тренировок</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {orderedWorkouts.map((w, idx) => (
                  <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'rgba(220,80,0,0.06)', border: '1px solid rgba(220,80,0,0.1)' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '13px', color: '#fff' }}>{LETTERS[idx] || idx + 1}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.title}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button onClick={() => moveUp(idx)} disabled={idx === 0} style={{ background: 'var(--bg-card-soft)', border: 'none', borderRadius: '8px', width: '28px', height: '28px', cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? 'var(--text-tertiary)' : 'var(--accent-primary)', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↑</button>
                      <button onClick={() => moveDown(idx)} disabled={idx === orderedWorkouts.length - 1} style={{ background: 'var(--bg-card-soft)', border: 'none', borderRadius: '8px', width: '28px', height: '28px', cursor: idx === orderedWorkouts.length - 1 ? 'default' : 'pointer', color: idx === orderedWorkouts.length - 1 ? 'var(--text-tertiary)' : 'var(--accent-primary)', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↓</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SAVE */}
          <button
            onClick={handleSave}
            disabled={loading || !title.trim() || orderedWorkouts.length === 0}
            style={{
              width: '100%', padding: '14px', borderRadius: '999px',
              background: title.trim() && orderedWorkouts.length > 0 ? 'var(--accent-primary)' : 'var(--accent-soft-bg)',
              color: '#fff', border: 'none',
              fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '16px',
              cursor: title.trim() && orderedWorkouts.length > 0 && !loading ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Создаём...' : `Создать программу ${orderedWorkouts.length > 0 ? `(${orderedWorkouts.length} тр.)` : ''}`}
          </button>

        </div>
      </div>
    </div>
  )
}
