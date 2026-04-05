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

function fmtWeek(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

function WeightChart({ reports }: { reports: Report[] }) {
  const withWeight = [...reports].reverse().filter(r => r.weight !== null)
  if (withWeight.length < 2) return null

  const weights = withWeight.map(r => r.weight as number)
  const minW = Math.min(...weights)
  const maxW = Math.max(...weights)
  const range = maxW - minW || 1

  const W = 280
  const H = 80
  const PAD = 12

  const points = weights.map((w, i) => ({
    x: PAD + (i / (weights.length - 1)) * (W - PAD * 2),
    y: H - PAD - ((w - minW) / range) * (H - PAD * 2),
  }))

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ')

  const first = weights[0]
  const last = weights[weights.length - 1]
  const diff = +(last - first).toFixed(1)
  const diffColor = diff <= 0 ? '#1a7a3c' : '#8a2520'
  const diffStr = diff > 0 ? `+${diff}` : `${diff}`

  return (
    <div style={glass}>
      <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.35)', margin: '0 0 16px' }}>
        Динамика веса
      </p>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(122,74,32,0.3)" />
            <stop offset="100%" stopColor="#7a4a20" />
          </linearGradient>
        </defs>
        <polyline
          points={polyline}
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 5 : 3}
            fill={i === points.length - 1 ? '#7a4a20' : 'rgba(255,255,255,0.9)'}
            stroke="#7a4a20"
            strokeWidth="1.5"
          />
        ))}
      </svg>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.5)' }}>
          Начало: <strong style={{ color: '#2d1f0e' }}>{first}кг</strong>
        </span>
        <span style={{ color: 'rgba(45,31,14,0.25)', fontSize: '10px' }}>→</span>
        <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.5)' }}>
          Сейчас: <strong style={{ color: '#2d1f0e' }}>{last}кг</strong>
        </span>
        <span style={{ color: 'rgba(45,31,14,0.25)', fontSize: '10px' }}>→</span>
        <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 500, fontSize: '12px', color: diffColor }}>
          {diffStr}кг
        </span>
      </div>
    </div>
  )
}

