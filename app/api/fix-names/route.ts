import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// ONE-TIME FIX: swap mixed-up names for Виктория and Карина
// DELETE THIS FILE after running once.
export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [res1, res2] = await Promise.all([
    supabase.from('profiles').update({ name: 'Виктория' }).eq('id', 'fcbc97bc-0051-4654-a61f-f1ce3f38562d'),
    supabase.from('profiles').update({ name: 'Карина' }).eq('id', '292fe676-9523-496b-b410-92ea1247f55d'),
  ])

  if (res1.error || res2.error) {
    return NextResponse.json({ error: res1.error?.message || res2.error?.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, updated: ['Виктория (fcbc97bc)', 'Карина (292fe676)'] })
}
