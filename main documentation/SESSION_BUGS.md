# Bug Fix Session — 4 issues

This is a Next.js 14 App Router + Supabase project (TypeScript).
Design tokens: bg #f5f0e8, accent #7a4a20, text #2d1f0e.
Fonts: Epilogue (headings, italic) + Chillax (body, weight 300).
All cards use: `borderBottom: '1px solid rgba(45,31,14,0.08)', padding: '28px 0'` — NO glassmorphism.

---

## Fix 1 — Remove "Мой прогресс" button in client dashboard

**File:** `app/client/page.tsx`

In the ACTION BUTTONS section at the bottom of the page, find and remove this button entirely:

```tsx
<button onClick={() => router.push('/progress')} ...>
  Мой прогресс →
</button>
```

The `/progress` route is no longer needed as a standalone page — progress is now in `/history` (tab 2).
Also change the "История отчётов →" button to say **"Мои отчёты →"**.

---

## Fix 2 — Double login bug

**Symptom:** User has to log in twice to access the app. After entering credentials and being redirected, the app sends them back to `/` (login page) and they have to log in again.

**Investigate and fix:**
1. Check `middleware.ts` (if exists) — verify it's not blocking authenticated sessions
2. Check the login page (`app/page.tsx` or `app/login/page.tsx`) — ensure `supabase.auth.getUser()` or `supabase.auth.getSession()` is checked BEFORE rendering the login form, and redirects to `/client` or `/coach` if already authenticated
3. Check `app/client/page.tsx` and `app/coach/page.tsx` — the `useEffect` fetches the user and redirects to `/` if no user found. Make sure this doesn't fire on first render before the session is hydrated
4. Common fix: use `supabase.auth.onAuthStateChange` or add a brief loading state before redirect decisions

---

## Fix 3 — Height field + left/right measurements in weekly reports

### 3a. SQL migration (run in Supabase Dashboard)

```sql
-- Add new measurement columns to weekly_reports
ALTER TABLE weekly_reports
  ADD COLUMN IF NOT EXISTS height_cm numeric(5,1),
  ADD COLUMN IF NOT EXISTS left_thigh numeric(5,1),
  ADD COLUMN IF NOT EXISTS right_thigh numeric(5,1),
  ADD COLUMN IF NOT EXISTS left_arm numeric(5,1),
  ADD COLUMN IF NOT EXISTS right_arm numeric(5,1);

-- Keep one_thigh and arm columns for backward compatibility (don't drop them)
```

### 3b. Height logic

Height should be:
- Entered once in profiles table (`height_cm` column — already exists)
- Pre-filled in the report form from `profiles.height_cm`
- If user changes it in the report form, update BOTH `weekly_reports.height_cm` AND `profiles.height_cm`
- Show it in reports history as a static field (doesn't change week to week unless edited)

### 3c. Files to update

**`app/report/page.tsx`** (weekly report form):
- Add `height_cm` input field — pre-filled from `profiles.height_cm`, editable
- Replace single `one_thigh` field with TWO fields: `left_thigh` and `right_thigh`
- Replace single `arm` field with TWO fields: `left_arm` and `right_arm`
- When saving: if height was changed, also run `supabase.from('profiles').update({ height_cm }).eq('id', userId)`

**`app/reports-history/page.tsx`**:
- Update `Report` type to add: `height_cm, left_thigh, right_thigh, left_arm, right_arm`
- Update `PARAM_LABELS` to include new fields:
  ```ts
  left_thigh: 'Лев. бедро', right_thigh: 'Прав. бедро',
  left_arm: 'Лев. рука', right_arm: 'Прав. рука'
  ```
- Show `height_cm` in the summary header (it's static — show once at top, not per-week)
- Replace `one_thigh` → show `left_thigh` + `right_thigh` in the grid
- Replace `arm` → show `left_arm` + `right_arm` in the grid
- Update `PARAMS` array:
  ```ts
  const PARAMS = ['chest', 'waist', 'waist_navel', 'hips', 'left_thigh', 'right_thigh', 'left_arm', 'right_arm'] as const
  ```

---

## Fix 4 — Workout sequence logic

**Current behaviour:** Program has ordered workouts `[A, B, C, D]`. The app calculates which workout to show today based on `Math.floor(weeksSinceStart % workoutCount)` — purely calendar-based.

**New behaviour:**
The coach sets a sequence. The sequence is the default order, but the user's actual history determines what comes next.

**Logic:**
1. Look at `workout_schedule` for this user — find the LAST workout they actually had scheduled (most recent `scheduled_date` with a workout assigned)
2. Find that workout's index in `program.workout_ids`
3. The NEXT workout in the sequence = index + 1 (wraps around)
4. If the user has never scheduled a workout yet → use the first in the sequence (index 0)
5. The user can still manually assign any workout from the picker — this overrides for that day
6. When they assign a workout manually, it becomes the new "last done" for sequence calculation

**File:** `app/client/page.tsx`

Replace the current program workout calculation (the block starting with `const weekOffset = ...`) with this new logic. The state variables `programTodayId`, `programTodayWorkout` should reflect the NEXT workout in sequence.

Also in the AVAILABLE WORKOUTS section: highlight the "next in sequence" workout with a subtle badge like `Следующая →` instead of or alongside `На сегодня`.

```
Current:
const weekOffset = Math.max(0, Math.floor(...))
const workoutIndex = weekOffset % prog.workout_ids.length

Replace with:
// Find last scheduled workout for this user
const scheduledDates = Object.keys(schedMap).sort()  // schedMap already built
const lastScheduledDate = scheduledDates[scheduledDates.length - 1]
const lastWorkout = lastScheduledDate ? schedMap[lastScheduledDate] : null
const lastIndex = lastWorkout
  ? prog.workout_ids.indexOf(lastWorkout.id)
  : -1
const nextIndex = lastIndex === -1 ? 0 : (lastIndex + 1) % prog.workout_ids.length
const thisWeekId = prog.workout_ids[nextIndex]
```

Note: `schedMap` is already built earlier in the same `useEffect`. Make sure this logic runs AFTER schedMap is populated.

---

## After all fixes

Run TypeScript check:
```bash
npx tsc --noEmit --skipLibCheck
```

If no errors, commit:
```bash
git add -p
git commit -m "fix: remove progress btn, double login, height+bilateral measurements, workout sequence"
git push
```
