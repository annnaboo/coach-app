'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.6)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(0,0,0,0.06)',
  borderRadius: '24px',
  padding: '28px',
}

const EXERCISE_NAMES: Record<string, string> = {
  'foam': 'Миофасциальный релиз', 'ankle': 'Вращения голеностопа',
  'glute-bridge': 'Ягодичный мост', 'bird-dog': 'Bird Dog',
  'wall-squat': 'Присед у стены', 'box-squat': 'Присед на тумбу',
  'rdl': 'Румынская тяга', 'db-press': 'Жим гантелей',
  'lat-pulldown': 'Тяга верхнего блока', 'cable-row': 'Тяга горизонт. блока',
  'abductor': 'Разведение ног', 'dead-bug': 'Dead Bug',
}

type Log = { exercise_id: string; w1?: string; w2?: string; w3?: string; saved_at: string }

function ArtName({ name }: { name: string }) {
  if (!name) return null
  const split = Math.max(1, name.length - 2)
  const main = name.slice(0, split)
  const accent = name.slice(split)
  return (
    <h1 style={{
      fontFamily: 'Epilogue, sans-serif',
      fontWeight: 400,
      fontStyle: 'italic',
      fontSize: '52px',
      lineHeight: 1.0,
      margin: '0 0 4px',
      letterSpacing: '-1px',
    }}>
      <span style={{ color: '#2d1f0e' }}>{main}</span>
      <span style={{ color: '#7a4a20' }}>{accent}</span>
      <span style={{ color: '#7a4a20' }}>.</span>
    </h1>
  )
}

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

