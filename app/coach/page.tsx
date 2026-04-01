'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const bg: React.CSSProperties = {
  background: `
    radial-gradient(ellipse 110% 60% at 50% -5%, #16573a 0%, transparent 65%),
    radial-gradient(ellipse 50% 50% at 100% 100%, #020d07 0%, transparent 55%),
    linear-gradient(170deg, #0b3d28 0%, #051610 100%)
  `,
  minHeight: '100vh',
  padding: '24px',
}

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '24px',
  padding: '28px',
  marginBottom: '12px',
}

const EXERCISE_NAMES: Record<string, string> = {
  'foam': 'Валик', 'ankle': 'Голеностоп', 'glute-bridge': 'Ягодичный мост',
  'bird-dog': 'Bird Dog', 'wall-squat': 'Присед у стены', 'box-squat': 'Присед на тумбу',
  'rdl': 'Румынская тяга', 'db-press': 'Жим лёжа', 'lat-pulldown': 'Тяга верхнего блока',
  'cable-row': 'Тяга горизонтального блока', 'abductor': 'Разведение ног', 'dead-bug': 'Dead Bug',
}

type Client = {
  id: string
  name: string
  lastSeen: string | null
  logs: any[]
}

export default function CoachPage() {
  const [coachName, setCoachName] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [openClient, setOpenClient] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/'); return }

      const { data: prof } = await supabase
        .from('profiles')
        .select('name, role')
        .eq('id', data.user.id)
        .single()

      if (prof?.role !== 'coach') { router.push('/client'); return }
      setCoachName(prof.name || 'Тренер')

      // Загружаем всех клиентов
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('role', 'client')

      if (!profiles) { setLoading(false); return }

      // Загружаем логи для каждого клиента
      const clientsData: Client[] = await Promise.all(
        profiles.map(async (p) => {
          const { data: logs } = await supabase
            .from('workout_logs')
            .select('*')
            .eq('player', p.id)
            .order('saved_at', { ascending: false })
            .limit(20)

          const lastSeen = logs?.[0]?.saved_at || null
          return { id: p.id, name: p.name, lastSeen, logs: logs || [] }
        })
      )

      setClients(clientsData)
      setLoading(false)
    })
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    })
  }

  // Берём последний лог по каждому упражнению для клиента
  function getLatestPerExercise(logs: any[]) {
    const seen = new Set<string>()
    return logs.filter(log => {
      if (seen.has(log.exercise_id)) return false
      seen.add(log.exercise_id)
      return true
    })
  }

  if (loading) return (
    <div style={{ ...bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'Chillax, sans-serif', color: 'rgba(255,255,255,0.4)', fontSize: '16px' }}>
        Загружаем...
      </p>
    </div>
  )

  return (
    <div style={bg}>
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{
              fontFamily: 'Epilogue, sans-serif',
              fontWeight: 400,
              color: '#CFA764',
              fontSize: '32px',
              margin: 0,
              lineHeight: 1.1,
            }}>
              {coachName}.
            </h1>
            <p style={{
              fontFamily: 'Chillax, sans-serif',
              fontWeight: 300,
              color: 'rgba(255,255,255,0.4)',
              fontSize: '13px',
              margin: '4px 0 0',
            }}>
              Тренерский дашборд
            </p>
          </div>
          <button onClick={handleLogout} style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '999px',
            color: 'rgba(255,255,255,0.5)',
            fontFamily: 'Chillax, sans-serif',
            fontWeight: 300,
            fontSize: '13px',
            padding: '8px 20px',
            cursor: 'pointer',
          }}>
            Выйти
          </button>
        </div>

        {/* СТАТИСТИКА */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          <div style={{ ...glassCard, marginBottom: 0, textAlign: 'center' }}>
            <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, color: '#CFA764', fontSize: '36px', margin: '0 0 4px' }}>
              {clients.length}
            </p>
            <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: 0, letterSpacing: '1px', textTransform: 'uppercase' }}>
              Клиентов
            </p>
          </div>
          <div style={{ ...glassCard, marginBottom: 0, textAlign: 'center' }}>
            <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, color: '#CFA764', fontSize: '36px', margin: '0 0 4px' }}>
              {clients.reduce((sum, c) => sum + c.logs.length, 0)}
            </p>
            <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: 0, letterSpacing: '1px', textTransform: 'uppercase' }}>
              Записей всего
            </p>
          </div>
        </div>

        {/* КЛИЕНТЫ */}
        <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: '0 0 12px' }}>
          Клиенты
        </p>

        {clients.map(client => (
          <div key={client.id} style={glassCard}>

            {/* КЛИЕНТ ХЕДЕР */}
            <div
              onClick={() => setOpenClient(openClient === client.id ? null : client.id)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '42px', height: '42px',
                  borderRadius: '50%',
                  background: 'rgba(207,167,100,0.2)',
                  border: '1px solid rgba(207,167,100,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Epilogue, sans-serif',
                  fontWeight: 400,
                  fontSize: '16px',
                  color: '#CFA764',
                }}>
                  {client.name[0]}
                </div>
                <div>
                  <h3 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, color: '#ffffff', fontSize: '20px', margin: 0 }}>
                    {client.name}
                  </h3>
                  <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: '2px 0 0' }}>
                    {client.lastSeen ? `Последняя запись: ${formatDate(client.lastSeen)}` : 'Ещё нет записей'}
                  </p>
                </div>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px' }}>
                {openClient === client.id ? '▴' : '▾'}
              </span>
            </div>

            {/* ЛОГИ КЛИЕНТА */}
            {openClient === client.id && (
              <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '20px' }}>
                {client.logs.length === 0 ? (
                  <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(255,255,255,0.25)', fontSize: '14px', textAlign: 'center', padding: '16px 0' }}>
                    Пока нет данных
                  </p>
                ) : (
                  getLatestPerExercise(client.logs).map(log => (
                    <div key={log.id} style={{
                      background: 'rgba(255,255,255,0.04)',
                      borderRadius: '16px',
                      padding: '14px 18px',
                      marginBottom: '8px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, color: '#ffffff', fontSize: '15px', margin: 0 }}>
                          {EXERCISE_NAMES[log.exercise_id] || log.exercise_id}
                        </p>
                        <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(255,255,255,0.25)', fontSize: '11px', margin: 0 }}>
                          {formatDate(log.saved_at)}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {log.w1 && <span style={{ background: 'rgba(207,167,100,0.15)', borderRadius: '999px', padding: '3px 12px', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: '#CFA764' }}>П1: {log.w1}кг</span>}
                        {log.w2 && <span style={{ background: 'rgba(207,167,100,0.15)', borderRadius: '999px', padding: '3px 12px', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: '#CFA764' }}>П2: {log.w2}кг</span>}
                        {log.w3 && <span style={{ background: 'rgba(207,167,100,0.15)', borderRadius: '999px', padding: '3px 12px', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: '#CFA764' }}>П3: {log.w3}кг</span>}
                        {log.reps && <span style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '999px', padding: '3px 12px', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{log.reps} повт</span>}
                        {log.t1 && <span style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '999px', padding: '3px 12px', fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{log.t1}сек</span>}
                      </div>
                      {log.notes && (
                        <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '8px 0 0', lineHeight: 1.6 }}>
                          "{log.notes}"
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}

      </div>
    </div>
  )
}