import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const callerClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(list) {
          try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )

  const { data: { user } } = await callerClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await callerClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email, name, password } = await request.json()

  if (!email || !name || !password) {
    return NextResponse.json({ error: 'Необходимо заполнить имя, email и пароль' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Пароль — минимум 6 символов' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Create the user with a coach-defined password — no invite email sent.
  // email_confirm: true skips the confirmation email so they can log in immediately.
  const { data, error } = await supabase.auth.admin.createUser({
    email: email.trim(),
    password: password,
    email_confirm: true,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await supabase.from('profiles').upsert({
    id: data.user.id,
    name: name.trim(),
    role: 'client',
    onboarded: false,
  }, { onConflict: 'id' })

  return NextResponse.json({ success: true })
}
