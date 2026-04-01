'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const bg: React.CSSProperties = {
  background: `
    radial-gradient(ellipse 110% 60% at 50% -5%, #16573a 0%, transparent 65%),
    radial-gradient(ellipse 50% 50% at 100% 100%, #020d07 0%, transparent 55%),
    linear-gradient(170deg, #0b3d28 0%, #051610 100%)
  `,
  minHeight: '100vh',
  padding: '24px',
}

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '24px',
  padding: '28px',
  marginBottom: '12px',
}

const pillBtn: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '999px',
  background: 'rgba(207,167,100,0.72)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: 'none',
  color: '#000000',
  fontFamily: 'Chillax, sans-serif',
  fontWeight: 500,
  fontSize: '14px',
  padding: '10px 24px',
  cursor: 'pointer',
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(8,22,14,0.55)',
  border: 'none',
  borderRadius: '999px',
  padding: '10px 16px',
  fontFamily: 'Chillax, sans-serif',
  fontWeight: 300,
  fontSize: '14px',
  color: '#ffffff',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const label: React.CSSProperties = {
  fontFamily: 'Chillax, sans-serif',
  fontWeight: 300,
  fontSize: '11px',
  letterSpacing: '1.5px',
  textTransform: 'uppercase' as const,
  color: 'rgba(255,255,255,0.35)',
  marginBottom: '6px',
}

const EXERCISES = [
  { id: 'foam', name: 'Миофасциальный релиз', sets: 'Икры · Бёдра · Ягодицы — по 60 сек', badge: 'Разминка', fields: [], why: 'Мышца под напряжением не включается нормально. Нашла больную точку — остановилась, подышала, дала отпустить.' },
  { id: 'ankle', name: 'Вращения голеностопа', sets: '10 кругов на каждую ногу', badge: 'Реабилитация', fields: [], why: 'Голеностоп после перелома деревенеет. Когда он не работает — колено начинает работать за него.' },
  { id: 'glute-bridge', name: 'Ягодичный мост лёжа', sets: '2 × 15 · Пауза наверху', badge: 'Активация', fields: ['reps1', 'reps2'], why: 'Если ягодицы не проснулись — в приседе и тяге они будут спать, а вместо них впашет поясница.' },
  { id: 'bird-dog', name: 'Bird Dog', sets: '2 × 8 на каждую сторону', badge: 'Кор', fields: ['reps1', 'reps2'], why: 'Глубокие мышцы позвоночника. Без них ты не приседаешь — ты складываешься.' },
  { id: 'wall-squat', name: 'Присед у стены', sets: '3 × 30-60 сек', badge: 'Стабилизация', fields: ['t1', 't2', 't3'], why: 'Статическая работа квадрицепса без нагрузки на сустав. Идеально после перелома.' },
  { id: 'box-squat', name: 'Присед на тумбу', sets: '3 × 10 · 3 секунды вниз', badge: 'Основное', fields: ['w1', 'w2', 'w3', 'reps'], why: '3 секунды вниз — это эксцентрика. Именно здесь мышца реально растёт и учится защищать сустав.' },
  { id: 'rdl', name: 'Румынская тяга с гантелями', sets: '3 × 10 · Пауза внизу', badge: 'Основное', fields: ['w1', 'w2', 'w3', 'reps'], why: 'Задняя поверхность бедра и ягодицы — живой бандаж для коленного и тазобедренного сустава.' },
  { id: 'db-press', name: 'Жим гантелей лёжа', sets: '3 × 10 · Локти 45° к телу', badge: 'Новое', fields: ['w1', 'w2', 'w3', 'reps'], why: 'Тело работает по принципу тяни-толкай. Только тяга без жима — дисбаланс и перегруженные плечи.' },
  { id: 'lat-pulldown', name: 'Тяга верхнего блока', sets: '3 × 10-12 · Сначала лопатки', badge: 'Основное', fields: ['w1', 'w2', 'w3', 'reps'], why: 'Не тянуть руками. Сначала лопатки идут вниз и назад — потом руки сгибаются.' },
  { id: 'cable-row', name: 'Тяга горизонтального блока', sets: '3 × 12 · Пауза 1 сек', badge: 'Основное', fields: ['w1', 'w2', 'w3', 'reps'], why: 'Корпус — статичный якорь. Пауза в конечной точке: сжала лопатки — почувствовала спину.' },
  { id: 'abductor', name: 'Разведение ног в тренажёре', sets: '3 × 15 · Возврат 3 секунды', badge: 'Основное', fields: ['w1', 'w2', 'w3', 'reps'], why: 'Секрет — не скорость, а возврат. Медленно возвращаешь ноги назад — именно там растёт средняя ягодица.' },
  { id: 'dead-bug', name: 'Dead Bug', sets: '2 × 8 на каждую сторону', badge: 'Новое', fields: ['reps1', 'reps2'], why: 'Самое честное упражнение на глубокий кор. Поясница не отрывается от пола. Никогда.' },
]