export default function ClientPage() {
  const [profile, setProfile] = useState<{ name: string; role: string } | null>(null)
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [weekLogs, setWeekLogs] = useState<string[]>([])
  const [mood, setMood] = useState<number | null>(null)
  const [energy, setEnergy] = useState<number>(5)
  const [musclePain, setMusclePain] = useState<number>(3)
  const [moodSaved, setMoodSaved] = useState(false)
  const [moodLoading, setMoodLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/'); return }

      const { data: prof } = await supabase
        .from('profiles').select('name, role').eq('id', data.user.id).single()

      if (prof?.role === 'coach') { router.push('/coach'); return }

      const { data: workoutLogs } = await supabase
        .from('workout_logs').select('exercise_id, w1, w2, w3, saved_at')
        .eq('player', data.user.id).order('saved_at', { ascending: false })

      // Fetch week logs
      const weekStart = getMonday(new Date())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)
      const { data: wLogs } = await supabase
        .from('workout_logs')
        .select('saved_at')
        .eq('player', data.user.id)
        .gte('saved_at', weekStart.toISOString())
        .lt('saved_at', weekEnd.toISOString())
      const days = [...new Set((wLogs || []).map((l: any) => l.saved_at.slice(0, 10)))]
      setWeekLogs(days)

      // Fetch today's mood
      const today = new Date().toISOString().slice(0, 10)
      const { data: moodData } = await supabase
        .from('mood_logs')
        .select('*')
        .eq('player_id', data.user.id)
        .eq('logged_date', today)
        .single()
      if (moodData) {
        setMood(moodData.mood)
        setEnergy(moodData.energy)
        setMusclePain(moodData.muscle_pain)
        setMoodSaved(true)
      }

      setProfile(prof)
      setLogs(workoutLogs || [])
      setLoading(false)
    })
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  async function saveMood() {
    if (!profile) return
    setMoodLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const today = new Date().toISOString().slice(0, 10)
    await supabase.from('mood_logs').upsert({
      player_id: user.id,
      logged_date: today,
      mood,
      energy,
      muscle_pain: musclePain,
    }, { onConflict: 'player_id,logged_date' })
    setMoodSaved(true)
    setMoodLoading(false)
  }

  // Stats
  const totalSessions = logs.length

  const maxWeights: Record<string, number> = {}
  logs.forEach(log => {
    const maxW = Math.max(
      parseFloat(log.w1 || '0') || 0,
      parseFloat(log.w2 || '0') || 0,
      parseFloat(log.w3 || '0') || 0,
    )
    if (maxW > (maxWeights[log.exercise_id] || 0)) maxWeights[log.exercise_id] = maxW
  })

  const totalKg = Object.values(maxWeights).reduce((a, b) => a + b, 0)

  // Top 3 exercises by max weight for progress bars
  const top3 = Object.entries(maxWeights)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
  const maxBar = top3[0]?.[1] || 1

  if (loading) return (
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
      <div style={{ position: 'relative', zIndex: 1, padding: '32px 24px 48px' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>

          {/* HEADER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '36px' }}>
            <div>
              <ArtName name={profile?.name || ''} />
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.35)', fontSize: '13px', margin: 0 }}>
                Your personal training story
              </p>
            </div>
            <button onClick={handleLogout} style={{
              marginTop: '8px',
              background: 'rgba(0,0,0,0.06)',
              border: 'none',
              borderRadius: '999px',
              color: 'rgba(45,31,14,0.5)',
              fontFamily: 'Chillax, sans-serif',
              fontWeight: 300,
              fontSize: '13px',
              padding: '8px 20px',
              cursor: 'pointer',
            }}>
              Выйти
            </button>
          </div>

          {/* WEEK CALENDAR */}
          <div style={{ ...glassCard, marginBottom: '16px', padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.35)', margin: 0 }}>
                Эта неделя
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day, i) => {
                const monday = getMonday(new Date())
                const date = new Date(monday)
                date.setDate(monday.getDate() + i)
                const dateStr = date.toISOString().slice(0, 10)
                const isToday = dateStr === new Date().toISOString().slice(0, 10)
                const isDone = weekLogs.includes(dateStr)
                return (
                  <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: 'rgba(45,31,14,0.35)' }}>{day}</span>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: isDone ? '#7a4a20' : 'rgba(0,0,0,0.07)',
                      border: isToday ? '2px solid #7a4a20' : '2px solid transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isDone && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />}
                    </div>
                    <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', color: 'rgba(45,31,14,0.3)' }}>{date.getDate()}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* MOOD TRACKER */}
          <div style={{ ...glassCard, marginBottom: '16px', padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.35)', margin: 0 }}>
                Самочувствие
              </p>
              <button
                onClick={saveMood}
                disabled={moodLoading}
                style={{
                  padding: '5px 14px',
                  borderRadius: '999px',
                  background: moodSaved ? 'rgba(122,74,32,0.1)' : '#7a4a20',
                  color: moodSaved ? '#7a4a20' : '#fff',
                  border: moodSaved ? '1px solid rgba(122,74,32,0.2)' : 'none',
                  fontFamily: 'Chillax, sans-serif',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                {moodSaved ? 'Сохранено' : 'Сохранить'}
              </button>
            </div>

            {/* Mood emojis */}
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.5)', margin: '0 0 8px' }}>Настроение</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['😔', '😕', '😐', '🙂', '😄'].map((emoji, i) => (
                  <button
                    key={i}
                    onClick={() => { setMood(i + 1); setMoodSaved(false) }}
                    style={{
                      fontSize: '22px',
                      background: 'none',
                      border: mood === i + 1 ? '2px solid #7a4a20' : '2px solid transparent',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      cursor: 'pointer',
                      transition: 'transform 0.15s',
                      transform: mood === i + 1 ? 'scale(1.2)' : 'scale(1)',
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Energy slider */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.5)', margin: 0 }}>Энергия</p>
                <span style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '14px', color: '#7a4a20' }}>{energy}</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={energy}
                onChange={e => { setEnergy(Number(e.target.value)); setMoodSaved(false) }}
                style={{ width: '100%', accentColor: '#7a4a20', cursor: 'pointer' }}
              />
            </div>

            {/* Muscle pain slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.5)', margin: 0 }}>Боль мышц</p>
                <span style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '14px', color: '#7a4a20' }}>{musclePain}</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={musclePain}
                onChange={e => { setMusclePain(Number(e.target.value)); setMoodSaved(false) }}
                style={{ width: '100%', accentColor: '#7a4a20', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* CURRENT SESSION CARD */}
          <div style={{ ...glassCard, marginBottom: '16px', position: 'relative', overflow: 'hidden' }}>
            {/* Decorative number */}
            <span style={{
              position: 'absolute',
              right: '20px',
              bottom: '-10px',
              fontFamily: 'Epilogue, sans-serif',
              fontWeight: 400,
              fontSize: '120px',
              color: '#2d1f0e',
              opacity: 0.04,
              lineHeight: 1,
              pointerEvents: 'none',
              userSelect: 'none',
            }}>2</span>

            <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.35)', margin: '0 0 10px' }}>
              Текущее занятие
            </p>
            <h2 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, color: '#2d1f0e', fontSize: '28px', margin: '0 0 6px' }}>
              Занятие 2
            </h2>
            <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.4)', fontSize: '14px', margin: '0 0 28px' }}>
              Без воды. Без сюсюканий.
            </p>

            <button
              onClick={() => router.push('/workout/2')}
              style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '999px',
                background: '#7a4a20',
                border: 'none',
                color: '#ffffff',
                fontFamily: 'Chillax, sans-serif',
                fontWeight: 500,
                fontSize: '15px',
                padding: '12px 28px',
                cursor: 'pointer',
              }}
            >
              <span style={{ position: 'absolute', inset: 0, borderRadius: '999px', background: 'linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 60%)', pointerEvents: 'none', zIndex: 1 }} />
              <span style={{ position: 'relative', zIndex: 2 }}>Открыть тренировку</span>
            </button>
          </div>

          {/* STATS GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{ ...glassCard, padding: '22px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, color: '#2d1f0e', fontSize: '40px', margin: '0 0 6px', lineHeight: 1 }}>
                {totalSessions}
              </p>
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.4)', fontSize: '11px', margin: 0, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                Занятий всего
              </p>
            </div>
            <div style={{ ...glassCard, padding: '22px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, color: '#2d1f0e', fontSize: '40px', margin: '0 0 6px', lineHeight: 1 }}>
                {Math.round(totalKg)}
              </p>
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.4)', fontSize: '11px', margin: 0, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                Прогресс в кг
              </p>
            </div>
          </div>

          {/* PROGRESS BARS */}
          <div style={glassCard}>
            <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.35)', margin: '0 0 20px' }}>
              Топ упражнений
            </p>

            {top3.length === 0 ? (
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.35)', fontSize: '14px', textAlign: 'center', padding: '16px 0', margin: 0 }}>
                Заполни первую тренировку —<br />здесь появятся твои результаты
              </p>
            ) : (
              top3.map(([exId, weight]) => (
                <div key={exId} style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
                    <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', color: 'rgba(45,31,14,0.7)' }}>
                      {EXERCISE_NAMES[exId] || exId}
                    </span>
                    <span style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '14px', color: '#7a4a20' }}>
                      {weight} кг
                    </span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      borderRadius: '999px',
                      width: `${(weight / maxBar) * 100}%`,
                      background: 'linear-gradient(90deg, rgba(122,74,32,0.6) 0%, #7a4a20 100%)',
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* REPORT BUTTON */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
            <button
              onClick={() => router.push('/report')}
              style={{
                padding: '10px 24px',
                borderRadius: '999px',
                background: 'rgba(122,74,32,0.1)',
                border: '1px solid rgba(122,74,32,0.2)',
                color: '#7a4a20',
                fontFamily: 'Chillax, sans-serif',
                fontWeight: 300,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Отчёт недели →
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
