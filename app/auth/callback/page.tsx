'use client'
import { Suspense, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'

/**
 * Auth callback — handles ALL three Supabase auth flows:
 *
 *  1. PKCE code flow  (?code=xxx)
 *     — same-device magic link, OAuth
 *
 *  2. OTP / invite / recovery flow  (?token_hash=xxx&type=…)
 *     — cross-device magic link, invite emails, password reset
 *
 *  3. Implicit hash flow  (#access_token=xxx)
 *     — legacy or when Supabase redirects with hash fragment
 *     — handled automatically by createBrowserClient (detectSessionInUrl=true)
 *
 * Why client-side?  The Route Handler can't read URL hash fragments (#…)
 * because the browser never sends them to the server.  Moving this logic
 * to a client component lets us handle all three flows in one place.
 */
function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const supabase = createClient()
    const code      = searchParams.get('code')
    const tokenHash = searchParams.get('token_hash')
    const type      = searchParams.get('type') as
      | 'recovery' | 'invite' | 'email' | 'signup' | 'magiclink'
      | null
    // #74 — validate `next` to prevent open redirect: only allow relative paths
    const rawNext = searchParams.get('next') ?? '/client'
    const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/client'

    async function handle() {
      try {
        if (code) {
          // ── Flow 1: PKCE ─────────────────────────────────────────────────
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error

        } else if (tokenHash && type) {
          // ── Flow 2: OTP token hash ────────────────────────────────────────
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
          if (error) throw error
        }
        // ── Flow 3: hash fragment is auto-processed by detectSessionInUrl ──
        // getSession() resolves the session regardless of which flow ran.
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          router.replace('/?error=auth')
          return
        }

        // Route by action type
        if (type === 'recovery') {
          router.replace('/auth/set-password')
        } else if (type === 'invite') {
          router.replace('/welcome')
        } else {
          router.replace(next)
        }
      } catch (err) {
        console.error('[auth/callback]', err)
        router.replace('/?error=auth')
      }
    }

    handle()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#f5f0e8', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <AnimatedBackground />
      <p style={{ position: 'relative', zIndex: 1, fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '14px', color: 'rgba(45,31,14,0.4)' }}>
        Входим...
      </p>
    </div>
  )
}

// useSearchParams() requires a Suspense boundary in Next.js App Router
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#f5f0e8', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <AnimatedBackground />
        <p style={{ position: 'relative', zIndex: 1, fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '14px', color: 'rgba(45,31,14,0.4)' }}>
          Входим...
        </p>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  )
}