const FIELD_LABELS: Record<string, string> = {
  w1: 'Подход 1, кг', w2: 'Подход 2, кг', w3: 'Подход 3, кг',
  reps: 'Повторы', reps1: 'Подход 1, повторы', reps2: 'Подход 2, повторы',
  t1: 'Подход 1, сек', t2: 'Подход 2, сек', t3: 'Подход 3, сек',
}

const BADGE_COLORS: Record<string, string> = {
  'Разминка': 'rgba(207,167,100,0.2)',
  'Реабилитация': 'rgba(192,57,43,0.2)',
  'Активация': 'rgba(207,167,100,0.15)',
  'Кор': 'rgba(74,124,95,0.25)',
  'Стабилизация': 'rgba(192,57,43,0.15)',
  'Основное': 'rgba(255,255,255,0.08)',
  'Новое': 'rgba(39,174,96,0.2)',
}

export default function WorkoutPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [fields, setFields] = useState<Record<string, Record<string, string>>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/'); return }
      setUserId(data.user.id)
      loadData(supabase, data.user.id)
    })
  }, [])

  async function loadData(supabase: any, uid: string) {
    const { data } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('player', uid)
      .order('saved_at', { ascending: false })

    if (!data) return
    const latestFields: Record<string, Record<string, string>> = {}
    const latestNotes: Record<string, string> = {}
    data.forEach((row: any) => {
      if (!latestFields[row.exercise_id]) {
        latestFields[row.exercise_id] = {
          w1: row.w1 || '', w2: row.w2 || '', w3: row.w3 || '',
          reps: row.reps || '', reps1: row.reps1 || '', reps2: row.reps2 || '',
          t1: row.t1 || '', t2: row.t2 || '', t3: row.t3 || '',
        }
        latestNotes[row.exercise_id] = row.notes || ''
      }
    })
    setFields(latestFields)
    setNotes(latestNotes)
  }

  function toggleCard(id: string) {
    setOpen(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function updateField(exId: string, field: string, value: string) {
    setFields(prev => ({
      ...prev,
      [exId]: { ...prev[exId], [field]: value }
    }))
  }

  async function saveExercise(exId: string) {
    if (!userId) return
    const supabase = createClient()
    const f = fields[exId] || {}
    await supabase.from('workout_logs').insert({
      player: userId,
      exercise_id: exId,
      w1: f.w1 || null, w2: f.w2 || null, w3: f.w3 || null,
      reps: f.reps || null, reps1: f.reps1 || null, reps2: f.reps2 || null,
      t1: f.t1 || null, t2: f.t2 || null, t3: f.t3 || null,
      notes: notes[exId] || null,
    })
    setSaved(prev => ({ ...prev, [exId]: true }))
    setTimeout(() => setSaved(prev => ({ ...prev, [exId]: false })), 2500)
  }

  return (
    <div style={bg}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
          <button onClick={() => router.push('/client')} style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '999px',
            color: 'rgba(255,255,255,0.5)',
            fontFamily: 'Chillax, sans-serif',
            fontWeight: 300,
            fontSize: '13px',
            padding: '8px 18px',
            cursor: 'pointer',
          }}>
            ← Назад
          </button>
          <div>
            <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: '#CFA764', margin: 0 }}>
              Занятие 2
            </p>
            <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, color: '#ffffff', fontSize: '22px', margin: 0, lineHeight: 1.2 }}>
              Без воды. Без сюсюканий.
            </h1>
          </div>
        </div>

        {/* УПРАЖНЕНИЯ */}
        {EXERCISES.map(ex => (
          <div key={ex.id} style={glassCard}>

            {/* ЗАГОЛОВОК КАРТОЧКИ */}
            <div
              onClick={() => toggleCard(ex.id)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer', gap: '12px' }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#CFA764', margin: '0 0 4px' }}>
                  {ex.badge}
                </p>
                <h3 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, color: '#ffffff', fontSize: '20px', margin: '0 0 4px', lineHeight: 1.2 }}>
                  {ex.name}
                </h3>
                <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>
                  {ex.sets}
                </p>
              </div>
              <span style={{
                background: BADGE_COLORS[ex.badge] || 'rgba(255,255,255,0.08)',
                borderRadius: '999px',
                padding: '4px 14px',
                fontFamily: 'Chillax, sans-serif',
                fontWeight: 300,
                fontSize: '11px',
                color: 'rgba(255,255,255,0.6)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                marginTop: '2px',
              }}>
                {open[ex.id] ? '▴' : '▾'}
              </span>
            </div>

            {/* РАСКРЫТОЕ ТЕЛО */}
            {open[ex.id] && (
              <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '20px' }}>

                {/* ПОЧЕМУ */}
                <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: '0 0 20px' }}>
                  {ex.why}
                </p>

                {/* ВИДЕО ЗАГЛУШКА */}
                <div style={{ background: 'rgba(8,22,14,0.6)', borderRadius: '16px', height: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <circle cx="20" cy="20" r="19" stroke="#CFA764" strokeWidth="1.5" strokeOpacity="0.6"/>
                    <polygon points="16,13 30,20 16,27" fill="#CFA764" fillOpacity="0.7"/>
                  </svg>
                  <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>
                    Видео скоро появится
                  </span>
                </div>

                {/* ПОЛЯ */}
                {ex.fields.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: ex.fields.length >= 3 ? '1fr 1fr' : '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    {ex.fields.map(f => (
                      <div key={f}>
                        <p style={label}>{FIELD_LABELS[f]}</p>
                        <input
                          type="number"
                          style={inputStyle}
                          placeholder="—"
                          value={fields[ex.id]?.[f] || ''}
                          onChange={e => updateField(ex.id, f, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* ЗАМЕТКИ */}
                <div style={{ marginBottom: '16px' }}>
                  <p style={label}>Ощущения</p>
                  <textarea
                    style={{ ...inputStyle, borderRadius: '16px', minHeight: '70px', resize: 'vertical', padding: '12px 16px', lineHeight: 1.6 }}
                    placeholder="Как ощущалось? RPE 1-10?"
                    value={notes[ex.id] || ''}
                    onChange={e => setNotes(prev => ({ ...prev, [ex.id]: e.target.value }))}
                  />
                </div>

                {/* КНОПКА СОХРАНИТЬ */}
                <button
                  style={{ ...pillBtn, background: saved[ex.id] ? 'rgba(39,174,96,0.7)' : 'rgba(207,167,100,0.72)', width: '100%', padding: '12px' }}
                  onClick={() => saveExercise(ex.id)}
                >
                  <span style={{ position: 'absolute', inset: 0, borderRadius: '999px', background: 'linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 60%)', pointerEvents: 'none', zIndex: 1 }} />
                  <span style={{ position: 'relative', zIndex: 2 }}>
                    {saved[ex.id] ? '✓ Сохранено' : 'Сохранить'}
                  </span>
                </button>

              </div>
            )}
          </div>
        ))}

      </div>
    </div>
  )
}