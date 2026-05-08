'use client'
// #54 — This page previously contained hardcoded workout data for a specific client,
// creating a data-leak risk: any user without a scheduled workout was silently routed here.
// It has been replaced with a redirect back to /client.
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'

export default function WorkoutLegacyPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/client')
  }, [router])

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <AnimatedBackground />
      <p style={{ position: 'relative', zIndex: 1, fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '14px', color: 'rgba(45,31,14,0.4)' }}>
        Загружаем...
      </p>
    </div>
  )
}
