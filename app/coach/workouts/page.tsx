'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'
import { fmtDate } from '@/lib/utils'

const glass: React.CSSProperties = {
  background: 'var(--bg-card)',
      border: '1px solid var(--divider)',
  borderRadius: 'var(--radius-md)',
  padding: '18px 20px',
  marginBottom: '10px',
}

type Workout = {
  id: string
  title: string
  subtitle: string | null
  assigned_to_multiple: string[] | null
  created_at: string
  exercises: any[] | null
}

type ClientProfile = { id: string; name: string }

export default function AllWorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [clients, setClients] = useState<ClientProfile[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/'); return }
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
      if (prof?.role !== 'coach') { router.push('/client'); return }

      const [workoutsRes, clientsRes] = await Promise.all([
        supabase.from('workouts').select('id, title, subtitle, assigned_to_multiple, created_at, exercises').eq('created_by', data.user.id).order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, name').eq('role', 'client'),
      ])

      setWorkouts(workoutsRes.data || [])
      setClients(clientsRes.data || [])
      setLoading(false)
    })
  }, [])

  async function deleteWorkout(id: string, title: string) {
    if (!confirm(`Удалить тренировку "${title}"? Это действие нельзя отменить.`)) return
    const supabase = createClient()
    const { error } = await supabase.from('workouts').delete().eq('id', id)
    if (error) { alert('Ошибка: ' + error.message); return }
    setWorkouts(prev => prev.filter(w => w.id !== id))
  }

  function getAssignedLabel(w: Workout): string {
    if (!w.assigned_to_multiple || w.assigned_to_multiple.length === 0) return 'Для всех'
    const names = w.assigned_to_multiple
      .map(id => clients.find(c => c.id === id)?.name || '...')
      .join(', ')
    return names
  }

  if (loading) return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ fontFamily: 'var(--font-text)', color: 'var(--text-tertiary)', fontSize: '16px' }}>Загружаем...</p>
      </div>
    </div>
  )

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, padding: '28px 20px 60px' }}>
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>

          {/* HEADER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
            <button
              onClick={() => router.push('/coach')}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--divider)', borderRadius: '999px', color: 'var(--text-secondary)', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', padding: '8px 18px', cursor: 'pointer', flexShrink: 0 }}
            >
              ← назад
            </button>
            <div>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--text-primary)', fontSize: '24px', margin: 0 }}>Тренировки</h1>
              <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>{workouts.length} создано</p>
            </div>
            <button
              onClick={() => router.push('/coach/workout/new')}
              style={{ marginLeft: 'auto', padding: '9px 18px', borderRadius: '999px', background: 'var(--accent-primary)', color: '#fff', border: 'none', fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}
            >
              + Создать
            </button>
          </div>

          {workouts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <p style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--text-primary)', fontSize: '20px', margin: '0 0 8px' }}>Нет тренировок</p>
              <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '14px', color: 'var(--text-tertiary)', margin: '0 0 20px' }}>Создай первую тренировку для клиентов</p>
            </div>
          ) : (
            workouts.map(w => (
              <div key={w.id} style={glass}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--text-primary)', fontSize: '16px', margin: '0 0 3px' }}>{w.title}</h3>
                    {w.subtitle && <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '12px', color: 'var(--text-tertiary)', margin: '0 0 8px' }}>{w.subtitle}</p>}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '10px', color: 'var(--text-tertiary)', background: 'var(--bg-card-soft)', borderRadius: '999px', padding: '3px 10px' }}>
                        👤 {getAssignedLabel(w)}
                      </span>
                      {w.exercises && (
                        <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '10px', color: 'var(--text-tertiary)' }}>
                          {w.exercises.length} упр.
                        </span>
                      )}
                      <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '10px', color: 'var(--text-tertiary)' }}>
                        {fmtDate(w.created_at)}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginLeft: '12px' }}>
                    <button
                      onClick={() => router.push(`/coach/workout/edit/${w.id}`)}
                      style={{ background: 'var(--accent-soft-bg)', border: '1px solid rgba(220,80,0,0.15)', borderRadius: '999px', color: 'var(--accent-primary)', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '12px', padding: '5px 12px', cursor: 'pointer' }}
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => deleteWorkout(w.id, w.title)}
                      style={{ background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.15)', borderRadius: '999px', color: 'var(--error)', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '12px', padding: '5px 12px', cursor: 'pointer' }}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

        </div>
      </div>
    </div>
  )
}
