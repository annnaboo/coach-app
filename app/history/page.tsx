'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'
import BrandLogo from '@/app/components/BrandLogo'
import { LABEL } from '@/lib/design/tokens'
import { EXERCISE_NAMES } from '@/lib/exercises'

const card: React.CSSProperties = {
  borderBottom: '1px solid rgba(45,31,14,0.08)',
  padding: '28px 0',
}

type Log = {
  exercise_id: string
  w1?: string
  w2?: string
  w3?: string
  saved_at: string
}

type ExerciseSeries = {
  id: string
  name: string
  pr: number
  sessions: { date: string; max: number }[]
  trend: 'up' | 'down' | 'flat'
}

function pluralSessions(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return 'занятие'
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'занятия'
  return 'занятий'
}

function getMaxWeight(log: Log): number {
  return Math.max(
    parseFloat(log.w1 || '0') || 0,
    parseFloat(log.w2 || '0') || 0,
    parseFloat(log.w3 || '0') || 0,
  )
}

function buildExerciseSeries(logs: Log[]): ExerciseSeries[] {
  // Group by exercise
  const byExercise: Record<string, { date: string; max: number }[]> = {}
  logs.forEach(log => {
    const max = getMaxWeight(log)
    if (max === 0) return
    const date = log.saved_at.slice(0, 10)
    if (!byExercise[log.exercise_id]) byExercise[log.exercise_id] = []
    // One entry per date (keep max of that day)
    const existing = byExercise[log.exercise_id].find(e => e.date === date)
    if (existing) {
      existing.max = Math.max(existing.max, max)
    } else {
      byExercise[log.exercise_id].push({ date, max })
    }
  })

  return Object.entries(byExercise)
    .map(([id, sessions]) => {
      const sorted = sessions.sort((a, b) => a.date.localeCompare(b.date))
      const pr = Math.max(...sorted.map(s => s.max))
      const last3 = sorted.slice(-3).map(s => s.max)
      const trend: 'up' | 'down' | 'flat' =
        last3.length < 2 ? 'flat'
        : last3[last3.length - 1] > last3[0] ? 'up'
        : last3[last3.length - 1] < last3[0] ? 'down'
        : 'flat'
      return {
        id,
        name: EXERCISE_NAMES[id] || id,
        pr,
        sessions: sorted,
        trend,
      }
    })
    .filter(e => e.sessions.length >= 2) // only show exercises with history
    .sort((a, b) => b.pr - a.pr)
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [schedule, setSchedule] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'history' | 'progress'>('history')
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

  // ── TAB 1: group by date ──────────────────────────────────────────────────
  const byDate: Record<string, Log[]> = {}
  logs.forEach(log => {
    const d = log.saved_at.slice(0, 10)
    if (!byDate[d]) byDate[d] = []
    byDate[d].push(log)
  })
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

  const formatWeights = (log: Log) => {
    const vals = [log.w1, log.w2, log.w3].filter(v => v && parseFloat(v) > 0)
    return vals.length === 0 ? '—' : vals.join(' / ') + ' кг'
  }

  // ── TAB 2: exercise series ────────────────────────────────────────────────
  const series = buildExerciseSeries(logs)

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

          <BrandLogo />

          {/* HEADER */}
          <div className="card-enter" style={{ ...card }}>
            <button
              onClick={() => router.push('/client')}
              style={{ background: 'none', border: 'none', color: 'rgba(45,31,14,0.35)', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', padding: '12px 16px 20px 0', cursor: 'pointer', letterSpacing: '1px', display: 'flex', alignItems: 'center', minHeight: '44px' }}
            >
              ← Назад
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontStyle: 'italic', fontSize: '52px', color: '#2d1f0e', margin: '0 0 4px', letterSpacing: '-2px', lineHeight: 0.95 }}>
                  {activeTab === 'history' ? 'История' : 'Прогресс'}
                </h1>
                <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: 'rgba(45,31,14,0.5)', margin: 0, letterSpacing: '2.5px', textTransform: 'uppercase' }}>
                  {activeTab === 'history'
                    ? `${sortedDates.length} ${pluralSessions(sortedDates.length)}`
                    : `${series.length} упражнений`}
                </p>
              </div>
            </div>
          </div>

          {/* TABS */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(45,31,14,0.08)', marginBottom: '0' }}>
            {(['history', 'progress'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '16px 0',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid #7a4a20' : '2px solid transparent',
                  marginBottom: '-1px',
                  fontFamily: 'Chillax, sans-serif',
                  fontWeight: 300,
                  fontSize: '11px',
                  letterSpacing: '2.5px',
                  textTransform: 'uppercase',
                  color: activeTab === tab ? '#7a4a20' : 'rgba(45,31,14,0.3)',
                  cursor: 'pointer',
                  transition: 'color 0.15s',
                }}
              >
                {tab === 'history' ? 'Тренировки' : 'Прогресс'}
              </button>
            ))}
          </div>

          {/* ── TAB 1: HISTORY ─────────────────────────────────────────── */}
          {activeTab === 'history' && (
            <>
              {sortedDates.length === 0 && (
                <div style={{ ...card, textAlign: 'center', padding: '48px 0' }}>
                  <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontStyle: 'italic', fontSize: '22px', color: 'rgba(45,31,14,0.18)', margin: '0 0 8px' }}>Пока пусто</p>
                  <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.28)', margin: 0 }}>Заполни первую тренировку — здесь появится история</p>
                </div>
              )}
              {sortedDates.map(dateStr => {
                const dayLogs = byDate[dateStr]
                const d = new Date(dateStr + 'T00:00:00')
                const dayNum = d.getDate()
                const monthStr = d.toLocaleDateString('ru-RU', { month: 'short' })
                const workoutTitle = schedule[dateStr]
                const weekday = d.toLocaleDateString('ru-RU', { weekday: 'long' })
                return (
                  <div key={dateStr} style={{ ...card }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                      <div style={{ flexShrink: 0, width: '52px', textAlign: 'center', paddingRight: '20px', borderRight: '1px solid rgba(45,31,14,0.07)' }}>
                        <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontStyle: 'italic', fontSize: '38px', color: '#2d1f0e', margin: 0, lineHeight: 1, letterSpacing: '-1px' }}>{dayNum}</p>
                        <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: 'rgba(45,31,14,0.5)', margin: '3px 0 0', letterSpacing: '1px', textTransform: 'uppercase' }}>{monthStr}</p>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {workoutTitle
                          ? <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '15px', color: '#7a4a20', margin: '0 0 12px', letterSpacing: '-0.2px' }}>{workoutTitle}</p>
                          : <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: 'rgba(45,31,14,0.25)', margin: '0 0 10px', letterSpacing: '2px', textTransform: 'uppercase' }}>{weekday}</p>
                        }
                        {dayLogs.map((log, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: i < dayLogs.length - 1 ? '10px' : 0, borderBottom: i < dayLogs.length - 1 ? '1px solid rgba(45,31,14,0.04)' : 'none', marginBottom: i < dayLogs.length - 1 ? '10px' : 0 }}>
                            <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', color: 'rgba(45,31,14,0.55)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
            </>
          )}

          {/* ── TAB 2: PROGRESS DASHBOARD ──────────────────────────────── */}
          {activeTab === 'progress' && (
            <>
              {series.length === 0 && (
                <div style={{ ...card, textAlign: 'center', padding: '48px 0' }}>
                  <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontStyle: 'italic', fontSize: '22px', color: 'rgba(45,31,14,0.18)', margin: '0 0 8px' }}>Ещё нет данных</p>
                  <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.28)', margin: 0 }}>Сделай минимум 2 тренировки — и здесь появятся графики</p>
                </div>
              )}
              {series.map(ex => {
                const maxVal = Math.max(...ex.sessions.map(s => s.max))
                const minVal = Math.min(...ex.sessions.map(s => s.max))
                // Show last 8 sessions as bar chart
                const visible = ex.sessions.slice(-8)
                const firstWeight = ex.sessions[0].max
                const lastWeight = ex.sessions[ex.sessions.length - 1].max
                const delta = +(lastWeight - firstWeight).toFixed(1)
                const trendColor = ex.trend === 'up' ? '#1a7a3c' : ex.trend === 'down' ? '#8a2520' : 'rgba(45,31,14,0.3)'
                const trendLabel = ex.trend === 'up' ? `+${delta} кг` : ex.trend === 'down' ? `${delta} кг` : 'стабильно'

                return (
                  <div key={ex.id} style={{ ...card }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                      <div>
                        <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: 'rgba(45,31,14,0.5)', margin: '0 0 6px', letterSpacing: '2px', textTransform: 'uppercase' }}>
                          {ex.name}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                          <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '40px', color: '#2d1f0e', margin: 0, lineHeight: 1, letterSpacing: '-1.5px' }}>
                            {ex.pr}
                          </p>
                          <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', color: 'rgba(45,31,14,0.4)' }}>кг</span>
                        </div>
                        <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', color: 'rgba(45,31,14,0.25)', margin: '4px 0 0', letterSpacing: '2px', textTransform: 'uppercase' }}>
                          Личный рекорд
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '18px', color: trendColor, letterSpacing: '-0.5px' }}>
                          {trendLabel}
                        </span>
                        <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', color: 'rgba(45,31,14,0.25)', margin: '3px 0 0', letterSpacing: '2px', textTransform: 'uppercase' }}>
                          С первой тренировки
                        </p>
                      </div>
                    </div>

                    {/* Bar chart */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '48px' }}>
                      {visible.map((s, i) => {
                        const isLast = i === visible.length - 1
                        const isPR = s.max === maxVal
                        const heightPct = maxVal === minVal ? 100 : ((s.max - minVal) / (maxVal - minVal)) * 70 + 30
                        return (
                          <div
                            key={s.date}
                            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
                          >
                            {isPR && (
                              <span style={{ fontFamily: 'Chillax, sans-serif', fontSize: '8px', color: '#7a4a20', letterSpacing: '0px' }}>★</span>
                            )}
                            {!isPR && <span style={{ fontSize: '8px', opacity: 0 }}>·</span>}
                            <div
                              style={{
                                width: '100%',
                                height: `${heightPct}%`,
                                minHeight: '4px',
                                background: isLast
                                  ? '#7a4a20'
                                  : isPR
                                    ? 'rgba(122,74,32,0.5)'
                                    : 'rgba(45,31,14,0.12)',
                                borderRadius: '2px 2px 0 0',
                                transition: 'height 0.4s ease',
                              }}
                            />
                          </div>
                        )
                      })}
                    </div>

                    {/* Date range */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                      <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', color: 'rgba(45,31,14,0.25)', letterSpacing: '1px' }}>
                        {new Date(ex.sessions[0].date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </span>
                      <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', color: 'rgba(45,31,14,0.4)', letterSpacing: '1px' }}>
                        {new Date(ex.sessions[ex.sessions.length - 1].date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                )
              })}
            </>
          )}

        </div>
      </div>
    </div>
  )
}
