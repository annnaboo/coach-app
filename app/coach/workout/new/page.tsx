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

type Exercise = {
  id: string
  name: string
  muscleGroup: string
  sets: string
  reps: string
  description: string
  youtube: string
}

function newExercise(): Exercise {
  return { id: Math.random().toString(36).slice(2), name: '', muscleGroup: '', sets: '', reps: '', description: '', youtube: '' }
}

type ClientProfile = { id: string; name: string }

export default function NewWorkoutPage() {
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [assignedToMultiple, setAssignedToMultiple] = useState<string[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([newExercise()])
  const [clients, setClients] = useState<ClientProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/'); return }
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
      if (prof?.role !== 'coach') { router.push('/client'); return }

      const { data: clientsList } = await supabase.from('profiles').select('id, name').eq('role', 'client').order('name')
      setClients(clientsList || [])
      setAuthChecked(true)
    })
  }, [])

  function updateExercise(id: string, field: keyof Exercise, value: string) {
    setExercises(prev => prev.map(ex => ex.id === id ? { ...ex, [field]: value } : ex))
  }

  function removeExercise(id: string) {
    setExercises(prev => prev.filter(ex => ex.id !== id))
  }

  async function handleSave() {
    if (!title.trim()) return
    setLoading(true)
    const supabase = createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) { setLoading(false); return }

    const exercisesPayload = exercises
      .filter(ex => ex.name.trim())

    const { error } = await supabase.from('workouts').insert({
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      exercises: exercisesPayload,
      assigned_to_multiple: assignedToMultiple,
      created_by: authData.user.id,
      is_active: true,
    })

    if (error) { alert('Ошибка: ' + error.message); setLoading(false); return }
    router.push('/coach/workouts')
  }

  if (!authChecked) return (
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
              style={{
                background: 'var(--bg-card)',                 border: '1px solid var(--divider)', borderRadius: '999px',
                color: 'var(--text-secondary)', fontFamily: 'var(--font-text)',
                fontWeight: 300, fontSize: '13px', padding: '8px 18px', cursor: 'pointer', flexShrink: 0,
              }}
            >
              ← назад
            </button>
            <div>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--text-primary)', fontSize: '26px', margin: 0 }}>
                Новая тренировка
              </h1>
              <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, color: 'var(--text-tertiary)', fontSize: '11px', margin: 0, letterSpacing: '1px' }}>
                Заполни и сохрани
              </p>
            </div>
          </div>

          {/* BASIC INFO */}
          <div style={glass}>
            <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '0 0 16px' }}>Занятие</p>

            <div style={{ marginBottom: '14px' }}>
              <span style={fieldLabel}>Название</span>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Занятие 3" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <span style={fieldLabel}>Подзаголовок</span>
              <input type="text" value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Работаем над спиной" style={inputStyle} />
            </div>

            <div>
              <span style={fieldLabel}>Назначить клиентам</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={assignedToMultiple.length === 0}
                    onChange={() => setAssignedToMultiple([])}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                  />
                  <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '14px', color: 'var(--text-primary)' }}>Для всех клиентов</span>
                </label>
                {clients.map(c => (
                  <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={assignedToMultiple.includes(c.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setAssignedToMultiple(prev => [...prev, c.id])
                        } else {
                          setAssignedToMultiple(prev => prev.filter(id => id !== c.id))
                        }
                      }}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                    />
                    <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '14px', color: 'var(--text-primary)' }}>{c.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* EXERCISES */}
          <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '8px 0 12px' }}>
            Упражнения
          </p>

          {exercises.map((ex, idx) => (
            <div key={ex.id} style={{ ...glass, position: 'relative' }}>
              <span style={{ position: 'absolute', top: '18px', left: '22px', fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: '11px', color: 'var(--text-tertiary)' }}>
                {String(idx + 1).padStart(2, '0')}
              </span>

              {exercises.length > 1 && (
                <button
                  onClick={() => removeExercise(ex.id)}
                  style={{ position: 'absolute', top: '14px', right: '16px', background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: '18px', cursor: 'pointer', padding: '4px', lineHeight: 1 }}
                >
                  ✕
                </button>
              )}

              <div style={{ paddingLeft: '28px' }}>
                <div style={{ marginBottom: '10px' }}>
                  <span style={fieldLabel}>Название упражнения</span>
                  <input type="text" value={ex.name} onChange={e => updateExercise(ex.id, 'name', e.target.value)} placeholder="Румынская тяга" style={inputStyle} />
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <span style={fieldLabel}>Группа мышц</span>
                  <input type="text" value={ex.muscleGroup} onChange={e => updateExercise(ex.id, 'muscleGroup', e.target.value)} placeholder="Бицепс бедра" style={inputStyle} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <span style={fieldLabel}>Подходы</span>
                    <input type="text" value={ex.sets} onChange={e => updateExercise(ex.id, 'sets', e.target.value)} placeholder="3" style={inputStyle} />
                  </div>
                  <div>
                    <span style={fieldLabel}>Повторы</span>
                    <input type="text" value={ex.reps} onChange={e => updateExercise(ex.id, 'reps', e.target.value)} placeholder="12" style={inputStyle} />
                  </div>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <span style={fieldLabel}>Описание / почему</span>
                  <textarea
                    value={ex.description}
                    onChange={e => updateExercise(ex.id, 'description', e.target.value)}
                    placeholder="Укрепляет заднюю цепь, улучшает стабильность поясницы"
                    rows={2}
                    style={{ ...inputStyle, borderRadius: 'var(--radius-md)', resize: 'none', lineHeight: 1.55 }}
                  />
                </div>

                <div>
                  <span style={fieldLabel}>YouTube</span>
                  <input type="url" value={ex.youtube} onChange={e => updateExercise(ex.id, 'youtube', e.target.value)} placeholder="https://youtube.com/..." style={inputStyle} />
                </div>
              </div>
            </div>
          ))}

          {/* ADD EXERCISE */}
          <button
            onClick={() => setExercises(prev => [...prev, newExercise()])}
            style={{
              width: '100%', padding: '13px', borderRadius: '999px',
              background: 'var(--accent-soft-bg)', border: '1px dashed rgba(220,80,0,0.18)',
              color: 'var(--accent-primary)', fontFamily: 'var(--font-text)', fontWeight: 300,
              fontSize: '14px', cursor: 'pointer', marginBottom: '16px',
            }}
          >
            + Добавить упражнение
          </button>

          {/* SAVE */}
          <button
            onClick={handleSave}
            disabled={loading || !title.trim()}
            style={{
              width: '100%', padding: '14px', borderRadius: '999px',
              background: title.trim() ? 'var(--accent-primary)' : 'var(--accent-soft-bg)',
              color: '#fff', border: 'none',
              fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '16px',
              cursor: title.trim() && !loading ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Сохраняем...' : 'Сохранить тренировку'}
          </button>

        </div>
      </div>
    </div>
  )
}
