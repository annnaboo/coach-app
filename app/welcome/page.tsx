'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'

const card: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--divider)',
  borderRadius: '20px',
  padding: '22px',
  marginBottom: '12px',
  boxShadow: 'var(--shadow-soft)',
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
                background: step >= s ? 'var(--accent-primary)' : 'var(--accent-soft-bg)',
              }} />
            ))}
          </div>

          {/* ── STEP 1: Приветствие ── */}
          {step === 1 && (
            <div style={{ animation: 'fadeSlideUp 0.4s cubic-bezier(0.22,1,0.36,1) both' }}>
              <h1 style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontStyle: 'italic', fontSize: '42px', color: 'var(--text-primary)', margin: '0 0 6px', lineHeight: 1.1, letterSpacing: '-1px' }}>
                Привет,{' '}
                <span style={{ color: 'var(--accent-primary)' }}>{name.split(' ')[0] || 'там'}</span>
                <span style={{ color: 'var(--accent-primary)' }}>.</span>
              </h1>
              <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '18px', color: 'var(--text-secondary)', margin: '0 0 32px', lineHeight: 1.45 }}>
                Твой персональный тренировочный дневник готов
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
                {FEATURES.map(f => (
                  <div key={f.title} style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ fontSize: '28px', flexShrink: 0 }}>{f.icon}</span>
                      <div>
                        <p style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '17px', color: 'var(--text-primary)', margin: '0 0 3px' }}>{f.title}</p>
                        <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{f.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep(2)}
                className="pressable"
                style={{
                  width: '100%', padding: '16px', borderRadius: '999px',
                  background: 'var(--accent-primary)', color: '#fff', border: 'none',
                  fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '16px',
                  cursor: 'pointer', letterSpacing: '0.3px',
                }}
              >
                Начнём →
              </button>
            </div>
          )}

          {/* ── STEP 2: Как это работает ── */}
          {step === 2 && (
            <div style={{ animation: 'fadeSlideUp 0.4s cubic-bezier(0.22,1,0.36,1) both' }}>
              <h1 style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '32px', color: 'var(--text-primary)', margin: '0 0 28px', letterSpacing: '-0.5px' }}>
                Как это работает
              </h1>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '36px' }}>
                {STEPS_HOW.map(s => (
                  <div key={s.n} style={{ ...card, padding: '18px 20px', marginBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                        background: 'var(--accent-soft-bg)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '16px', color: 'var(--accent-primary)',
                      }}>
                        {s.n}
                      </div>
                      <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '15px', color: 'var(--text-primary)', margin: 0, lineHeight: 1.4 }}>
                        {s.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setStep(1)}
                  className="pressable"
                  style={{
                    padding: '16px 24px', borderRadius: '999px',
                    background: 'var(--bg-card-soft)', color: 'var(--text-secondary)', border: '1px solid var(--divider)',
                    fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '15px', cursor: 'pointer',
                  }}
                >
                  ←
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="pressable"
                  style={{
                    flex: 1, padding: '16px', borderRadius: '999px',
                    background: 'var(--accent-primary)', color: '#fff', border: 'none',
                    fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '16px', cursor: 'pointer',
                  }}
                >
                  Понятно →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Готово ── */}
          {step === 3 && (
            <div style={{ animation: 'fadeSlideUp 0.4s cubic-bezier(0.22,1,0.36,1) both', textAlign: 'center', paddingTop: '40px' }}>
              {/* Animated checkmark */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
                <div style={{
                  width: '96px', height: '96px', borderRadius: '50%',
                  background: 'var(--success-bg)', border: '2px solid rgba(74,143,110,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'fadeSlideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}>
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <path
                      d="M10 24L20 34L38 14"
                      stroke="var(--success)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              <h1 style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '32px', color: 'var(--text-primary)', margin: '0 0 10px' }}>
                Всё готово!
              </h1>
              <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '16px', color: 'var(--text-secondary)', margin: '0 0 48px' }}>
                Твой тренер уже ждёт тебя
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={finish}
                  disabled={finishing}
                  className="pressable"
                  style={{
                    padding: '16px', borderRadius: '999px',
                    background: 'var(--accent-primary)', color: '#fff', border: 'none',
                    fontFamily: 'var(--font-text)', fontWeight: 500, fontSize: '16px',
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
    </div>
  )
}
