'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'
import { fmtDate } from '@/lib/utils'
import BrandLogo from '@/app/components/BrandLogo'
import { LABEL } from '@/lib/design/tokens'
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts'

const card: React.CSSProperties = {
  borderBottom: '1px solid var(--divider)',
  padding: '28px 0',
}

type Report = {
  id: string
  week_start: string
  weight: number | null
  height_cm: number | null
  chest: number | null
  waist: number | null
  waist_navel: number | null
  hips: number | null
  left_thigh: number | null
  right_thigh: number | null
  left_arm: number | null
  right_arm: number | null
  one_thigh?: number | null
  arm?: number | null
  notes: string | null
  photo_front: string | null
  photo_side: string | null
  photo_back: string | null
  photoFrontUrl?: string | null
  photoSideUrl?: string | null
  photoBackUrl?: string | null
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
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--divider)', borderRadius: '8px', padding: '8px 12px', boxShadow: 'var(--shadow-soft)' }}>
      <p style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '16px', color: 'var(--text-primary)', margin: 0 }}>{payload[0].value} кг</p>
      <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '10px', color: 'var(--text-tertiary)', margin: 0 }}>{payload[0].payload.date}</p>
    </div>
  )
}

const PARAM_LABELS: Record<string, string> = {
  chest: 'Грудь', waist: 'Талия', hips: 'Бёдра',
  waist_navel: 'Пупок',
  left_thigh: 'Бедро Л', right_thigh: 'Бедро П',
  left_arm: 'Рука Л', right_arm: 'Рука П',
}

const PARAMS = ['chest', 'waist', 'hips', 'waist_navel', 'left_thigh', 'right_thigh', 'left_arm', 'right_arm'] as const
type ParamKey = typeof PARAMS[number]

