'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'
import { glassCard } from '@/lib/design/tokens'

const glass: React.CSSProperties = {
  ...glassCard,
  padding: '18px 20px',
  marginBottom: '10px',
}

type Program = {
  id: string
  title: string
  start_date: string
  end_date: string | null
  assigned_to: string[] | null
  workout_ids: string[] | null
  is_active: boolean
  created_at: string
}

type ClientProfile = { id: string; name: string }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [clients, setClients] = useState<ClientProfile[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/'); return }
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
      if (prof?.role !== 'coach') { router.push('/client'); return }

      const [programsRes, clientsRes] = await Promise.all([
        supabase.from('programs').select('*').eq('created_by', data.user.id).order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, name').eq('role', 'client'),
      ])

      setPrograms(programsRes.data || [])
      setClients(clientsRes.data || [])
      setLoading(false)
    })
  }, [])

  async function deleteProgram(id: string, title: string) {
    if (!confirm(`Удалить программу "${title}"? Это действие нельзя отменить.`)) return
    const supabase = createClient()
    const { error } = await supabase.from('programs').delete().eq('id', id)
    if (error) { alert('Ошибка: ' + error.message); return }
    setPrograms(prev => prev.filter(p => p.id !== id))
  }

  async function duplicateProgram(prog: Program) {
    const supabase = createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) return
    const { data, error } = await supabase.from('programs').insert({
      title: `${prog.title} (копия)`,
      workout_ids: prog.workout_ids || [],
      assigned_to: [],
      start_date: prog.start_date,
      end_date: prog.end_date,
      is_active: false,
      created_by: authData.user.id,
    }).select().single()
    if (!error && data) setPrograms(prev => [data as Program, ...prev])
  }

  async function toggleActive(prog: Program) {
    const supabase = createClient()
    await supabase.from('programs').update({ is_active: !prog.is_active }).eq('id', prog.id)
    setPrograms(prev => prev.map(p => p.id === prog.id ? { ...p, is_active: !p.is_active } : p))
  }

  function getAssignedNames(prog: Program): string {
    if (!prog.assigned_to || prog.assigned_to.length === 0) return 'Никому не назначена'
    return prog.assigned_to.map(id => clients.find(c => c.id === id)?.name || '…').join(', ')
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
              <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--text-primary)', fontSize: '24px', margin: 0 }}>Программы</h1>
              <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-secondary)', margin: 0 }}>{programs.length} создано</p>
            </div>
            <button
              onClick={() => router.push('/coach/programs/new')}
              style={{ marginLeft: 'auto', padding: '9px 18px', borderRadius: '999px', background: 'var(--accent-primary)', color: '#fff', border: 'none', fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}
            >
              + Создать
            </button>
          </div>

          {programs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <p style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--text-primary)', fontSize: '20px', margin: '0 0 8px' }}>Нет программ</p>
              <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '14px', color: 'var(--text-tertiary)', margin: '0 0 20px' }}>Создай первую программу тренировок</p>
              <button
                onClick={() => router.push('/coach/programs/new')}
                style={{ padding: '12px 28px', borderRadius: '999px', background: 'var(--accent-primary)', color: '#fff', border: 'none', fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '14px', cursor: 'pointer' }}
              >
                Создать программу
              </button>
            </div>
          ) : (
            programs.map(prog => (
              <div key={prog.id} style={glass}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--text-primary)', fontSize: '16px', margin: 0 }}>{prog.title}</h3>
                      <span style={{
                        fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '10px',
                        padding: '2px 8px', borderRadius: '999px',
                        background: prog.is_active ? 'var(--success-bg)' : 'var(--bg-card-soft)',
                        color: prog.is_active ? 'var(--success)' : 'var(--text-tertiary)',
                      }}>
                        {prog.is_active ? 'Активна' : 'Неактивна'}
                      </span>
                    </div>

                    <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 4px' }}>
                      👤 {getAssignedNames(prog)}
                    </p>

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {prog.start_date && (
                        <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '10px', color: 'var(--text-tertiary)' }}>
                          {fmtDate(prog.start_date)}{prog.end_date ? ` — ${fmtDate(prog.end_date)}` : ''}
                        </span>
                      )}
                      {prog.workout_ids && (
                        <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '10px', color: 'var(--text-tertiary)' }}>
                          {prog.workout_ids.length} тр.
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                    <button
                      onClick={() => duplicateProgram(prog)}
                      style={{ padding: '5px 12px', borderRadius: '999px', background: 'var(--bg-card-soft)', border: '1px solid var(--divider)', color: 'var(--text-secondary)', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Копия
                    </button>
                    <button
                      onClick={() => router.push(`/coach/programs/edit/${prog.id}`)}
                      style={{ padding: '5px 12px', borderRadius: '999px', background: 'var(--accent-primary)', color: '#fff', border: 'none', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      ✏️ Изменить
                    </button>
                    <button
                      onClick={() => toggleActive(prog)}
                      style={{ padding: '5px 12px', borderRadius: '999px', background: prog.is_active ? 'var(--bg-card-soft)' : 'var(--success-bg)', border: prog.is_active ? '1px solid rgba(0,0,0,0.1)' : '1px solid var(--divider)', color: prog.is_active ? 'var(--text-secondary)' : 'var(--success)', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      {prog.is_active ? 'Деактивировать' : 'Активировать'}
                    </button>
                    <button
                      onClick={() => deleteProgram(prog.id, prog.title)}
                      style={{ padding: '5px 12px', borderRadius: '999px', background: 'rgba(138,37,32,0.08)', border: '1px solid rgba(138,37,32,0.15)', color: 'var(--error)', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', cursor: 'pointer' }}
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
