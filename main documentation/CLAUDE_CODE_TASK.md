# Задача для Claude Code — Magic Link Login

## Репозиторий
Найди папку `coach-app` на компьютере (~/Documents, ~/Projects, ~/Desktop и т.д.)
Репо: github.com/annnaboo/coach-app

---

## Что делаем

Заменяем логин через пароль на **магическую ссылку**.
Новый флоу: ввёл email → нажал кнопку → получил письмо → кликнул → в приложении.
Пароли больше не нужны для входа.

Изменяем 3 файла:
1. `app/page.tsx` — страница логина
2. `app/auth/callback/route.ts` — обработка callback (редирект по роли)
3. `app/auth/set-password/page.tsx` — убрать как точку входа, оставить только для инвайтов

---

## ФАЙЛ 1: `app/page.tsx` — полная замена логики

Замени всю логику входа на magic link. Сохрани дизайн (фон, шрифты, цвета).
Логика:

```typescript
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  // Если уже залогинен — редирект по роли
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profile?.role === 'coach') {
        router.replace('/coach')
      } else {
        router.replace('/client')
      }
    }
    checkSession()
  }, [])

  const handleMagicLink = async () => {
    if (!email.trim()) {
      setError('Введи email')
      return
    }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: 'https://coach-app-gray.vercel.app/auth/callback',
        shouldCreateUser: false, // только существующие пользователи
      }
    })

    setLoading(false)
    if (authError) {
      setError('Пользователь не найден. Попроси тренера добавить тебя.')
    } else {
      setSent(true)
    }
  }

  // После отправки письма
  if (sent) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center' }}>
        <AnimatedBackground />
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '400px',
          padding: '24px 16px', textAlign: 'center' }}>
          <div style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.7)',
            borderRadius: '24px', padding: '40px 28px' }}>
            <p style={{ fontSize: '40px', margin: '0 0 16px' }}>✉️</p>
            <h2 style={{ fontFamily: 'Epilogue, sans-serif', fontStyle: 'italic',
              fontWeight: 300, fontSize: '28px', color: '#2d1f0e', margin: '0 0 12px' }}>
              Письмо отправлено.
            </h2>
            <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300,
              fontSize: '14px', color: 'rgba(45,31,14,0.5)', lineHeight: 1.6, margin: '0 0 24px' }}>
              Проверь почту <strong style={{ color: '#2d1f0e' }}>{email}</strong>
              {' '}и кликни на ссылку в письме.
            </p>
            <button onClick={() => setSent(false)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer',
                fontFamily: 'Chillax, sans-serif', fontWeight: 300,
                fontSize: '13px', color: 'rgba(45,31,14,0.4)' }}>
              Ввести другой email
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Форма входа
  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '400px',
        padding: '24px 16px' }}>
        <div style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.7)',
          borderRadius: '24px', padding: '32px 24px' }}>

          <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontStyle: 'italic',
            fontWeight: 300, fontSize: '42px', color: '#2d1f0e',
            margin: '0 0 4px', lineHeight: 1 }}>
            Привет.
          </h1>
          <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300,
            fontSize: '13px', color: 'rgba(45,31,14,0.4)', margin: '0 0 28px',
            letterSpacing: '1px' }}>
            Введи email — пришлём ссылку для входа
          </p>

          <input
            type="email"
            autoComplete="email"
            placeholder="твой@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleMagicLink()}
            style={{ width: '100%', padding: '14px 18px', borderRadius: '999px',
              border: 'none', background: 'rgba(0,0,0,0.05)',
              fontFamily: 'Chillax, sans-serif', fontSize: '16px',
              color: '#2d1f0e', outline: 'none', boxSizing: 'border-box',
              marginBottom: '12px' }}
          />

          {error && (
            <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300,
              fontSize: '13px', color: '#8a2520', margin: '0 0 12px',
              textAlign: 'center' }}>
              {error}
            </p>
          )}

          <button
            onClick={handleMagicLink}
            disabled={loading}
            style={{ width: '100%', padding: '14px', borderRadius: '999px',
              background: '#7a4a20', color: '#fff', border: 'none',
              fontFamily: 'Chillax, sans-serif', fontWeight: 500,
              fontSize: '16px', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s' }}>
            {loading ? 'Отправляем...' : 'Войти'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## ФАЙЛ 2: `app/auth/callback/route.ts` — полная замена

Callback теперь обрабатывает все типы токенов И делает редирект по роли пользователя.

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  // Вспомогательная функция: редирект по роли
  const redirectByRole = async (response: NextResponse) => {
    // Читаем куки из ответа чтобы получить сессию
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll() {},
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return response

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, onboarded')
      .eq('id', user.id)
      .single()

    // Тренер → /coach, клиент после онбординга → /client, новый клиент → /welcome
    let redirectPath = '/client'
    if (profile?.role === 'coach') {
      redirectPath = '/coach'
    } else if (profile && !profile.onboarded) {
      redirectPath = '/welcome'
    }

    return NextResponse.redirect(`${origin}${redirectPath}`)
  }

  // --- token_hash flow (magic link, reset, invite) ---
  if (token_hash && type) {
    // Для инвайтов — всегда на set-password
    if (type === 'invite') {
      const response = NextResponse.redirect(`${origin}/auth/set-password`)
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return request.cookies.getAll() },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) =>
                response.cookies.set(name, value, options)
              )
            },
          },
        }
      )
      const { error } = await supabase.auth.verifyOtp({ token_hash, type: 'invite' })
      if (!error) return response
    }

    // Для magic link и recovery — верифицируем и редиректим по роли
    const baseResponse = NextResponse.redirect(`${origin}/client`) // fallback
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              baseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'magiclink' | 'recovery' | 'email' | 'signup',
    })

    if (!error) {
      return await redirectByRole(baseResponse)
    }
  }

  // --- code flow (PKCE) ---
  if (code) {
    const baseResponse = NextResponse.redirect(`${origin}/client`) // fallback
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              baseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return await redirectByRole(baseResponse)
    }
  }

  // Всё упало — на логин
  return NextResponse.redirect(`${origin}/`)
}
```

---

## ФАЙЛ 3: `app/auth/set-password/page.tsx` — только для инвайтов

Этот файл теперь используется ТОЛЬКО когда тренер добавляет нового клиента.
Добавь вверху заметную пометку для себя — и убедись что страница не показывает email тренера.

Найди и замени весь useEffect с getSession/getUser на:

```typescript
useEffect(() => {
  const supabase = createClient()
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && session) {
      setUserEmail(session.user.email || '')
      setSessionReady(true)
    }
  })
  return () => subscription.unsubscribe()
}, [])
```

(переменная может называться по-другому — подстрой под существующий код)

Добавь `autoComplete="new-password"` на оба поля пароля если ещё не добавлено.

---

## После изменений

```bash
npx tsc --noEmit --skipLibCheck
git add app/page.tsx app/auth/callback/route.ts app/auth/set-password/page.tsx
git commit -m "feat: magic link login, role-based redirect in callback"
git push origin main
```

Подожди деплой Vercel (1-2 мин) и сообщи.

---

## Проверить после деплоя

1. Открыть coach-app-gray.vercel.app
2. Ввести email тренера → получить письмо → кликнуть → попасть на /coach ✓
3. Ввести email клиента → получить письмо → кликнуть → попасть на /client ✓
4. Ввести несуществующий email → увидеть ошибку "Пользователь не найден" ✓