export default function ReportsHistoryPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [modalUrl, setModalUrl] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/'); return }

      const { data: rows } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('player_id', data.user.id)
        .order('week_start', { ascending: false })

      if (!rows) { setLoading(false); return }

      // Get signed URLs
      for (const row of rows) {
        for (const key of ['photo_front', 'photo_side', 'photo_back'] as const) {
          const path = row[key]
          if (path) {
            const { data: s } = await supabase.storage.from('reports').createSignedUrl(path, 3600)
            if (s) row[`${key}_url`] = s.signedUrl
          }
        }
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

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />

      {/* PHOTO MODAL */}
      {modalUrl && (
        <div
          onClick={() => setModalUrl(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          <button
            onClick={() => setModalUrl(null)}
            style={{
              position: 'absolute', top: '20px', right: '20px',
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
              width: '36px', height: '36px', color: '#fff', fontSize: '18px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
          <img
            src={modalUrl}
            alt=""
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '16px', objectFit: 'contain' }}
          />
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 1, padding: '28px 20px 60px' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>

          {/* HEADER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
            <button
              onClick={() => router.push('/client')}
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
              <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, color: '#2d1f0e', fontSize: '24px', margin: 0 }}>
                Мои отчёты
              </h1>
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: '#7a4a20', margin: 0 }}>
                История замеров
              </p>
            </div>
          </div>

          {reports.length === 0 ? (
            /* EMPTY STATE */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', textAlign: 'center', gap: '12px' }}>
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                <rect x="8" y="6" width="34" height="44" rx="5" stroke="rgba(45,31,14,0.2)" strokeWidth="2" fill="none" />
                <path d="M16 18h20M16 26h20M16 34h12" stroke="rgba(45,31,14,0.2)" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <h2 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, color: '#2d1f0e', fontSize: '20px', margin: 0 }}>
                Ещё нет отчётов
              </h2>
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '14px', color: 'rgba(45,31,14,0.4)', margin: 0 }}>
                Заполни первый отчёт — он появится здесь
              </p>
              <button
                onClick={() => router.push('/report')}
                style={{
                  marginTop: '8px', padding: '12px 28px', borderRadius: '999px',
                  background: '#7a4a20', color: '#fff', border: 'none',
                  fontFamily: 'Chillax, sans-serif', fontWeight: 500, fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Отправить отчёт
              </button>
            </div>
          ) : (
            <>
              {/* WEIGHT CHART */}
              <WeightChart reports={reports} />

              {/* REPORTS LIST */}
              {reports.map((report, idx) => {
                const prev = reports[idx + 1]
                const weightDiff = report.weight !== null && prev?.weight !== null && prev?.weight !== undefined
                  ? +(report.weight - prev.weight).toFixed(1)
                  : null

                const photos = [
                  report.photo_front_url,
                  report.photo_side_url,
                  report.photo_back_url,
                ].filter(Boolean) as string[]

                const params: { label: string; value: number | null; unit: string }[] = [
                  { label: 'Грудь', value: report.chest, unit: 'см' },
                  { label: 'Талия', value: report.waist, unit: 'см' },
                  { label: 'Пупок', value: report.waist_navel, unit: 'см' },
                  { label: 'Бёдра', value: report.hips, unit: 'см' },
                  { label: 'Бедро', value: report.one_thigh, unit: 'см' },
                  { label: 'Рука', value: report.arm, unit: 'см' },
                ].filter(p => p.value !== null)

                return (
                  <div key={report.id} style={glass}>
                    {/* A — HEADER */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                      <div>
                        <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: 'rgba(45,31,14,0.4)', margin: '0 0 2px', letterSpacing: '0.5px' }}>
                          Неделя {fmtWeek(report.week_start)}
                        </p>
                        <span style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 300, fontSize: '32px', color: '#2d1f0e', lineHeight: 1 }}>
                          {report.weight ?? '—'}
                        </span>
                        <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '14px', color: 'rgba(45,31,14,0.4)', marginLeft: '4px' }}>кг</span>
                      </div>
                      {weightDiff !== null && (
                        <span style={{
                          fontFamily: 'Chillax, sans-serif', fontWeight: 500, fontSize: '12px',
                          padding: '4px 10px', borderRadius: '999px',
                          background: weightDiff <= 0 ? 'rgba(26,122,60,0.1)' : 'rgba(138,37,32,0.08)',
                          color: weightDiff <= 0 ? '#1a7a3c' : '#8a2520',
                          border: weightDiff <= 0 ? '1px solid rgba(26,122,60,0.2)' : '1px solid rgba(138,37,32,0.15)',
                          marginTop: '6px',
                        }}>
                          {weightDiff > 0 ? `+${weightDiff}` : `${weightDiff}`} кг
                        </span>
                      )}
                    </div>

                    {/* B — PHOTOS */}
                    {photos.length > 0 && (
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                        {photos.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt=""
                            onClick={() => setModalUrl(url)}
                            style={{
                              width: '80px', height: '80px', objectFit: 'cover',
                              borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)',
                              cursor: 'pointer',
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {/* C — PARAMS */}
                    {params.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: '12px' }}>
                        {params.map(({ label, value, unit }) => (
                          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: 'rgba(45,31,14,0.35)' }}>
                              {label}
                            </span>
                            <span>
                              <span style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 300, fontSize: '16px', color: '#2d1f0e' }}>{value}</span>
                              <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: 'rgba(45,31,14,0.35)', marginLeft: '2px' }}>{unit}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* D — NOTES */}
                    {report.notes && (
                      <p style={{
                        fontFamily: 'Epilogue, sans-serif', fontWeight: 300, fontSize: '13px',
                        color: 'rgba(45,31,14,0.5)', fontStyle: 'italic', margin: 0,
                      }}>
                        "{report.notes}"
                      </p>
                    )}
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
