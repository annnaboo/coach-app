import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, name, password } = await request.json()

  if (!email || !name || !password) {
    return NextResponse.json({ error: 'Необходимо заполнить имя, email и пароль' }, { status: 400 })
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
