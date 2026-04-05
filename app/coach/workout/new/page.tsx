'use client'
import { useState, useEffect } from 'react'
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

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(0,0,0,0.05)',
  border: 'none',
  borderRadius: '12px',
  padding: '11px 14px',
  fontFamily: 'Chillax, sans-serif',
  fontWeight: 300,
  fontSize: '14px',
  color: '#2d1f0e',
  outline: 'none',
  boxSizing: 'border-box',
}

const fieldLabel: React.CSSProperties = {
  fontFamily: 'Chillax, sans-serif',
  fontWeight: 300,
  fontSize: '11px',
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: 'rgba(45,31,14,0.4)',
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
  const [assignedTo, setAssignedTo] = useState<string>('all')
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
      .map(({ id: _, ...rest }) => rest)

    await supabase.from('workouts').insert({
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      exercises: exercisesPayload,
      assigned_to: assignedTo === 'all' ? null : assignedTo,
      created_by: authData.user.id,
    })

    router.push('/coach')
  }

  if (!authChecked) return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ fontFamily: 'Chillax, sans-serif', color: 'rgba(45,31,14,0.4)', fontSize: '16px' }}>Загружаем...</p>
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
                background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.7)', borderRadius: '999px',
                color: 'rgba(45,31,14,0.5)', fontFamily: 'Chillax, sans-serif',
                fontWeight: 300, fontSize: '13px', padding: '8px 18px', cursor: 'pointer', flexShrink: 0,
              }}
            >
              ← назад
            </button>
            <div>
              <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, color: '#2d1f0e', fontSize: '26px', margin: 0 }}>
                Новая тренировка
              </h1>
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.35)', fontSize: '11px', margin: 0, letterSpacing: '1px' }}>
                Заполни и сохрани
              </p>
            </div>
          </div>

          {/* BASIC INFO */}
          <div style={glass}>
            <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.35)', margin: '0 0 16px' }}>Занятие</p>

            <div style={{ marginBottom: '14px' }}>
              <span style={fieldLabel}>Название</span>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Занятие 3" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <span style={fieldLabel}>Подзаголовок</span>
              <input type="text" value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Работаем над спиной" style={inputStyle} />
            </div>

            <div>
              <span style={fieldLabel}>Назначить клиенту</span>
              <select
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                style={{
                  ...inputStyle,
                  borderRadius: '999px',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  cursor: 'pointer',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l5 5 5-5' stroke='rgba(45,31,14,0.35)' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 14px center',
                  paddingRight: '36px',
                }}
              >
                <option value="all">Для всех</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* EXERCISES */}
          <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.35)', margin: '8px 0 12px' }}>
            Упражнения
          </p>

          {exercises.map((ex, idx) => (
            <div key={ex.id} style={{ ...glass, position: 'relative' }}>
              <span style={{ position: 'absolute', top: '18px', left: '22px', fontFamily: 'Epilogue, sans-serif', fontWeight: 300, fontSize: '11px', color: 'rgba(45,31,14,0.3)' }}>
                {String(idx + 1).padStart(2, '0')}
              </span>

              {exercises.length > 1 && (
                <button
                  onClick={() => removeExercise(ex.id)}
                  style={{ position: 'absolute', top: '14px', right: '16px', background: 'none', border: 'none', color: 'rgba(45,31,14,0.25)', fontSize: '18px', cursor: 'pointer', padding: '4px', lineHeight: 1 }}
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
                    style={{ ...inputStyle, borderRadius: '12px', resize: 'none', lineHeight: 1.55 }}
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
              background: 'rgba(122,74,32,0.08)', border: '1px dashed rgba(122,74,32,0.25)',
              color: '#7a4a20', fontFamily: 'Chillax, sans-serif', fontWeight: 300,
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
              background: title.trim() ? '#7a4a20' : 'rgba(122,74,32,0.3)',
              color: '#fff', border: 'none',
              fontFamily: 'Chillax, sans-serif', fontWeight: 500, fontSize: '16px',
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
