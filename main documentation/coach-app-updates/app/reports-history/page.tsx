'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts'

// ── Design tokens ────────────────────────────────────────────────────────────
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

// ── Types ────────────────────────────────────────────────────────────────────
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
  photoFrontUrl?: string | null
  photoSideUrl?: string | null
  photoBackUrl?: string | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────
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
    <div style={{ background: '#fff', border: '1px solid rgba(45,31,14,0.08)', borderRadius: '8px', padding: '8px 12px' }}>
      <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '16px', color: '#2d1f0e', margin: 0 }}>{payload[0].value} кг</p>
      <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: 'rgba(45,31,14,0.4)', margin: 0 }}>{payload[0].payload.date}</p>
    </div>
  )
}

const PARAM_LABELS: Record<string, string> = {
  chest: 'Грудь', waist: 'Талия', hips: 'Бёдра',
  waist_navel: 'Пупок', one_thigh: 'Бедро', arm: 'Рука',
}

const PARAMS = ['chest', 'waist', 'hips', 'waist_navel', 'one_thigh', 'arm'] as const
type ParamKey = typeof PARAMS[number]

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ReportsHistoryPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [modalUrl, setModalUrl] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { data, error } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('player_id', user.id)
        .order('week_start', { ascending: false })

      if (error) { setLoading(false); return }

      const getUrl = async (path: string | null): Promise<string | null> => {
        if (!path) return null
        if (path.startsWith('http')) return path
        const { data: urlData } = await supabase.storage.from('reports').createSignedUrl(path, 3600)
        return urlData?.signedUrl || null
      }

      const reportsWithUrls = await Promise.all((data || []).map(async (r: any) => ({
        ...r,
        photoFrontUrl: await getUrl(r.photo_front),
        photoSideUrl: await getUrl(r.photo_side),
        photoBackUrl: await getUrl(r.photo_back),
      })))

      setReports(reportsWithUrls)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, padding: '52px 28px 80px' }}>
        <div style={{ maxWidth: '460px', margin: '0 auto' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ borderBottom: '1px solid rgba(45,31,14,0.08)', padding: '28px 0' }}>
              <div style={{ height: '12px', background: 'rgba(0,0,0,0.06)', borderRadius: '6px', width: '30%', marginBottom: '12px', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <div style={{ height: '10px', background: 'rgba(0,0,0,0.04)', borderRadius: '5px', width: '55%', animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // ── Derived data ───────────────────────────────────────────────────────────
  const chronological = [...reports].reverse()
  const withWeight = chronological.filter(r => r.weight !== null)
  const chartData = withWeight.map(r => ({ date: fmtShort(r.week_start), weight: r.weight }))

  const first = reports[reports.length - 1]   // oldest
  const last = reports[0]                       // newest

  const totalWeeks = reports.length >= 2
    ? Math.round((new Date(last.week_start).getTime() - new Date(first.week_start).getTime()) / (7 * 86400000))
    : 0

  const weightDiffTotal = first?.weight != null && last?.weight != null
    ? +(last.weight - first.weight).toFixed(1)
    : null

  // For photo compare: first report's front photo vs latest report's front photo
  const compareFirst = first?.photoFrontUrl ? first : reports.find(r => r.photoFrontUrl)
  const compareLast = last?.photoFrontUrl ? last : [...reports].find(r => r.photoFrontUrl)
  const showPhotoCompare = compareFirst && compareLast && compareFirst.id !== compareLast.id

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />

      {/* PHOTO MODAL */}
      {modalUrl && (
        <div
          onClick={() => setModalUrl(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <button
            onClick={() => setModalUrl(null)}
            style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: '#fff', fontSize: '16px', cursor: 'pointer' }}
          >
            ✕
          </button>
          <img src={modalUrl} alt="" onClick={e => e.stopPropagation()} style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '8px', objectFit: 'contain' }} />
        </div>
      )}

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontStyle: 'italic', fontSize: '52px', color: '#2d1f0e', margin: '0 0 4px', letterSpacing: '-2px', lineHeight: 0.95 }}>
                  Отчёты
                </h1>
                <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: 'rgba(45,31,14,0.3)', margin: 0, letterSpacing: '2.5px', textTransform: 'uppercase' }}>
                  {reports.length} {reports.length === 1 ? 'отчёт' : reports.length < 5 ? 'отчёта' : 'отчётов'}
                  {totalWeeks > 0 ? ` · ${totalWeeks} нед.` : ''}
                </p>
              </div>
              <button
                onClick={() => router.push('/report')}
                style={{ padding: '9px 20px', borderRadius: '999px', background: '#7a4a20', border: 'none', color: '#fff', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', cursor: 'pointer', letterSpacing: '0.5px' }}
              >
                + Отчёт
              </button>
            </div>
          </div>

          {/* EMPTY STATE */}
          {reports.length === 0 && (
            <div style={{ ...card, textAlign: 'center', padding: '48px 0' }}>
              <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontStyle: 'italic', fontSize: '22px', color: 'rgba(45,31,14,0.18)', margin: '0 0 8px' }}>
                Ещё нет отчётов
              </p>
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.28)', margin: '0 0 20px' }}>
                Заполни первый отчёт — он появится здесь
              </p>
              <button
                onClick={() => router.push('/report')}
                style={{ padding: '10px 24px', borderRadius: '999px', background: '#7a4a20', border: 'none', color: '#fff', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', cursor: 'pointer' }}
              >
                Отправить первый отчёт
              </button>
            </div>
          )}

          {/* ── SINGLE REPORT ───────────────────────────────────────────── */}
          {reports.length === 1 && (
            <>
              <div style={{ ...card }}>
                <p style={{ ...LABEL }}>Первый отчёт · {fmtDate(reports[0].week_start)}</p>
                {reports[0].weight != null && (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '20px' }}>
                    <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '48px', color: '#2d1f0e', margin: 0, lineHeight: 1, letterSpacing: '-1.5px' }}>
                      {reports[0].weight}
                    </p>
                    <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '14px', color: 'rgba(45,31,14,0.4)' }}>кг</span>
                  </div>
                )}
                {PARAMS.some(k => reports[0][k] != null) && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'rgba(45,31,14,0.06)', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
                    {PARAMS.map(key => {
                      const val = reports[0][key]
                      if (val == null) return null
                      return (
                        <div key={key} style={{ background: '#f5f0e8', padding: '12px', textAlign: 'center' }}>
                          <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '20px', color: '#2d1f0e', margin: 0, lineHeight: 1 }}>{val}</p>
                          <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', color: 'rgba(45,31,14,0.35)', margin: '4px 0 0', letterSpacing: '1px', textTransform: 'uppercase' }}>{PARAM_LABELS[key]}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
                {[reports[0].photoFrontUrl, reports[0].photoSideUrl, reports[0].photoBackUrl].some(Boolean) && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[reports[0].photoFrontUrl, reports[0].photoSideUrl, reports[0].photoBackUrl].map((url, i) =>
                      url ? <img key={i} src={url} alt="" onClick={() => setModalUrl(url)} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer' }} /> : null
                    )}
                  </div>
                )}
              </div>
              <div style={{ ...card, textAlign: 'center' }}>
                <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.3)', margin: 0, letterSpacing: '1px' }}>
                  После следующего отчёта появится динамика и сравнение фото
                </p>
              </div>
            </>
          )}

          {/* ── MULTI REPORTS ───────────────────────────────────────────── */}
          {reports.length >= 2 && (
            <>

              {/* PHOTO COMPARISON */}
              {showPhotoCompare && (
                <div style={{ ...card }}>
                  <p style={{ ...LABEL }}>Сравнение фото</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {[
                      { report: compareFirst!, label: 'Старт' },
                      { report: compareLast!, label: 'Сейчас' },
                    ].map(({ report, label }) => (
                      <div key={label}>
                        <div style={{ position: 'relative' }}>
                          <img
                            src={report.photoFrontUrl!}
                            alt={label}
                            onClick={() => setModalUrl(report.photoFrontUrl!)}
                            style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: '6px', display: 'block', cursor: 'pointer' }}
                          />
                          <span style={{ position: 'absolute', bottom: '8px', left: '8px', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: '#fff', background: 'rgba(0,0,0,0.4)', padding: '3px 8px', borderRadius: '4px' }}>
                            {label}
                          </span>
                        </div>
                        <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '13px', color: '#2d1f0e', margin: '8px 0 2px', letterSpacing: '-0.2px' }}>
                          {fmtDate(report.week_start)}
                        </p>
                        {report.weight && (
                          <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: '#7a4a20', margin: 0 }}>
                            {report.weight} кг
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  {weightDiffTotal !== null && (
                    <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(122,74,32,0.05)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: 'rgba(45,31,14,0.4)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        За {totalWeeks} нед.
                      </span>
                      <span style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '22px', color: weightDiffTotal <= 0 ? '#1a7a3c' : '#8a2520', letterSpacing: '-0.5px' }}>
                        {weightDiffTotal <= 0 ? '−' : '+'}{Math.abs(weightDiffTotal)} кг
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* WEIGHT CHART */}
              {withWeight.length >= 2 && (
                <div style={{ ...card }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
                    <div>
                      <p style={{ ...LABEL, marginBottom: '8px' }}>Вес</p>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
                        <div>
                          <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '38px', color: '#2d1f0e', margin: 0, lineHeight: 1, letterSpacing: '-1.5px' }}>
                            {last.weight}
                          </p>
                          <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', color: 'rgba(45,31,14,0.3)', margin: '4px 0 0', letterSpacing: '2px', textTransform: 'uppercase' }}>Сейчас</p>
                        </div>
                        {weightDiffTotal !== null && (
                          <div style={{ borderLeft: '1px solid rgba(45,31,14,0.08)', paddingLeft: '16px' }}>
                            <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '24px', color: weightDiffTotal <= 0 ? '#1a7a3c' : '#8a2520', margin: 0, lineHeight: 1, letterSpacing: '-0.5px' }}>
                              {weightDiffTotal <= 0 ? '−' : '+'}{Math.abs(weightDiffTotal)}
                            </p>
                            <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', color: 'rgba(45,31,14,0.3)', margin: '4px 0 0', letterSpacing: '2px', textTransform: 'uppercase' }}>С начала</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={110}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7a4a20" stopOpacity={0.18} />
                          <stop offset="100%" stopColor="#7a4a20" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="rgba(45,31,14,0.04)" />
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
                </div>
              )}

              {/* MEASUREMENTS SUMMARY: first → last */}
              {PARAMS.some(k => first[k] != null || last[k] != null) && (
                <div style={{ ...card }}>
                  <p style={{ ...LABEL }}>Замеры</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'rgba(45,31,14,0.06)', borderRadius: '8px', overflow: 'hidden' }}>
                    {PARAMS.map(key => {
                      const val = last[key]
                      const firstVal = first[key]
                      if (val == null && firstVal == null) return null
                      const diff = val != null && firstVal != null ? +(val - firstVal).toFixed(1) : null
                      return (
                        <div key={key} style={{ background: '#f5f0e8', padding: '14px 10px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '3px' }}>
                            <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '20px', color: '#2d1f0e', margin: 0, lineHeight: 1 }}>{val ?? firstVal}</p>
                            {diff !== null && diff !== 0 && (
                              <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: diff < 0 ? '#1a7a3c' : '#8a2520', lineHeight: 1 }}>
                                {diff < 0 ? `↓${Math.abs(diff)}` : `↑${diff}`}
                              </span>
                            )}
                          </div>
                          <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', color: 'rgba(45,31,14,0.35)', margin: '5px 0 0', letterSpacing: '1px', textTransform: 'uppercase' }}>
                            {PARAM_LABELS[key]}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* REPORT LIST */}
              <div style={{ paddingTop: '8px' }}>
                <p style={{ ...LABEL }}>Все отчёты</p>
                {reports.map((report, idx) => {
                  const prev = reports[idx + 1]
                  const wDiff = report.weight != null && prev?.weight != null
                    ? +(report.weight - prev.weight).toFixed(1)
                    : null
                  const isExpanded = expandedId === report.id
                  const isLatest = idx === 0
                  const photos = [report.photoFrontUrl, report.photoSideUrl, report.photoBackUrl].filter(Boolean) as string[]

                  const shortParams = [
                    report.waist != null && `Тал ${report.waist}`,
                    report.hips != null && `Бёд ${report.hips}`,
                    report.arm != null && `Рука ${report.arm}`,
                  ].filter(Boolean).join(' · ')

                  return (
                    <div
                      key={report.id}
                      style={{ borderBottom: '1px solid rgba(45,31,14,0.06)' }}
                    >
                      {/* ROW */}
                      <div
                        onClick={() => setExpandedId(isExpanded ? null : report.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 0', cursor: 'pointer' }}
                      >
                        <div style={{ width: isLatest ? 8 : 6, height: isLatest ? 8 : 6, borderRadius: '50%', background: '#7a4a20', opacity: isLatest ? 1 : 0.4, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.6)', margin: '0 0 2px' }}>
                            {fmtDate(report.week_start)}
                            {isLatest && isThisWeek(report.week_start) ? <span style={{ color: '#7a4a20', marginLeft: '6px' }}>· эта неделя</span> : ''}
                          </p>
                          {shortParams && (
                            <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: 'rgba(45,31,14,0.28)', margin: 0 }}>{shortParams}</p>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          {report.weight != null && (
                            <span style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '18px', color: '#2d1f0e', letterSpacing: '-0.3px' }}>
                              {report.weight}
                            </span>
                          )}
                          {wDiff !== null && (
                            <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: wDiff <= 0 ? '#1a7a3c' : '#8a2520', marginLeft: '4px' }}>
                              {wDiff <= 0 ? `↓${Math.abs(wDiff)}` : `↑${wDiff}`}
                            </span>
                          )}
                        </div>
                        <span style={{ color: 'rgba(45,31,14,0.2)', fontSize: '10px', flexShrink: 0 }}>{isExpanded ? '▴' : '▾'}</span>
                      </div>

                      {/* EXPANDED DETAIL */}
                      {isExpanded && (
                        <div style={{ paddingBottom: '20px', paddingLeft: '22px' }}>
                          {photos.length > 0 && (
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                              {photos.map((url, i) => (
                                <img
                                  key={i}
                                  src={url}
                                  alt=""
                                  onClick={() => setModalUrl(url)}
                                  style={{ width: '76px', height: '76px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer' }}
                                />
                              ))}
                            </div>
                          )}
                          {PARAMS.some(k => report[k] != null) && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', marginBottom: '10px' }}>
                              {PARAMS.map(key => {
                                const val = report[key]
                                if (val == null) return null
                                return (
                                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid rgba(45,31,14,0.04)', paddingBottom: '6px' }}>
                                    <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: 'rgba(45,31,14,0.35)' }}>{PARAM_LABELS[key]}</span>
                                    <span style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '15px', color: '#2d1f0e' }}>
                                      {val} <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: 'rgba(45,31,14,0.35)' }}>см</span>
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          {report.notes && (
                            <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 300, fontStyle: 'italic', fontSize: '12px', color: 'rgba(45,31,14,0.45)', margin: 0 }}>
                              "{report.notes}"
                            </p>
                          )}
                        </div>
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
