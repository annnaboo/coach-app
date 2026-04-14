'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.55)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.7)',
  borderRadius: '20px',
  padding: '22px',
  marginBottom: '12px',
}

export default function WelcomePage() {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/'); return }
      setUserId(data.user.id)
      const { data: prof } = await supabase
        .from('profiles')
        .select('name, role, onboarded')
        .eq('id', data.user.id)
        .single()
      if (prof?.role === 'coach') { router.push('/coach'); return }
      if (prof?.onboarded) { router.push('/client'); return }
      setName(prof?.name || '')
    })
  }, [])

  async function finish() {
    if (!userId || finishing) return
    setFinishing(true)
    const supabase = createClient()
    await supabase.from('profiles').update({ onboarded: true }).eq('id', userId)
    router.push('/client')
  }

  const FEATURES = [
    { icon: '💪', title: 'Тренировки', desc: 'Открывай занятие, записывай веса и ощущения' },
    { icon: '📊', title: 'Прогресс', desc: 'Следи как растут твои результаты' },
    { icon: '📝', title: 'Отчёты', desc: 'Сдавай еженедельные замеры и фото тренеру' },
  ]

  const STEPS_HOW = [
    { n: '1', text: 'Каждую неделю открывай своё занятие' },
    { n: '2', text: 'Записывай вес по каждому упражнению' },
    { n: '3', text: 'Отмечай самочувствие — настроение и энергию' },
    { n: '4', text: 'Раз в неделю сдавай отчёт с замерами и фото' },
  ]

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />

      <div style={{ position: 'relative', zIndex: 1, padding: '40px 20px 60px' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>

          {/* Step indicator */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '36px', justifyContent: 'center' }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{
                height: '4px', borderRadius: '999px', transition: 'all 0.3s ease',
                width: step === s ? '28px' : '14px',
                background: step >= s ? '#7a4a20' : 'rgba(122,74,32,0.2)',
              }} />
            ))}
          </div>

          {/* ── STEP 1: Приветствие ── */}
          {step === 1 && (
            <div style={{ animation: 'fadeIn 0.4s ease' }}>
              <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontStyle: 'italic', fontSize: '42px', color: '#2d1f0e', margin: '0 0 6px', lineHeight: 1.1, letterSpacing: '-1px' }}>
                Привет,{' '}
                <span style={{ color: '#7a4a20' }}>{name.split(' ')[0] || 'там'}</span>
                <span style={{ color: '#7a4a20' }}>.</span>
              </h1>
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '18px', color: 'rgba(45,31,14,0.55)', margin: '0 0 32px', lineHeight: 1.45 }}>
                Твой персональный тренировочный дневник готов
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
                {FEATURES.map(f => (
                  <div key={f.title} style={glass}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ fontSize: '28px', flexShrink: 0 }}>{f.icon}</span>
                      <div>
                        <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '17px', color: '#2d1f0e', margin: '0 0 3px' }}>{f.title}</p>
                        <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px', color: 'rgba(45,31,14,0.5)', margin: 0 }}>{f.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep(2)}
                style={{
                  width: '100%', padding: '16px', borderRadius: '999px',
                  background: '#7a4a20', color: '#fff', border: 'none',
                  fontFamily: 'Chillax, sans-serif', fontWeight: 500, fontSize: '16px',
                  cursor: 'pointer', letterSpacing: '0.3px',
                }}
              >
                Начнём →
              </button>
            </div>
          )}

          {/* ── STEP 2: Как это работает ── */}
          {step === 2 && (
            <div style={{ animation: 'fadeIn 0.4s ease' }}>
              <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '32px', color: '#2d1f0e', margin: '0 0 28px', letterSpacing: '-0.5px' }}>
                Как это работает
              </h1>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '36px' }}>
                {STEPS_HOW.map(s => (
                  <div key={s.n} style={{ ...glass, padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                        background: 'rgba(122,74,32,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '16px', color: '#7a4a20',
                      }}>
                        {s.n}
                      </div>
                      <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '15px', color: '#2d1f0e', margin: 0, lineHeight: 1.4 }}>
                        {s.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setStep(1)}
                  style={{
                    padding: '16px 24px', borderRadius: '999px',
                    background: 'rgba(0,0,0,0.06)', color: 'rgba(45,31,14,0.5)', border: 'none',
                    fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '15px', cursor: 'pointer',
                  }}
                >
                  ←
                </button>
                <button
                  onClick={() => setStep(3)}
                  style={{
                    flex: 1, padding: '16px', borderRadius: '999px',
                    background: '#7a4a20', color: '#fff', border: 'none',
                    fontFamily: 'Chillax, sans-serif', fontWeight: 500, fontSize: '16px', cursor: 'pointer',
                  }}
                >
                  Понятно →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Готово ── */}
          {step === 3 && (
            <div style={{ animation: 'fadeIn 0.4s ease', textAlign: 'center', paddingTop: '40px' }}>
              {/* Animated checkmark */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
                <div style={{
                  width: '96px', height: '96px', borderRadius: '50%',
                  background: 'rgba(26,122,60,0.1)', border: '2px solid rgba(26,122,60,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}>
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <path
                      d="M10 24L20 34L38 14"
                      stroke="#1a7a3c"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ animation: 'drawCheck 0.5s ease 0.2s both' }}
                    />
                  </svg>
                </div>
              </div>

              <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '32px', color: '#2d1f0e', margin: '0 0 10px' }}>
                Всё готово!
              </h1>
              <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '16px', color: 'rgba(45,31,14,0.5)', margin: '0 0 48px' }}>
                Твой тренер уже ждёт тебя
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={finish}
                  disabled={finishing}
                  style={{
                    padding: '16px', borderRadius: '999px',
                    background: '#7a4a20', color: '#fff', border: 'none',
                    fontFamily: 'Chillax, sans-serif', fontWeight: 500, fontSize: '16px',
                    cursor: finishing ? 'not-allowed' : 'pointer',
                    opacity: finishing ? 0.7 : 1,
                  }}
                >
                  {finishing ? 'Переходим...' : 'Перейти в приложение'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        @keyframes drawCheck {
          from { stroke-dasharray: 60; stroke-dashoffset: 60; }
          to   { stroke-dasharray: 60; stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  )
}
