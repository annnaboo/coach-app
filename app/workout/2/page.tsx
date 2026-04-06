'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'

const WARMUP_IDS = ['foam', 'ankle', 'glute-bridge', 'bird-dog', 'wall-squat']

const EXERCISES = [
  { id: 'foam',         name: 'Миофасциальный релиз',       muscle: 'Всё тело',                      sets: 'Икры · Бёдра · Ягодицы — по 60 сек',  badge: 'Разминка',      fields: [] as string[], why: 'Мышца под напряжением не включается нормально. Нашла больную точку — остановилась, подышала, дала отпустить.' },
  { id: 'ankle',        name: 'Вращения голеностопа',        muscle: 'Голеностоп',                    sets: '10 кругов на каждую ногу',             badge: 'Реабилитация',  fields: [] as string[], why: 'Голеностоп после перелома деревенеет. Когда он не работает — колено начинает работать за него.' },
  { id: 'glute-bridge', name: 'Ягодичный мост лёжа',        muscle: 'Ягодицы · Кор',                 sets: '2 × 15 · Пауза наверху',               badge: 'Активация',     fields: ['reps1', 'reps2'], why: 'Если ягодицы не проснулись — в приседе и тяге они будут спать, а вместо них впашет поясница.' },
  { id: 'bird-dog',     name: 'Bird Dog',                   muscle: 'Кор · Позвоночник',             sets: '2 × 8 на каждую сторону',              badge: 'Кор',           fields: ['reps1', 'reps2'], why: 'Глубокие мышцы позвоночника. Без них ты не приседаешь — ты складываешься.' },
  { id: 'wall-squat',   name: 'Присед у стены',             muscle: 'Квадрицепс · Ягодицы',          sets: '3 × 30-60 сек',                        badge: 'Стабилизация',  fields: ['t1', 't2', 't3'], why: 'Статическая работа квадрицепса без нагрузки на сустав. Идеально после перелома.' },
  { id: 'box-squat',    name: 'Присед на тумбу',            muscle: 'Квадрицепс · Ягодицы',          sets: '3 × 10 · 3 секунды вниз',              badge: 'Основное',      fields: ['w1', 'w2', 'w3', 'reps'], why: '3 секунды вниз — это эксцентрика. Именно здесь мышца реально растёт.' },
  { id: 'rdl',          name: 'Румынская тяга',             muscle: 'Задняя поверхность · Ягодицы',  sets: '3 × 10 · Пауза внизу',                badge: 'Основное',      fields: ['w1', 'w2', 'w3', 'reps'], why: 'Задняя поверхность бедра и ягодицы — живой бандаж для сустава.' },
  { id: 'db-press',     name: 'Жим гантелей лёжа',         muscle: 'Грудь · Плечи',                 sets: '3 × 10 · Локти 45°',                   badge: 'Новое',         fields: ['w1', 'w2', 'w3', 'reps'], why: 'Тело работает по принципу тяни-толкай. Только тяга без жима — дисбаланс.' },
  { id: 'lat-pulldown', name: 'Тяга верхнего блока',        muscle: 'Широчайшие · Спина',            sets: '3 × 10-12 · Сначала лопатки',          badge: 'Основное',      fields: ['w1', 'w2', 'w3', 'reps'], why: 'Не тянуть руками. Сначала лопатки идут вниз и назад — потом руки.' },
  { id: 'cable-row',    name: 'Тяга горизонтального блока', muscle: 'Спина · Бицепс',                sets: '3 × 12 · Пауза 1 сек',                badge: 'Основное',      fields: ['w1', 'w2', 'w3', 'reps'], why: 'Корпус — статичный якорь. Пауза: сжала лопатки — почувствовала спину.' },
  { id: 'abductor',     name: 'Разведение ног в тренажёре', muscle: 'Средняя ягодица',               sets: '3 × 15 · Возврат 3 сек',               badge: 'Основное',      fields: ['w1', 'w2', 'w3', 'reps'], why: 'Секрет — не скорость, а возврат. Медленно назад — именно там растёт средняя ягодица.' },
  { id: 'dead-bug',     name: 'Dead Bug',                   muscle: 'Кор · Стабилизация',            sets: '2 × 8 на каждую сторону',              badge: 'Новое',         fields: ['reps1', 'reps2'], why: 'Самое честное упражнение на глубокий кор. Поясница не отрывается от пола. Никогда.' },
]

const FIELD_LABELS: Record<string, string> = {
  w1: 'П1 кг', w2: 'П2 кг', w3: 'П3 кг',
  reps: 'Повторы', reps1: 'П1 повт', reps2: 'П2 повт',
  t1: 'П1 сек', t2: 'П2 сек', t3: 'П3 сек',
}