function getParam(report: Report, key: string): number | null {
  const val = (report as any)[key]
  if (val != null) return val
  if (key === 'left_thigh' || key === 'right_thigh') return report.one_thigh ?? null
  if (key === 'left_arm' || key === 'right_arm') return report.arm ?? null
  return null
}

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
            <div key={i} style={{ borderBottom: '1px solid var(--divider)', padding: '28px 0' }}>
              <div className="skeleton" style={{ height: '12px', width: '30%', marginBottom: '12px' }} />
              <div className="skeleton" style={{ height: '10px', width: '55%' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )

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
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
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

          <BrandLogo />

          {/* HEADER */}
          <div className="card-enter" style={{ ...card }}>
            <button
              onClick={() => router.push('/client')}
              className="pressable"
              style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', padding: '12px 16px 20px 0', cursor: 'pointer', letterSpacing: '1px', display: 'flex', alignItems: 'center', minHeight: '44px' }}
            >
              ← Назад
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h1 style={{ fontFamily: "'Playfair Display', 'Bodoni 72', 'Didot', serif", fontWeight: 600, fontStyle: 'italic', fontSize: '52px', color: 'var(--text-primary)', margin: '0 0 4px', letterSpacing: '-1px', lineHeight: 0.95 }}>
                  Отчёты
                </h1>
                <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', color: 'var(--text-secondary)', margin: 0, letterSpacing: '2.5px', textTransform: 'uppercase' }}>
                  {reports.length} {reports.length === 1 ? 'отчёт' : reports.length < 5 ? 'отчёта' : 'отчётов'}
                  {totalWeeks > 0 ? ` · ${totalWeeks} нед.` : ''}
                  {reports.find(r => r.height_cm != null)?.height_cm ? ` · ${reports.find(r => r.height_cm != null)!.height_cm} см` : ''}
                </p>
              </div>
              <button
                onClick={() => router.push('/report')}
                className="pressable"
                style={{ padding: '9px 20px', borderRadius: '999px', background: 'var(--accent-primary)', border: 'none', color: '#fff', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '12px', cursor: 'pointer', letterSpacing: '0.5px' }}
              >
                + Отчёт
              </button>
            </div>
          </div>

          {/* EMPTY STATE */}
          {reports.length === 0 && (
            <div style={{ ...card, textAlign: 'center', padding: '48px 0' }}>
              <p style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontStyle: 'italic', fontSize: '22px', color: 'var(--text-tertiary)', margin: '0 0 8px' }}>
                Ещё нет отчётов
              </p>
              <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '12px', color: 'var(--text-tertiary)', margin: '0 0 20px' }}>
                Заполни первый отчёт — он появится здесь
              </p>
              <button
                onClick={() => router.push('/report')}
                className="pressable"
                style={{ padding: '10px 24px', borderRadius: '999px', background: 'var(--accent-primary)', border: 'none', color: '#fff', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '12px', cursor: 'pointer' }}
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
                    <p className="number-mount" style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '48px', color: 'var(--text-primary)', margin: 0, lineHeight: 1, letterSpacing: '-1.5px' }}>
                      {reports[0].weight}
                    </p>
                    <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '14px', color: 'var(--text-tertiary)' }}>кг</span>
                  </div>
                )}
                {PARAMS.some(k => getParam(reports[0], k) != null) && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'var(--divider)', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
                    {PARAMS.map(key => {
                      const val = getParam(reports[0], key)
                      if (val == null) return null
                      return (
                        <div key={key} style={{ background: 'var(--bg-card-soft)', padding: '12px', textAlign: 'center' }}>
                          <p style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '20px', color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>{val}</p>
                          <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '9px', color: 'var(--text-tertiary)', margin: '4px 0 0', letterSpacing: '1px', textTransform: 'uppercase' }}>{PARAM_LABELS[key]}</p>
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
                <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '12px', color: 'var(--text-secondary)', margin: 0, letterSpacing: '1px' }}>
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
                          <span style={{ position: 'absolute', bottom: '8px', left: '8px', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: '#fff', background: 'rgba(0,0,0,0.4)', padding: '3px 8px', borderRadius: '4px' }}>
                            {label}
                          </span>
                        </div>
                        <p style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '13px', color: 'var(--text-primary)', margin: '8px 0 2px', letterSpacing: '-0.2px' }}>
                          {fmtDate(report.week_start)}
                        </p>
                        {report.weight && (
                          <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', color: 'var(--accent-primary)', margin: 0 }}>
                            {report.weight} кг
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  {weightDiffTotal !== null && (
                    <div style={{ marginTop: '16px', padding: '12px 16px', background: 'var(--accent-soft-bg)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', color: 'var(--text-secondary)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        За {totalWeeks} нед.
                      </span>
                      <span style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '22px', color: weightDiffTotal <= 0 ? 'var(--success)' : 'var(--error)', letterSpacing: '-0.5px' }}>
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
                          <p className="number-mount" style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '38px', color: 'var(--text-primary)', margin: 0, lineHeight: 1, letterSpacing: '-1.5px' }}>
                            {last.weight}
                          </p>
                          <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '9px', color: 'var(--text-secondary)', margin: '4px 0 0', letterSpacing: '2px', textTransform: 'uppercase' }}>Сейчас</p>
                        </div>
                        {weightDiffTotal !== null && (
                          <div style={{ borderLeft: '1px solid var(--divider)', paddingLeft: '16px' }}>
                            <p style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '24px', color: weightDiffTotal <= 0 ? 'var(--success)' : 'var(--error)', margin: 0, lineHeight: 1, letterSpacing: '-0.5px' }}>
                              {weightDiffTotal <= 0 ? '−' : '+'}{Math.abs(weightDiffTotal)}
                            </p>
                            <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '9px', color: 'var(--text-secondary)', margin: '4px 0 0', letterSpacing: '2px', textTransform: 'uppercase' }}>С начала</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={110}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8B1E3F" stopOpacity={0.18} />
                          <stop offset="100%" stopColor="#8B1E3F" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="#E8E1DA" />
                      <XAxis dataKey="date" tick={{ fontFamily: 'var(--font-text)', fontSize: 8, fill: '#B7ADA7' }} axisLine={false} tickLine={false} />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="weight"
                        stroke="#8B1E3F"
                        strokeWidth={1.5}
                        fill="url(#weightGrad)"
                        dot={{ fill: '#FBF8F5', stroke: '#8B1E3F', strokeWidth: 1.5, r: 3 }}
                        activeDot={{ fill: '#8B1E3F', r: 5, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* MEASUREMENTS SUMMARY */}
              {PARAMS.some(k => getParam(first, k) != null || getParam(last, k) != null) && (
                <div style={{ ...card }}>
                  <p style={{ ...LABEL }}>Замеры</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'var(--divider)', borderRadius: '8px', overflow: 'hidden' }}>
                    {PARAMS.map(key => {
                      const val = getParam(last, key)
                      const firstVal = getParam(first, key)
                      if (val == null && firstVal == null) return null
                      const diff = val != null && firstVal != null ? +(val - firstVal).toFixed(1) : null
                      return (
                        <div key={key} style={{ background: 'var(--bg-card-soft)', padding: '14px 10px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '3px' }}>
                            <p style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '20px', color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>{val ?? firstVal}</p>
                            {diff !== null && diff !== 0 && (
                              <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '10px', color: diff < 0 ? 'var(--success)' : 'var(--error)', lineHeight: 1 }}>
                                {diff < 0 ? `↓${Math.abs(diff)}` : `↑${diff}`}
                              </span>
                            )}
                          </div>
                          <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '9px', color: 'var(--text-tertiary)', margin: '5px 0 0', letterSpacing: '1px', textTransform: 'uppercase' }}>
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
                    (report.left_arm ?? report.arm) != null && `Рука ${report.left_arm ?? report.arm}`,
                  ].filter(Boolean).join(' · ')

                  return (
                    <div
                      key={report.id}
                      style={{ borderBottom: '1px solid var(--divider)' }}
                    >
                      {/* ROW */}
                      <div
                        onClick={() => setExpandedId(isExpanded ? null : report.id)}
                        className="pressable"
                        style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 0', cursor: 'pointer' }}
                      >
                        <div style={{ width: isLatest ? 8 : 6, height: isLatest ? 8 : 6, borderRadius: '50%', background: 'var(--accent-primary)', opacity: isLatest ? 1 : 0.4, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 2px' }}>
                            {fmtDate(report.week_start)}
                            {isLatest && isThisWeek(report.week_start) ? <span style={{ color: 'var(--accent-primary)', marginLeft: '6px' }}>· эта неделя</span> : ''}
                          </p>
                          {shortParams && (
                            <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '10px', color: 'var(--text-tertiary)', margin: 0 }}>{shortParams}</p>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          {report.weight != null && (
                            <span style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '18px', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                              {report.weight}
                            </span>
                          )}
                          {wDiff !== null && (
                            <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', color: wDiff <= 0 ? 'var(--success)' : 'var(--error)', marginLeft: '4px' }}>
                              {wDiff <= 0 ? `↓${Math.abs(wDiff)}` : `↑${wDiff}`}
                            </span>
                          )}
                        </div>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '10px', flexShrink: 0 }}>{isExpanded ? '▴' : '▾'}</span>
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
                          {PARAMS.some(k => getParam(report, k) != null) && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', marginBottom: '10px' }}>
                              {PARAMS.map(key => {
                                const val = getParam(report, key)
                                if (val == null) return null
                                return (
                                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--divider)', paddingBottom: '6px' }}>
                                    <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', color: 'var(--text-tertiary)' }}>{PARAM_LABELS[key]}</span>
                                    <span style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '15px', color: 'var(--text-primary)' }}>
                                      {val} <span style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '10px', color: 'var(--text-tertiary)' }}>см</span>
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          {report.notes && (
                            <p style={{ fontFamily: 'var(--font-primary)', fontWeight: 300, fontStyle: 'italic', fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
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
