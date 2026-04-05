'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AnimatedBackground from '@/app/components/AnimatedBackground'
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts'

const EXERCISE_NAMES: Record<string, string> = {
  'box-squat': 'Присед на тумбу',
  'rdl': 'Румынская тяга',
  'db-press': 'Жим гантелей лёжа',
  'lat-pulldown': 'Тяга верхнего блока',
  'cable-row': 'Тяга горизонтального блока',
  'abductor': 'Разведение ног',
}

const MUSCLE_TAGS: Record<string, string> = {
  'box-squat': 'Квадрицепс',
  'rdl': 'Бицепс бедра',
  'db-press': 'Грудь',
  'lat-pulldown': 'Широчайшие',
  'cable-row': 'Средняя спина',
  'abductor': 'Ягодицы',
}

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.55)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.7)',
  borderRadius: '20px',
  padding: '24px',
}

type Log = {
  exercise_id: string
  w1?: string | null
  w2?: string | null
  w3?: string | null
  saved_at: string
}

type ChartPoint = { date: string; weight: number; isLast?: boolean }

function formatDate(iso: string) {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}`
}

function maxW(log: Log): number {
  return Math.max(
    parseFloat(log.w1 || '0') || 0,
    parseFloat(log.w2 || '0') || 0,
    parseFloat(log.w3 || '0') || 0,
  )
}

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props
  if (!cx || !cy) return null
  return (
    <circle
      cx={cx}
      cy={cy}
      r={payload.isLast ? 6 : 4}
      fill={payload.isLast ? '#7a4a20' : '#f5f0e8'}
      stroke="#7a4a20"
      strokeWidth={payload.isLast ? 0 : 2}
    />
  )
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(255,255,255,0.95)',
      border: '1px solid rgba(122,74,32,0.15)',
      borderRadius: '12px',
      padding: '8px 14px',
      fontFamily: 'Epilogue, sans-serif',
      fontSize: '14px',
      color: '#7a4a20',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    }}>
      {payload[0].value} кг
    </div>
  )
}

export default function ProgressPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/'); return }
      setUserId(data.user.id)

      const { data: workoutLogs } = await supabase
        .from('workout_logs')
        .select('exercise_id, w1, w2, w3, saved_at')
        .eq('player', data.user.id)
        .not('w1', 'is', null)
        .order('saved_at', { ascending: true })

      setLogs(workoutLogs || [])
      setLoading(false)
    })
  }, [])

  // ── derived data ──────────────────────────────────────────────
  const logsWithWeight = logs.filter(l => maxW(l) > 0)

  // max weight per exercise
  const maxByExercise: Record<string, number> = {}
  logsWithWeight.forEach(l => {
    const w = maxW(l)
    if (w > (maxByExercise[l.exercise_id] || 0)) maxByExercise[l.exercise_id] = w
  })

  // count of records per exercise (for choosing primary chart)
  const countByExercise: Record<string, number> = {}
  logsWithWeight.forEach(l => {
    countByExercise[l.exercise_id] = (countByExercise[l.exercise_id] || 0) + 1
  })

  const primaryExercise = Object.entries(countByExercise).sort(([, a], [, b]) => b - a)[0]?.[0]

  // chart data for primary exercise — group by date, take max
  const chartData: ChartPoint[] = []
  if (primaryExercise) {
    const byDate: Record<string, number> = {}
    logsWithWeight
      .filter(l => l.exercise_id === primaryExercise)
      .forEach(l => {
        const date = formatDate(l.saved_at)
        const w = maxW(l)
        if (w > (byDate[date] || 0)) byDate[date] = w
      })
    const dates = Object.keys(byDate)
    dates.forEach((date, i) => {
      chartData.push({ date, weight: byDate[date], isLast: i === dates.length - 1 })
    })
  }

  // summary stats
  const totalSessions = [...new Set(logs.map(l => l.saved_at.slice(0, 10)))].length
  const globalMax = Math.max(...Object.values(maxByExercise), 0)

  // rdl progress (first vs last)
  const rdlLogs = logsWithWeight.filter(l => l.exercise_id === 'rdl')
  let rdlProgress: number | null = null
  if (rdlLogs.length >= 2) {
    rdlProgress = Math.round((maxW(rdlLogs[rdlLogs.length - 1]) - maxW(rdlLogs[0])) * 10) / 10
  }

  // all exercises sorted by max weight desc
  const allExercises = Object.entries(maxByExercise).sort(([, a], [, b]) => b - a)

  // ── render ────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ fontFamily: 'Chillax, sans-serif', color: 'rgba(45,31,14,0.4)', fontSize: '16px' }}>Загружаем...</p>
      </div>
    </div>
  )

  const isEmpty = logsWithWeight.length === 0

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, padding: '32px 24px 60px' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>

          {/* HEADER */}
          <div style={{ marginBottom: '32px' }}>
            <button
              onClick={() => router.push('/client')}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: 'Chillax, sans-serif',
                fontWeight: 300,
                fontSize: '13px',
                color: 'rgba(45,31,14,0.45)',
                cursor: 'pointer',
                padding: '0 0 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              ← назад
            </button>
            <h1 style={{
              fontFamily: 'Epilogue, sans-serif',
              fontWeight: 400,
              fontSize: '36px',
              color: '#2d1f0e',
              margin: '0 0 6px',
              lineHeight: 1.1,
            }}>
              Мой прогресс
            </h1>
            <p style={{
              fontFamily: 'Chillax, sans-serif',
              fontWeight: 300,
              fontSize: '11px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: '#7a4a20',
              margin: 0,
            }}>
              Динамика весов
            </p>
          </div>

          {isEmpty ? (
            <div style={{ ...glassCard, textAlign: 'center', padding: '48px 24px' }}>
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(45,31,14,0.4)', fontSize: '15px', margin: 0 }}>
                Заполни первую тренировку —<br />здесь появятся твои графики
              </p>
            </div>
          ) : (
            <>
              {/* SUMMARY — 3 cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                {/* Занятий */}
                <div style={{ ...glassCard, borderRadius: '16px', padding: '18px 14px', textAlign: 'center' }}>
                  <p style={{
                    fontFamily: 'Epilogue, sans-serif',
                    fontWeight: 300,
                    fontSize: '28px',
                    color: '#2d1f0e',
                    margin: '0 0 6px',
                    lineHeight: 1,
                  }}>
                    {totalSessions}
                  </p>
                  <p style={{
                    fontFamily: 'Chillax, sans-serif',
                    fontWeight: 300,
                    fontSize: '9px',
                    letterSpacing: '1.2px',
                    textTransform: 'uppercase',
                    color: 'rgba(45,31,14,0.35)',
                    margin: 0,
                  }}>
                    Занятий
                  </p>
                </div>

                {/* Макс вес */}
                <div style={{ ...glassCard, borderRadius: '16px', padding: '18px 14px', textAlign: 'center' }}>
                  <p style={{
                    fontFamily: 'Epilogue, sans-serif',
                    fontWeight: 300,
                    fontSize: '28px',
                    color: '#2d1f0e',
                    margin: '0 0 6px',
                    lineHeight: 1,
                  }}>
                    {globalMax}<span style={{ fontSize: '14px', opacity: 0.5 }}> кг</span>
                  </p>
                  <p style={{
                    fontFamily: 'Chillax, sans-serif',
                    fontWeight: 300,
                    fontSize: '9px',
                    letterSpacing: '1.2px',
                    textTransform: 'uppercase',
                    color: 'rgba(45,31,14,0.35)',
                    margin: 0,
                  }}>
                    Макс вес
                  </p>
                </div>

                {/* Прогресс RDL */}
                <div style={{ ...glassCard, borderRadius: '16px', padding: '18px 14px', textAlign: 'center' }}>
                  <p style={{
                    fontFamily: 'Epilogue, sans-serif',
                    fontWeight: 300,
                    fontSize: '28px',
                    color: rdlProgress !== null && rdlProgress > 0 ? '#7a4a20' : '#2d1f0e',
                    margin: '0 0 6px',
                    lineHeight: 1,
                  }}>
                    {rdlProgress !== null ? `+${rdlProgress}` : '—'}<span style={{ fontSize: '14px', opacity: 0.5 }}>{rdlProgress !== null ? ' кг' : ''}</span>
                  </p>
                  <p style={{
                    fontFamily: 'Chillax, sans-serif',
                    fontWeight: 300,
                    fontSize: '9px',
                    letterSpacing: '1.2px',
                    textTransform: 'uppercase',
                    color: 'rgba(45,31,14,0.35)',
                    margin: 0,
                  }}>
                    РДЛ рост
                  </p>
                </div>
              </div>

              {/* DETAIL CHART */}
              {primaryExercise && chartData.length > 0 && (
                <div style={{ ...glassCard, marginBottom: '16px', padding: '24px 16px 16px' }}>
                  <p style={{
                    fontFamily: 'Chillax, sans-serif',
                    fontWeight: 300,
                    fontSize: '11px',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    color: 'rgba(45,31,14,0.35)',
                    margin: '0 0 20px 8px',
                  }}>
                    Динамика
                  </p>

                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(122,74,32,0.3)" />
                          <stop offset="100%" stopColor="rgba(122,74,32,0)" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(45,31,14,0.07)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontFamily: 'Chillax, sans-serif', fontSize: 10, fill: 'rgba(45,31,14,0.4)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontFamily: 'Chillax, sans-serif', fontSize: 10, fill: 'rgba(45,31,14,0.4)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="weight"
                        stroke="#7a4a20"
                        strokeWidth={2}
                        fill="url(#chartGrad)"
                        dot={<CustomDot />}
                        activeDot={{ r: 6, fill: '#7a4a20', stroke: '#f5f0e8', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>

                  {/* Exercise meta below chart */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '16px',
                    paddingTop: '14px',
                    borderTop: '1px solid rgba(45,31,14,0.07)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontFamily: 'Chillax, sans-serif',
                        fontWeight: 300,
                        fontSize: '13px',
                        color: '#2d1f0e',
                      }}>
                        {EXERCISE_NAMES[primaryExercise] || primaryExercise}
                      </span>
                      {MUSCLE_TAGS[primaryExercise] && (
                        <span style={{
                          fontFamily: 'Chillax, sans-serif',
                          fontWeight: 300,
                          fontSize: '10px',
                          color: '#7a4a20',
                          background: 'rgba(122,74,32,0.1)',
                          border: '1px solid rgba(122,74,32,0.18)',
                          borderRadius: '999px',
                          padding: '2px 8px',
                        }}>
                          {MUSCLE_TAGS[primaryExercise]}
                        </span>
                      )}
                    </div>
                    <span style={{
                      fontFamily: 'Epilogue, sans-serif',
                      fontWeight: 300,
                      fontSize: '15px',
                      color: '#7a4a20',
                    }}>
                      {maxByExercise[primaryExercise]} кг
                    </span>
                  </div>
                </div>
              )}

              {/* ALL EXERCISES */}
              <div style={{ ...glassCard }}>
                <p style={{
                  fontFamily: 'Chillax, sans-serif',
                  fontWeight: 300,
                  fontSize: '11px',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  color: 'rgba(45,31,14,0.35)',
                  margin: '0 0 20px',
                }}>
                  Все упражнения
                </p>

                {allExercises.map(([exId, weight]) => (
                  <div key={exId} style={{ marginBottom: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                      <span style={{
                        fontFamily: 'Chillax, sans-serif',
                        fontWeight: 300,
                        fontSize: '13px',
                        color: 'rgba(45,31,14,0.7)',
                      }}>
                        {EXERCISE_NAMES[exId] || exId}
                      </span>
                      <span style={{
                        fontFamily: 'Epilogue, sans-serif',
                        fontWeight: 300,
                        fontSize: '13px',
                        color: '#7a4a20',
                      }}>
                        {weight} кг
                      </span>
                    </div>
                    <div style={{ height: '5px', borderRadius: '999px', background: 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        borderRadius: '999px',
                        width: `${(weight / globalMax) * 100}%`,
                        background: 'linear-gradient(90deg, rgba(122,74,32,0.4), #7a4a20)',
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
