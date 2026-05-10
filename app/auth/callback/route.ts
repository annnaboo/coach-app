import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  // Creates a client that writes session cookies onto `res`
  function makeClient(res: NextResponse) {
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(list) {
            list.forEach(({ name, value, options }) =>
              res.cookies.set(name, value, options)
            )
          },
        },
      }
    )
  }

  // Determine destination path from the user's role/onboarding state.
  // Uses the same supabase instance that just exchanged the token so the
  // session is already in memory — no need to re-read request cookies.
  async function roleRedirectPath(
    supabase: ReturnType<typeof createServerClient>
  ): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return '/'
    const { data: profile } = await supabase
      .from('profiles').select('role, onboarded').eq('id', user.id).single()
    if (profile?.role === 'coach') return '/coach'
    if (!profile?.onboarded) return '/welcome'
    return '/client'
  }

  // Copies Set-Cookie headers from a temp response onto the final redirect
  function withCookies(dest: NextResponse, cookieRes: NextResponse) {
    cookieRes.headers.getSetCookie().forEach(v =>
      dest.headers.append('Set-Cookie', v)
    )
    return dest
  }

  // ── token_hash flow (magic link, recovery, invite) ────────────────
  if (token_hash && type) {
    const cookieRes = NextResponse.next()
    const supabase = makeClient(cookieRes)

    if (type === 'invite') {
      const { error } = await supabase.auth.verifyOtp({ token_hash, type: 'invite' })
      if (!error) {
        return withCookies(NextResponse.redirect(`${origin}/auth/set-password`), cookieRes)
      }
    } else {
      const validTypes = ['magiclink', 'recovery', 'email', 'signup'] as const
      const safeType = validTypes.includes(type as typeof validTypes[number])
        ? (type as typeof validTypes[number])
        : null
      if (safeType) {
        const { error } = await supabase.auth.verifyOtp({ token_hash, type: safeType })
        if (!error) {
          const path = await roleRedirectPath(supabase)
          return withCookies(NextResponse.redirect(`${origin}${path}`), cookieRes)
        }
      }
    }
  }

  // ── PKCE code flow (same-device magic link, OAuth) ─────────────────
  if (code) {
    const cookieRes = NextResponse.next()
    const supabase = makeClient(cookieRes)
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const path = await roleRedirectPath(supabase)
      return withCookies(NextResponse.redirect(`${origin}${path}`), cookieRes)
    }
  }

  // ── Fallback ───────────────────────────────────────────────────────
  return NextResponse.redirect(`${origin}/`)
}