function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '8px 0 12px' }}>
      <div style={{ flex: 1, height: '1px', background: 'rgba(0,0,0,0.08)' }} />
      <span style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase' as const, color: 'rgba(45,31,14,0.25)', fontFamily: 'Chillax, sans-serif', fontWeight: 300, whiteSpace: 'nowrap' as const }}>
        {label}
      </span>
      <div style={{ flex: 1, height: '1px', background: 'rgba(0,0,0,0.08)' }} />
    </div>
  )
}

function LiquidField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <span style={{ fontSize: '10px', color: 'rgba(45,31,14,0.3)', letterSpacing: '1px', textTransform: 'uppercase' as const, paddingLeft: '12px', fontFamily: 'Chillax, sans-serif', fontWeight: 300 }}>
        {label}
      </span>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="—"
        className="no-spin"
        style={{ background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '999px', padding: '10px 16px', textAlign: 'center' as const, width: '100%', fontFamily: 'Chillax, sans-serif', fontSize: '15px', color: '#2d1f0e', outline: 'none', boxSizing: 'border-box' as const }}
      />
    </div>
  )
}

export default function WorkoutPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [videoOpen, setVideoOpen] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [fields, setFields] = useState<Record<string, Record<string, string>>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/'); return }
      setUserId(data.user.id)
      const { data: logs } = await supabase.from('workout_logs').select('*').eq('player', data.user.id).order('saved_at', { ascending: false })
      if (!logs) return
      const latest: Record<string, Record<string, string>> = {}
      const savedSet: Record<string, boolean> = {}
      logs.forEach((row: any) => {
        if (!latest[row.exercise_id]) {
          latest[row.exercise_id] = { w1: row.w1||'', w2: row.w2||'', w3: row.w3||'', reps: row.reps||'', reps1: row.reps1||'', reps2: row.reps2||'', t1: row.t1||'', t2: row.t2||'', t3: row.t3||'' }
          savedSet[row.exercise_id] = true
        }
      })
      setFields(latest)
      setSaved(savedSet)
    })
  }, [])

  function updateField(exId: string, field: string, value: string) {
    setFields(prev => ({ ...prev, [exId]: { ...prev[exId], [field]: value } }))
    setSaved(prev => ({ ...prev, [exId]: false }))
  }

  async function saveExercise(exId: string) {
    if (!userId) return
    const supabase = createClient()
    const f = fields[exId] || {}

    const { error } = await supabase.from('workout_logs').upsert({
      player: userId,
      exercise_id: exId,
      w1: parseFloat(f.w1 || '') || null,
      w2: parseFloat(f.w2 || '') || null,
      w3: parseFloat(f.w3 || '') || null,
      reps: parseInt(f.reps || '') || null,
      saved_at: new Date().toISOString(),
    }, { onConflict: 'player,exercise_id' })

    if (!error) {
      setSaved(prev => ({ ...prev, [exId]: true }))
    }
  }

  const doneCount = Object.values(saved).filter(Boolean).length
  const warmup = EXERCISES.filter(e => WARMUP_IDS.includes(e.id))
  const main = EXERCISES.filter(e => !WARMUP_IDS.includes(e.id))

  // Highlight number parts (digits + × · numbers) in sets string
  function highlightSets(sets: string) {
    const parts = sets.split(/(\d[\d\-\/]*(?:\s*[×·]\s*\d[\d\-\/]*)*)/)
    return parts.map((part, i) =>
      /\d/.test(part)
        ? <span key={i} style={{ color: '#7a4a20', fontWeight: 400 }}>{part}</span>
        : <span key={i}>{part}</span>
    )
  }

  function renderExercise(ex: typeof EXERCISES[0]) {
    const isDone = saved[ex.id]
    const isOpen = !isDone || expanded[ex.id]
    const isVideoOpen = videoOpen[ex.id]
    const f = fields[ex.id] || {}

    function toggleExpand() {
      if (isDone) setExpanded(prev => ({ ...prev, [ex.id]: !prev[ex.id] }))
    }

    return (
      <div key={ex.id} style={{
        background: 'white',
        border: `1px solid ${isDone && !expanded[ex.id] ? 'rgba(122,74,32,0.15)' : 'rgba(0,0,0,0.06)'}`,
        borderRadius: '20px',
        overflow: 'hidden',
        marginBottom: '10px',
        transition: 'opacity 0.3s, border-color 0.3s',
        opacity: isDone && !expanded[ex.id] ? 0.55 : 1,
      }}>
        {/* HEADER — clickable if done */}
        <div
          onClick={toggleExpand}
          style={{ padding: '14px 18px 10px', display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: isDone ? 'pointer' : 'default' }}
        >
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7a4a20', margin: '0 0 2px' }}>{ex.badge}</p>
            <h3 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, color: '#2d1f0e', fontSize: '17px', margin: '0 0 6px' }}>{ex.name}</h3>
            <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.5)', fontSize: '12px', margin: 0 }}>
              {highlightSets(ex.sets)}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
            {/* Muscle tag — top right, liquid */}
            <span style={{
              display: 'inline-flex',
              background: 'rgba(122,74,32,0.1)',
              backdropFilter: 'blur(6px)',
              borderRadius: '999px',
              padding: '3px 10px',
              fontSize: '10px',
              color: '#7a4a20',
              fontFamily: 'Chillax, sans-serif',
              fontWeight: 300,
              border: '1px solid rgba(122,74,32,0.18)',
              whiteSpace: 'nowrap' as const,
            }}>
              {ex.muscle}
            </span>
            {/* Done badge */}
            {isDone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(122,74,32,0.08)', border: '1px solid rgba(122,74,32,0.2)', borderRadius: '999px', padding: '3px 10px' }}>
                <div style={{ width: '5px', height: '5px', background: '#7a4a20', borderRadius: '50%' }} />
                <span style={{ fontFamily: 'Chillax, sans-serif', fontSize: '10px', color: '#7a4a20' }}>
                  {expanded[ex.id] ? 'Свернуть' : 'Готово'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* BODY */}
        {isOpen && (
          <div style={{ padding: '4px 18px 16px' }}>
            <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.45)', lineHeight: 1.65, margin: '0 0 14px' }}>{ex.why}</p>

            <button onClick={() => setVideoOpen(prev => ({ ...prev, [ex.id]: !prev[ex.id] }))} style={{ width: '100%', background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'rgba(45,31,14,0.4)', fontFamily: 'Chillax, sans-serif', fontSize: '12px', fontWeight: 300, marginBottom: '10px', boxSizing: 'border-box' }}>
              <div style={{ width: '26px', height: '26px', background: 'rgba(122,74,32,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polygon points="2,1 9,5 2,9" fill="#7a4a20"/></svg>
              </div>
              Посмотреть технику
              <span style={{ marginLeft: 'auto' }}>{isVideoOpen ? '▴' : '▾'}</span>
            </button>

            {isVideoOpen && (
              <div style={{ background: 'rgba(0,0,0,0.04)', borderRadius: '12px', height: '130px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '10px' }}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="15" stroke="#7a4a20" strokeWidth="1" strokeOpacity="0.4"/><polygon points="13,10 24,16 13,22" fill="#7a4a20" fillOpacity="0.5"/></svg>
                <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.3)' }}>Видео скоро появится</span>
              </div>
            )}

            {ex.fields.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(ex.fields.length, 3)}, 1fr)`, gap: '8px', marginBottom: '12px' }}>
                {ex.fields.map(fk => (
                  <LiquidField key={fk} label={FIELD_LABELS[fk]} value={f[fk] || ''} onChange={v => updateField(ex.id, fk, v)} />
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => { saveExercise(ex.id); setExpanded(prev => ({ ...prev, [ex.id]: false })) }} style={{ padding: '8px 20px', borderRadius: '999px', background: '#7a4a20', color: '#fff', fontSize: '12px', border: 'none', cursor: 'pointer', fontFamily: 'Chillax, sans-serif', fontWeight: 500 }}>
                Выполнено
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, padding: '24px 16px 48px' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
            <button onClick={() => router.push('/client')} style={{ background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '999px', color: 'rgba(45,31,14,0.5)', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', padding: '8px 18px', cursor: 'pointer', flexShrink: 0 }}>
              назад
            </button>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.4)', margin: 0 }}>Занятие 2</p>
              <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, color: '#2d1f0e', fontSize: '20px', margin: 0 }}>Без воды. Без сюсюканий.</h1>
            </div>
            <div style={{ background: 'rgba(122,74,32,0.1)', borderRadius: '999px', padding: '6px 14px', flexShrink: 0 }}>
              <span style={{ fontFamily: 'Chillax, sans-serif', fontSize: '13px', color: '#7a4a20' }}>{doneCount}/{EXERCISES.length}</span>
            </div>
          </div>

          <Divider label="Разминка" />
          {warmup.map(renderExercise)}

          <Divider label="Основная работа" />
          {main.map(renderExercise)}
        </div>
      </div>
    </div>
  )
}
