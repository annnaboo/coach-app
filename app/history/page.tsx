'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'

const card: React.CSSProperties = {
  borderBottom: '1px solid rgba(45,31,14,0.08)',
  padding: '28px 0',
}

const LABEL: React.CSSProperties = {
  fontFamily: 'Chillax, sans-serif',
  fontWeight: 300,
  fontSize: '10px',
  letterSpacing: '3px',
  textTransform: 'uppercase',
  color: 'rgba(45,31,14,0.3)',
  margin: '0 0 16px',
}

const EXERCISE_NAMES: Record<string, string> = {
  'foam': 'МФР', 'ankle': 'Голеностоп',
  'glute-bridge': 'Ягодичный мост', 'bird-dog': 'Bird Dog',
  'wall-squat': 'Присед у стены', 'box-squat': 'Присед на тумбу',
  'rdl': 'Румынская тяга', 'db-press': 'Жим гантелей',
  'lat-pulldown': 'Тяга верх. блока', 'cable-row': 'Тяга гориз. блока',
  'abductor': 'Разведение ног', 'dead-bug': 'Dead Bug',
}

type Log = { exercise_id: string; w1?: string; w2?: string; w3?: string; saved_at: string }
type ScheduleEntry = { scheduled_date: string; workouts: { title: string } | null }

function pluralSessions(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return 'занятие'
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'занятия'
  return 'занятий'
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [schedule, setSchedule] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/'); return }

      const [logsRes, schedRes] = await Promise.all([
        supabase
          .from('workout_logs')
          .select('exercise_id, w1, w2, w3, saved_at')
          .eq('player', data.user.id)
          .order('saved_at', { ascending: false }),
        supabase
          .from('workout_schedule')
          .select('scheduled_date, workouts(title)')
          .eq('player_id', data.user.id),
      ])

      setLogs(logsRes.data || [])

      const schedMap: Record<string, string> = {}
      ;(schedRes.data || []).forEach((s: any) => {
        if (s.workouts?.title) schedMap[s.scheduled_date] = s.workouts.title
      })
      setSchedule(schedMap)
      setLoading(false)
    })
  }, [])

  // Group by date
  const byDate: Record<string, Log[]> = {}
  logs.forEach(log => {
    const d = log.saved_at.slice(0, 10)
    if (!byDate[d]) byDate[d] = []
    byDate[d].push(log)
  })
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

  const formatWeights = (log: Log) => {
    const vals = [log.w1, log.w2, log.w3].filter(v => v && parseFloat(v) > 0)
    if (vals.length === 0) return '—'
    return vals.join(' / ') + ' кг'
  }

  if (loading) return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, padding: '52px 28px 80px' }}>
        <div style={{ maxWidth: '460px', margin: '0 auto' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ borderBottom: '1px solid rgba(45,31,14,0.08)', padding: '28px 0' }}>
              <div style={{ height: '12px', background: 'rgba(0,0,0,0.06)', borderRadius: '6px', width: '25%', marginBottom: '16px', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <div style={{ height: '10px', background: 'rgba(0,0,0,0.04)', borderRadius: '5px', width: '65%', animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, padding: '52px 28px 80px' }}>
        <div style={{ maxWidth: '460px', margin: '0 auto' }}>

          {/* HEADER */}
          <div style={{ ...card }}>
            <button
              onClick={() => router.push('/client')}
              style={{ background: 'none', border: 'none', color: 'rgba(45,31,14,0.35)', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', padding: '0 0 20px', cursor: 'pointer', letterSpacing: '1px', display: 'block' }}
            >
              ← Назад
            </button>
            <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontStyle: 'italic', fontSize: '52px', color: '#2d1f0e', margin: '0 0 6px', letterSpacing: '-2px', lineHeight: 0.95 }}>
              История
            </h1>
            <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: 'rgba(45,31,14,0.3)', margin: 0, letterSpacing: '2.5px', textTransform: 'uppercase' }}>
              {sortedDates.length} {pluralSessions(sortedDates.length)}
            </p>
          </div>

          {/* EMPTY STATE */}
          {sortedDates.length === 0 && (
            <div style={{ ...card, textAlign: 'center', padding: '48px 0' }}>
              <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontStyle: 'italic', fontSize: '22px', color: 'rgba(45,31,14,0.18)', margin: '0 0 8px' }}>
                Пока пусто
              </p>
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.28)', margin: 0 }}>
                Заполни первую тренировку — здесь появится история
              </p>
            </div>
          )}

          {/* HISTORY ENTRIES */}
          {sortedDates.map(dateStr => {
            const dayLogs = byDate[dateStr]
            const d = new Date(dateStr + 'T00:00:00')
            const dayNum = d.getDate()
            const monthStr = d.toLocaleDateString('ru-RU', { month: 'short' })
            const weekday = d.toLocaleDateString('ru-RU', { weekday: 'long' })
            const workoutTitle = schedule[dateStr]

            return (
              <div key={dateStr} style={{ ...card }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>

                  {/* Date column */}
                  <div style={{ flexShrink: 0, width: '52px', textAlign: 'center', paddingRight: '20px', borderRight: '1px solid rgba(45,31,14,0.07)' }}>
                    <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontStyle: 'italic', fontSize: '38px', color: '#2d1f0e', margin: 0, lineHeight: 1, letterSpacing: '-1px' }}>
                      {dayNum}
                    </p>
                    <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: 'rgba(45,31,14,0.3)', margin: '3px 0 0', letterSpacing: '1px', textTransform: 'uppercase' }}>
                      {monthStr}
                    </p>
                  </div>

                  {/* Content column */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {workoutTitle && (
                      <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '15px', color: '#7a4a20', margin: '0 0 12px', letterSpacing: '-0.2px' }}>
                        {workoutTitle}
                      </p>
                    )}
                    {!workoutTitle && (
                      <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: 'rgba(45,31,14,0.25)', margin: '0 0 10px', letterSpacing: '2px', textTransform: 'uppercase' }}>
                        {weekday}
                      </p>
                    )}
                    {dayLogs.map((log, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          paddingBottom: i < dayLogs.length - 1 ? '10px' : 0,
                          borderBottom: i < dayLogs.length - 1 ? '1px solid rgba(45,31,14,0.04)' : 'none',
                          marginBottom: i < dayLogs.length - 1 ? '10px' : 0,
                        }}
                      >
                        <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', color: 'rgba(45,31,14,0.55)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {EXERCISE_NAMES[log.exercise_id] || log.exercise_id}
                        </span>
                        <span style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '14px', color: '#7a4a20', marginLeft: '12px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {formatWeights(log)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}

        </div>
      </div>
    </div>
  )
}
