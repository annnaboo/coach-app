# Session 5 — Coach settings page

Next.js 14 App Router + TypeScript + Supabase.
Design: bg #f5f0e8, accent #7a4a20, text #2d1f0e.
Fonts: Epilogue (italic headings) + Chillax (weight 300).
Cards: `borderBottom: '1px solid rgba(45,31,14,0.08)', padding: '28px 0'` — NO glassmorphism.

---

## Goal

Create `app/coach/settings/page.tsx`.

Add a ⚙️ button in `app/coach/page.tsx` header (already has a spot near logout button) that navigates to `/coach/settings`.

---

## Page: app/coach/settings/page.tsx

```tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'
```

### Data to fetch:
```tsx
// 1. Coach profile
supabase.from('profiles')
  .select('name, email, avatar_url, bio, instagram, phone')
  .eq('id', userId).single()
// Note: add bio, instagram, phone columns if they don't exist
// SQL: ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text, ADD COLUMN IF NOT EXISTS instagram text, ADD COLUMN IF NOT EXISTS phone text;
```

---

### Page layout:

**HEADER:**
```
← Назад

[Настройки]    (big italic heading)
coach · {name}
```

**SECTION: Профиль**
Fields (all editable inline, save on blur or via "Сохранить" button):
- Имя: text input, pre-filled from `profiles.name`
- Instagram: text input, pre-filled from `profiles.instagram`, placeholder `@username`
- Телефон: text input, pre-filled from `profiles.phone`
- О себе: textarea (3 rows), pre-filled from `profiles.bio`, placeholder "Расскажи о своём подходе..."

Save button: calls `supabase.from('profiles').update({ name, instagram, phone, bio }).eq('id', userId)`

Show success toast: `✓ Сохранено` (small text, fades after 2 seconds using setTimeout + state)

**SECTION: Уведомления** (static UI only, no backend needed yet)
Toggle switches (CSS toggle, no library) for:
- Новый отчёт от клиента (default: on)
- Запрос замены тренировки (default: on)
- Напоминание об истечении оплаты (default: on)

Style toggle:
```tsx
// Pill toggle: 40px × 22px
// On: background #7a4a20
// Off: background rgba(45,31,14,0.15)
// Circle: 18px white circle, transitions left/right
```

**SECTION: Мои клиенты**
- Show total count: "X активных клиентов"
- Button "Управление клиентами →" that navigates to `/coach` (back to dashboard)

**SECTION: Аккаунт**
- Email (read-only, greyed out)
- Button "Выйти" (calls `supabase.auth.signOut()` then `router.push('/')`)
  Style: outline, red color `#8a2520`, border `1px solid rgba(138,37,32,0.3)`

---

### Design for input fields:
```tsx
{
  width: '100%',
  background: 'rgba(0,0,0,0.05)',
  border: 'none',
  borderBottom: '1px solid rgba(45,31,14,0.15)',
  borderRadius: 0,
  padding: '8px 0',
  fontFamily: 'Chillax, sans-serif',
  fontSize: '14px',
  color: '#2d1f0e',
  outline: 'none',
  boxSizing: 'border-box' as const,
}
```

Label above each input:
```tsx
{
  fontFamily: 'Chillax, sans-serif',
  fontWeight: 300,
  fontSize: '10px',
  letterSpacing: '2px',
  textTransform: 'uppercase',
  color: 'rgba(45,31,14,0.3)',
  margin: '0 0 6px',
  display: 'block',
}
```

---

## SQL to run before this session (Anna does herself):

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS phone text;
```

---

## After

```bash
npx tsc --noEmit --skipLibCheck
git add app/coach/settings/
git commit -m "feat: coach settings page"
git push
```
