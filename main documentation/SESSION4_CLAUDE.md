# Session 4 — /coach/clients/[id] full client profile page

Next.js 14 App Router + TypeScript + Supabase.
Design: bg #f5f0e8, accent #7a4a20, text #2d1f0e.
Fonts: Epilogue (italic headings) + Chillax (weight 300).
Cards: `borderBottom: '1px solid rgba(45,31,14,0.08)', padding: '28px 0'` — NO glassmorphism.

---

## Goal

Create a new page at `app/coach/clients/[id]/page.tsx`.

When coach taps on a client card in `/coach`, it navigates to `/coach/clients/{clientId}`.
This page shows a complete profile of that client from the coach's perspective.

Add the navigation in `app/coach/page.tsx`: make each client's name/avatar clickable:
```tsx
onClick={() => router.push(`/coach/clients/${client.id}`)}
```

---

## Page structure: app/coach/clients/[id]/page.tsx

```tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'
```

### Data to fetch (all for this specific clientId = params.id):

```tsx
const clientId = params.id as string

// 1. Profile
supabase.from('profiles').select('name, height_cm').eq('id', clientId).single()

// 2. Latest payment
supabase.from('payments').select('*').eq('player_id', clientId)
  .order('created_at', { ascending: false }).limit(1)

// 3. Last 8 weekly reports
supabase.from('weekly_reports')
  .select('week_start, weight, chest, waist, hips, waist_navel, left_thigh, right_thigh, left_arm, right_arm, notes, photo_front')
  .eq('player_id', clientId)
  .order('week_start', { ascending: false })
  .limit(8)

// 4. All workout logs (for stats)
supabase.from('workout_logs')
  .select('exercise_id, w1, w2, w3, saved_at')
  .eq('player', clientId)
  .order('saved_at', { ascending: false })

// 5. Current program
supabase.from('programs')
  .select('title, workout_ids, start_date, end_date')
  .eq('is_active', true)
  .contains('assigned_to', [clientId])
  .limit(1)

// 6. Latest coach feedback sent to this client
supabase.from('coach_feedback')
  .select('message, created_at')
  .eq('client_id', clientId)
  .order('created_at', { ascending: false })
  .limit(3)

// 7. This week's schedule
supabase.from('workout_schedule')
  .select('scheduled_date, workouts(title)')
  .eq('player_id', clientId)
  .gte('scheduled_date', mondayStr)
  .lte('scheduled_date', sundayStr)

// 8. Mood logs (last 7 days)
supabase.from('mood_logs')
  .select('mood, energy, muscle_pain, logged_date')
  .eq('player_id', clientId)
  .gte('logged_date', sevenDaysAgoStr)
  .order('logged_date', { ascending: false })
```

Get signed URL for latest report photo if exists:
```tsx
if (latestReport?.photo_front) {
  const { data } = await supabase.storage.from('reports').createSignedUrl(latestReport.photo_front, 3600)
  setLatestPhotoUrl(data?.signedUrl || null)
}
```

---

### Page layout (top to bottom):

**HEADER:**
```
← Клиенты

[Avatar initials circle]  Anna I.
                          ✓ До 15 мая  (payment badge — same getPaymentStatus logic as Session 3)
                          Программа: Bikini Prep 8w  (if active program)
```

**SECTION: Динамика веса**
- Shows first weight → current weight with delta
- Mini bar chart (CSS bars, no library needed) from last 8 reports
- Same pattern as exercise progress chart in history page

**SECTION: Замеры** (latest report values with deltas from first)
- Grid 3×2: Грудь, Талия, Пупок, Бёдра, Лев. бедро, Прав. бедро, Лев. рука, Прав. рука
- Each cell: current value + ↑↓ delta

**SECTION: Эта неделя** (workout schedule for current week)
- 7 days Mon–Sun, show which workout is scheduled each day
- Days with workout: workout title; empty days: "—"

**SECTION: Самочувствие** (last 7 days mood logs)
- Simple row of 7 circles, colored by mood score (1–5)
  - 1–2: rgba(138,37,32,0.3), 3: rgba(45,31,14,0.15), 4–5: rgba(26,122,60,0.3)
- Below each circle: date abbreviation

**SECTION: Статистика тренировок**
- Total sessions (count of unique saved_at dates in workout_logs)
- Last session date
- Most trained exercise (most frequent exercise_id)

**SECTION: Последние отзывы тренера** (if any coach_feedback exists)
- List last 3 messages with date

**SECTION: Написать клиенту** (send new feedback)
- Same feedback input as in coach/page.tsx
- Insert to coach_feedback table

---

### Design notes:
- All sections use `borderBottom: '1px solid rgba(45,31,14,0.08)', padding: '28px 0'`
- LABEL style: `fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.3)', margin: '0 0 16px'`
- Big numbers: `fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '40px', letterSpacing: '-1.5px'`
- No glassmorphism anywhere

---

## After

```bash
npx tsc --noEmit --skipLibCheck
git add app/coach/clients/
git commit -m "feat: coach client profile page /coach/clients/[id]"
git push
```
