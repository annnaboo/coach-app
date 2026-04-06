'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts'

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.55)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.7)',
  borderRadius: '20px',
  padding: '20px',
  marginBottom: '12px',
}

type Report = {
  id: string
  week_start: string
  weight: number | null
  chest: number | null
  waist: number | null
  waist_navel: number | null
  hips: number | null
  one_thigh: number | null
  arm: number | null
  notes: string | null
  photo_front: string | null
  photo_side: string | null
  photo_back: string | null
  photo_front_url?: string
  photo_side_url?: string
  photo_back_url?: string
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function fmtShort(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '')
}

function isThisWeek(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  const monday = new Date(now)
  const day = monday.getDay()
  monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 7)
  return d >= monday && d < sunday
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '8px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
      <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 300, fontSize: '16px', color: '#2d1f0e', margin: 0 }}>{payload[0].value} кг</p>
      <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: 'rgba(45,31,14,0.4)', margin: 0 }}>{payload[0].payload.date}</p>
    </div>
  )
}

const PARAM_LABELS: Record<string, string> = {
  chest: 'Грудь', waist: 'Талия', hips: 'Бёдра',
  waist_navel: 'Пупок', one_thigh: 'Бедро', arm: 'Рука',
}

export default function ReportsHistoryPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [modalUrl, setModalUrl] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/'); return }
      const userId = user.id

      const { data: rows, error } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('player_id', userId)
        .order('week_start', { ascending: false })

      console.log('Reports:', rows?.length ?? 0, 'Error:', error?.message ?? 'none', 'UserId:', userId)

      if (!rows || rows.length === 0) { setLoading(false); return }

      const getUrl = async (path: string | null): Promise<string | null> => {
        if (!path) return null
        if (path.startsWith('http')) return path
        const { data: s } = await supabase.storage.from('reports').createSignedUrl(path, 3600)
        return s?.signedUrl || null
      }

      for (const row of rows) {
        row.photo_front_url = await getUrl(row.photo_front)
        row.photo_side_url = await getUrl(row.photo_side)
        row.photo_back_url = await getUrl(row.photo_back)
      }

      setReports(rows)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ fontFamily: 'Chillax, sans-serif', color: 'rgba(45,31,14,0.4)', fontSize: '16px' }}>Загружаем...</p>
      </div>
    </div>
  )

  // Sorted oldest → newest for chart
  const chronological = [...reports].reverse()
  const withWeight = chronological.filter(r => r.weight !== null)
  const chartData = withWeight.map(r => ({ date: fmtShort(r.week_start), weight: r.weight }))

  const first = reports[reports.length - 1]
  const last = reports[0]
  const totalWeeks = reports.length >= 2
    ? Math.round((new Date(last.week_start).getTime() - new Date(first.week_start).getTime()) / (7 * 86400000))
    : 0
  const weightDiffTotal = first?.weight != null && last?.weight != null
    ? +(last.weight - first.weight).toFixed(1)
    : null

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />

      {/* PHOTO MODAL */}
      {modalUrl && (
        <div
          onClick={() => setModalUrl(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <button onClick={() => setModalUrl(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: '#fff', fontSize: '18px', cursor: 'pointer' }}>✕</button>
          <img src={modalUrl} alt="" onClick={e => e.stopPropagation()} style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '16px', objectFit: 'contain' }} />
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 1, padding: '28px 20px 60px' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>

          {/* HEADER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
            <button onClick={() => router.push('/client')} style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: '999px', color: 'rgba(45,31,14,0.5)', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', padding: '8px 18px', cursor: 'pointer', flexShrink: 0 }}>
              ← назад
            </button>
            <div>
              <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, color: '#2d1f0e', fontSize: '24px', margin: 0 }}>Мои отчёты</h1>
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: '#7a4a20', margin: 0 }}>История замеров</p>
            </div>
          </div>

          {reports.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', textAlign: 'center', gap: '12px' }}>
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                <rect x="8" y="6" width="34" height="44" rx="5" stroke="rgba(45,31,14,0.2)" strokeWidth="2" fill="none" />
                <path d="M16 18h20M16 26h20M16 34h12" stroke="rgba(45,31,14,0.2)" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <h2 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, color: '#2d1f0e', fontSize: '20px', margin: 0 }}>Ещё нет отчётов</h2>
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '14px', color: 'rgba(45,31,14,0.4)', margin: 0 }}>Заполни первый отчёт — он появится здесь</p>
              <button onClick={() => router.push('/report')} style={{ marginTop: '8px', padding: '12px 28px', borderRadius: '999px', background: '#7a4a20', color: '#fff', border: 'none', fontFamily: 'Chillax, sans-serif', fontWeight: 500, fontSize: '14px', cursor: 'pointer' }}>
                Отправить первый отчёт
              </button>
            </div>
          ) : reports.length === 1 ? (
            /* SINGLE REPORT — first report card, no chart/dynamics */
            <>
              <div style={glass}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#7a4a20', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: 'rgba(45,31,14,0.6)', margin: '0 0 2px' }}>
                      {fmtDate(reports[0].week_start)}{isThisWeek(reports[0].week_start) ? ' · эта неделя' : ''}
                    </p>
                    <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', color: 'rgba(45,31,14,0.3)', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Первый отчёт</p>
                  </div>
                  {reports[0].weight != null && (
                    <span style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 300, fontSize: '26px', color: '#2d1f0e', marginLeft: 'auto', lineHeight: 1 }}>
                      {reports[0].weight} <span style={{ fontFamily: 'Chillax, sans-serif', fontSize: '14px', color: 'rgba(45,31,14,0.4)' }}>кг</span>
                    </span>
                  )}
                </div>

                {/* Params grid */}
                {(['chest','waist','hips','waist_navel','one_thigh','arm'] as const).some(k => reports[0][k] != null) && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
                    {(['chest','waist','hips','waist_navel','one_thigh','arm'] as const).map(key => {
                      const val = reports[0][key]
                      if (val == null) return null
                      return (
                        <div key={key} style={{ background: 'rgba(0,0,0,0.04)', borderRadius: '12px', padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 300, fontSize: '18px', color: '#2d1f0e', display: 'block' }}>{val}</span>
                          <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', color: 'rgba(45,31,14,0.35)', letterSpacing: '0.5px' }}>{PARAM_LABELS[key]}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Photos */}
                {[reports[0].photo_front_url, reports[0].photo_side_url, reports[0].photo_back_url].some(Boolean) && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: reports[0].notes ? '12px' : 0 }}>
                    {[reports[0].photo_front_url, reports[0].photo_side_url, reports[0].photo_back_url].map((url, i) =>
                      url ? <img key={i} src={url} alt="" onClick={() => setModalUrl(url)} style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer' }} /> : null
                    )}
                  </div>
                )}

                {reports[0].notes && (
                  <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.5)', fontStyle: 'italic', margin: 0 }}>"{reports[0].notes}"</p>
                )}
              </div>

              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', color: 'rgba(45,31,14,0.35)', margin: '0 0 12px' }}>
                  После следующего отчёта появится график динамики
                </p>
                <button onClick={() => router.push('/report')} style={{ padding: '10px 24px', borderRadius: '999px', background: '#7a4a20', color: '#fff', border: 'none', fontFamily: 'Chillax, sans-serif', fontWeight: 500, fontSize: '14px', cursor: 'pointer' }}>
                  + Новый отчёт
                </button>
              </div>
            </>
          ) : (
            <>
              {/* DYNAMICS BLOCK */}
              {withWeight.length >= 2 && (
                <div style={glass}>
                  {/* A — TREND ROW */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', color: 'rgba(45,31,14,0.35)', margin: '0 0 2px', letterSpacing: '1px', textTransform: 'uppercase' }}>Начало</p>
                      <span style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 300, fontSize: '26px', color: '#2d1f0e', lineHeight: 1 }}>{first.weight}</span>
                      <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.4)', marginLeft: '3px' }}>кг</span>
                    </div>
                    <span style={{ color: 'rgba(45,31,14,0.2)', fontSize: '16px' }}>→</span>
                    <div>
                      <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', color: 'rgba(45,31,14,0.35)', margin: '0 0 2px', letterSpacing: '1px', textTransform: 'uppercase' }}>Сейчас</p>
                      <span style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 300, fontSize: '26px', color: '#2d1f0e', lineHeight: 1 }}>{last.weight}</span>
                      <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.4)', marginLeft: '3px' }}>кг</span>
                    </div>
                    {weightDiffTotal !== null && (
                      <span style={{
                        fontFamily: 'Chillax, sans-serif', fontWeight: 500, fontSize: '12px',
                        padding: '5px 12px', borderRadius: '999px', marginLeft: 'auto',
                        background: weightDiffTotal <= 0 ? 'rgba(26,122,60,0.1)' : 'rgba(138,37,32,0.08)',
                        color: weightDiffTotal <= 0 ? '#1a7a3c' : '#8a2520',
                        border: weightDiffTotal <= 0 ? '1px solid rgba(26,122,60,0.2)' : '1px solid rgba(138,37,32,0.15)',
                      }}>
                        {weightDiffTotal <= 0 ? '↓' : '↑'} {Math.abs(weightDiffTotal)} кг за {totalWeeks} нед.
                      </span>
                    )}
                  </div>

                  {/* B — RECHARTS LINECHART */}
                  <ResponsiveContainer width="100%" height={120}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7a4a20" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#7a4a20" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="rgba(45,31,14,0.05)" />
                      <XAxis dataKey="date" tick={{ fontFamily: 'Chillax, sans-serif', fontSize: 8, fill: 'rgba(45,31,14,0.25)' }} axisLine={false} tickLine={false} />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="weight"
                        stroke="#7a4a20"
                        strokeWidth={1.5}
                        fill="url(#weightGrad)"
                        dot={{ fill: '#f5f0e8', stroke: '#7a4a20', strokeWidth: 1.5, r: 3 }}
                        activeDot={{ fill: '#7a4a20', r: 5, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>

                  {/* C — PARAMS GRID from latest report */}
                  {(['chest','waist','hips','waist_navel','one_thigh','arm'] as const).some(k => last[k] != null) && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '16px' }}>
                      {(['chest','waist','hips','waist_navel','one_thigh','arm'] as const).map(key => {
                        const val = last[key]
                        const firstVal = first[key]
                        if (val == null) return null
                        const diff = firstVal != null ? +(val - firstVal).toFixed(1) : null
                        return (
                          <div key={key} style={{ background: 'rgba(0,0,0,0.04)', borderRadius: '12px', padding: '10px 12px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '3px' }}>
                              <span style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 300, fontSize: '18px', color: '#2d1f0e' }}>{val}</span>
                              {diff !== null && diff !== 0 && (
                                <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 500, fontSize: '10px', color: diff < 0 ? '#1a7a3c' : '#8a2520' }}>
                                  {diff < 0 ? `↓${Math.abs(diff)}` : `↑${diff}`}
                                </span>
                              )}
                            </div>
                            <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', color: 'rgba(45,31,14,0.35)', margin: '2px 0 0', letterSpacing: '0.5px' }}>{PARAM_LABELS[key]}</p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* LIST BY WEEKS */}
              <div style={glass}>
                {reports.map((report, idx) => {
                  const prev = reports[idx + 1]
                  const wDiff = report.weight != null && prev?.weight != null
                    ? +(report.weight - prev.weight).toFixed(1)
                    : null
                  const isExpanded = expandedId === report.id
                  const isLast = idx === 0
                  const photos = [report.photo_front_url, report.photo_side_url, report.photo_back_url].filter(Boolean) as string[]

                  const shortParams = [
                    report.waist != null && `Тал ${report.waist}`,
                    report.hips != null && `Бёд ${report.hips}`,
                    report.arm != null && `Рука ${report.arm}`,
                  ].filter(Boolean).join(' · ')

                  return (
                    <div key={report.id}>
                      {/* ROW */}
                      <div
                        onClick={() => setExpandedId(isExpanded ? null : report.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', cursor: 'pointer' }}
                      >
                        {/* dot */}
                        <div style={{ width: isLast ? 10 : 8, height: isLast ? 10 : 8, borderRadius: '50%', background: '#7a4a20', opacity: isLast ? 1 : 0.5, flexShrink: 0 }} />
                        {/* info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: 'rgba(45,31,14,0.6)', margin: '0 0 2px' }}>
                            {fmtDate(report.week_start)}{isLast && isThisWeek(report.week_start) ? ' · эта неделя' : ''}
                          </p>
                          {shortParams && (
                            <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: 'rgba(45,31,14,0.3)', margin: 0 }}>{shortParams}</p>
                          )}
                        </div>
                        {/* weight */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          {report.weight != null && (
                            <span style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 300, fontSize: '18px', color: '#2d1f0e' }}>{report.weight}</span>
                          )}
                          {wDiff !== null && (
                            <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 500, fontSize: '10px', color: wDiff <= 0 ? '#1a7a3c' : '#8a2520', marginLeft: '4px' }}>
                              {wDiff <= 0 ? `↓${Math.abs(wDiff)}` : `↑${wDiff}`}
                            </span>
                          )}
                        </div>
                        <span style={{ color: 'rgba(45,31,14,0.2)', fontSize: '11px', flexShrink: 0 }}>{isExpanded ? '▴' : '▾'}</span>
                      </div>

                      {/* EXPANDED */}
                      {isExpanded && (
                        <div style={{ paddingBottom: '12px', paddingLeft: '20px' }}>
                          {photos.length > 0 && (
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                              {photos.map((url, i) => (
                                <img key={i} src={url} alt="" onClick={() => setModalUrl(url)} style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer' }} />
                              ))}
                            </div>
                          )}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', marginBottom: '10px' }}>
                            {(['chest','waist','waist_navel','hips','one_thigh','arm'] as const).map(key => {
                              const val = report[key]
                              if (val == null) return null
                              return (
                                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                  <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: 'rgba(45,31,14,0.35)' }}>{PARAM_LABELS[key]}</span>
                                  <span style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 300, fontSize: '15px', color: '#2d1f0e' }}>{val} <span style={{ fontSize: '10px', color: 'rgba(45,31,14,0.35)' }}>см</span></span>
                                </div>
                              )
                            })}
                          </div>
                          {report.notes && (
                            <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.5)', fontStyle: 'italic', margin: 0 }}>"{report.notes}"</p>
                          )}
                        </div>
                      )}

                      {idx < reports.length - 1 && (
                        <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }} />
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
