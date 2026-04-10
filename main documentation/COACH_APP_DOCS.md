# Coach App — Документация проекта
*Персональное приложение для фитнес-тренера и её клиентов*

---

## 1. ЧТО ЭТО ЗА ПРИЛОЖЕНИЕ

Coach App — это персональный инструмент тренера Анны для работы с клиентами онлайн. Не SaaS, не маркетплейс — это приватное приложение одного тренера и её клиентского круга.

**Что умеет тренер:**
- Добавлять клиентов через email-инвайт
- Создавать тренировки и программы (цикличные, 4 тренировки в неделю)
- Назначать программы конкретным клиентам
- Прописывать КБЖУ каждому клиенту
- Отслеживать оплату (период + сумма)
- Видеть прогресс клиентов по весам в упражнениях
- Просматривать еженедельные отчёты с фото и замерами
- Одобрять или отклонять запросы на замену тренировки

**Что умеет клиент:**
- Видеть свою тренировку дня (автоматически из программы)
- Записывать веса по подходам
- Трекать самочувствие (настроение, энергия, боль мышц)
- Сдавать еженедельный отчёт (фото спереди/сбоку/сзади + 7 замеров)
- Смотреть историю своих отчётов с динамикой
- Следить за прогрессом весов по упражнениям
- Просить заменить тренировку (с указанием причины)
- Менять аватар и пароль в настройках

---

## 2. ТЕХНИЧЕСКИЙ СТЕК

```
Frontend:   Next.js 14 (App Router) + TypeScript
Styling:    Tailwind CSS + inline styles
Charts:     Recharts
Auth:       Supabase Auth (email + invite flow)
Database:   Supabase PostgreSQL + RLS
Storage:    Supabase Storage (фото отчётов и аватары)
Deploy:     Vercel (auto-deploy из GitHub main)
PWA:        manifest.json + service worker
Fonts:      Epilogue (Google Fonts) + Chillax (Fontshare)
```

---

## 3. ДИЗАЙН-СИСТЕМА

### Палитра:
```
Фон:          #f5f0e8  (кремовый/бежевый)
Акцент:       #7a4a20  (тёмно-коричневый)
Текст:        #2d1f0e
Текст мутный: rgba(45,31,14,0.4)
Карточки:     rgba(255,255,255,0.55) + blur(12px)
```

### Карточки (liquid glass стиль):
```css
background: rgba(255,255,255,0.55);
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
border: 1px solid rgba(255,255,255,0.7);
border-radius: 20px;
padding: 18px;
```

### Кнопки:
```css
/* Primary — коричневая */
background: #7a4a20;
color: #ffffff;
border-radius: 999px;
font-family: 'Chillax', sans-serif;
font-weight: 500;

/* Secondary — прозрачная */
background: rgba(122,74,32,0.1);
border: 1px solid rgba(122,74,32,0.2);
color: #7a4a20;
border-radius: 999px;
```

### Поля ввода:
```css
background: rgba(0,0,0,0.05);
border: none;
border-radius: 999px;
padding: 10px 16px;
font-size: 16px; /* критично для iOS — без этого Safari зумит */
```

### Шрифты:
- **Epilogue** — заголовки, italic для имён на главных страницах
- **Chillax** — всё остальное (body, кнопки, лейблы)

### Анимированный фон:
`AnimatedBackground` — три blob-а с медленной CSS-анимацией (18-25 сек).
Используется на каждой странице приложения.

---

## 4. ИНФРАСТРУКТУРА

### Сервисы:
| Сервис | Назначение | URL |
|--------|-----------|-----|
| GitHub | Хранение кода | github.com/annnaboo/coach-app |
| Vercel | Хостинг + деплой | coach-app-gray.vercel.app |
| Supabase | БД + Auth + Storage | zenpkbvllqwdstecafrn |

### Переменные окружения (Vercel + .env.local):
```env
NEXT_PUBLIC_SUPABASE_URL=https://zenpkbvllqwdstecafrn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

⚠️ **Критично:** В Vercel в поле Value для `SUPABASE_SERVICE_ROLE_KEY` должен быть ТОЛЬКО JWT токен — без `SUPABASE_SERVICE_ROLE_KEY=` в начале строки.

---

## 5. БАЗА ДАННЫХ

### Таблицы:

```sql
-- Профили пользователей
profiles (
  id uuid PRIMARY KEY,         -- = auth.users.id
  name text,
  role text,                   -- 'coach' | 'client'
  avatar_url text,
  onboarded boolean DEFAULT false
)

-- Журнал тренировок (веса по упражнениям)
workout_logs (
  id uuid PRIMARY KEY,
  player uuid,                 -- ID клиента
  exercise_id text,            -- 'rdl', 'box-squat' и т.д.
  saved_at timestamptz,
  w1 numeric, w2 numeric, w3 numeric,
  reps integer,
  notes text
)

-- Еженедельные отчёты
weekly_reports (
  id uuid PRIMARY KEY,
  player_id uuid,
  week_start date,             -- понедельник недели
  weight numeric,              -- вес тела (кг)
  chest numeric,               -- грудь (см)
  waist numeric,               -- талия (см)
  hips numeric,                -- бёдра (см)
  waist_navel numeric,         -- пупок (см)
  one_thigh numeric,           -- одно бедро (см)
  arm numeric,                 -- рука (см)
  notes text,
  photo_front text,            -- путь: {userId}/{ts}_front
  photo_side text,
  photo_back text,
  created_at timestamptz
)

-- Трекер самочувствия
mood_logs (
  id uuid PRIMARY KEY,
  player_id uuid,
  logged_date date,
  mood integer,                -- 1-5
  energy integer,              -- 1-10
  muscle_pain integer,         -- 1-10
  created_at timestamptz
)

-- КБЖУ
nutrition_plans (
  id uuid PRIMARY KEY,
  player_id uuid UNIQUE,
  calories integer,
  protein integer,
  fat integer,
  carbs integer,
  notes text,
  created_by uuid,
  updated_at timestamptz
)

-- Оплаты
payments (
  id uuid PRIMARY KEY,
  player_id uuid,
  period_start date,
  period_end date,
  paid boolean DEFAULT false,
  amount numeric,
  notes text,
  created_at timestamptz
)

-- Тренировки
workouts (
  id uuid PRIMARY KEY,
  title text,
  subtitle text,
  exercises jsonb,             -- массив объектов упражнений
  assigned_to_multiple uuid[], -- UUID клиентов
  created_by uuid,
  is_active boolean DEFAULT true,
  created_at timestamptz
)

-- Программы (циклические)
programs (
  id uuid PRIMARY KEY,
  title text,
  assigned_to uuid[],          -- UUID клиентов
  workout_ids uuid[],          -- порядок тренировок
  start_date date,
  created_by uuid,
  is_active boolean DEFAULT true,
  created_at timestamptz
)

-- Запросы на замену тренировки
workout_swap_requests (
  id uuid PRIMARY KEY,
  player_id uuid,
  current_workout_id uuid,
  reason text,
  status text DEFAULT 'pending', -- 'pending'|'approved'|'declined'
  coach_comment text,
  created_at timestamptz
)
```

### Структура упражнения в workouts.exercises:
```json
{
  "id": "rdl",
  "name": "Румынская тяга",
  "muscle": "Задняя поверхность · Ягодицы",
  "sets": 3,
  "reps": "10",
  "description": "Держи спину прямой...",
  "videoUrl": "https://youtube.com/...",
  "group": "Основная работа"
}
```

---

## 6. RLS ПОЛИТИКИ

Все политики применить в Supabase SQL Editor:

```sql
-- weekly_reports
CREATE POLICY "own_select" ON weekly_reports FOR SELECT USING (
  auth.uid() = player_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);
CREATE POLICY "own_insert" ON weekly_reports FOR INSERT
  WITH CHECK (auth.uid() = player_id);
CREATE POLICY "own_update" ON weekly_reports FOR UPDATE
  USING (auth.uid() = player_id);

-- mood_logs
CREATE POLICY "mood_select" ON mood_logs FOR SELECT USING (
  auth.uid() = player_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);
CREATE POLICY "mood_insert" ON mood_logs FOR INSERT
  WITH CHECK (auth.uid() = player_id);
CREATE POLICY "mood_upsert" ON mood_logs FOR UPDATE
  USING (auth.uid() = player_id);

-- nutrition_plans
CREATE POLICY "nutrition_coach" ON nutrition_plans FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);
CREATE POLICY "nutrition_select" ON nutrition_plans FOR SELECT
  USING (auth.uid() = player_id);

-- payments
CREATE POLICY "payments_coach" ON payments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  OR auth.uid() = player_id
);

-- profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (
  auth.uid() = id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

-- Storage (bucket 'reports')
CREATE POLICY "upload own photos" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'reports' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "read photos" ON storage.objects FOR SELECT USING (
  bucket_id = 'reports' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  )
);
```

---

## 7. СТРУКТУРА ФАЙЛОВ

```
app/
├── page.tsx                       # Страница логина
├── layout.tsx                     # Шрифты + PWA мета + Service Worker
├── globals.css                    # no-spin для числовых полей + pulse анимация
├── components/
│   └── AnimatedBackground.tsx     # Анимированный кремовый фон
│
├── client/page.tsx                # Главная клиента (календарь, КБЖУ, трекер, тренировка)
│
├── coach/
│   ├── page.tsx                   # Тренерский дашборд
│   ├── workout/
│   │   ├── new/page.tsx           # Создание тренировки
│   │   └── edit/[id]/page.tsx     # Редактирование тренировки
│   ├── workouts/page.tsx          # Список всех тренировок
│   └── programs/
│       └── new/page.tsx           # Создание программы
│
├── workout/
│   ├── 2/page.tsx                 # Legacy тренировка (захардкожена)
│   └── [id]/page.tsx              # Динамическая тренировка по ID из БД
│
├── progress/page.tsx              # Прогресс весов с графиками (Recharts)
├── report/page.tsx                # Форма отчёта (фото + 7 замеров)
├── reports-history/page.tsx       # История всех отчётов клиента
├── settings/page.tsx              # Настройки профиля (имя, фото, пароль)
├── welcome/page.tsx               # Онбординг для новых клиентов (3 шага)
│
└── auth/
    ├── callback/route.ts          # Supabase auth callback (обмен кода на сессию)
    └── set-password/page.tsx      # Установка пароля по инвайт-ссылке

app/api/
└── invite/route.ts                # POST — инвайт клиента через Supabase Admin API

lib/
└── supabase.js                    # createBrowserClient helper

public/
├── manifest.json                  # PWA манифест
├── sw.js                          # Service Worker (кэш)
├── icon-192.png                   # PWA иконка
└── icon-512.png
```

---

## 8. КЛЮЧЕВЫЕ АЛГОРИТМЫ

### Тренировка дня из циклической программы:
```typescript
const getTodayWorkout = (program: any) => {
  const start = new Date(program.start_date)
  const today = new Date()
  const days = Math.floor((today.getTime() - start.getTime()) / 86400000)
  const idx = days % program.workout_ids.length
  return {
    workoutId: program.workout_ids[idx],
    index: idx + 1,
    total: program.workout_ids.length
  }
}
```

### Получение signed URL для фото:
```typescript
const getPhotoUrl = async (path: string | null) => {
  if (!path) return null
  if (path.startsWith('http')) return path
  const { data } = await supabase.storage.from('reports').createSignedUrl(path, 3600)
  return data?.signedUrl || null
}
```

### Инвайт клиента (server-side):
```typescript
// Использует SERVICE_ROLE_KEY — только на сервере!
const supabase = createClient(URL, SERVICE_ROLE_KEY)
await supabase.auth.admin.inviteUserByEmail(email, {
  redirectTo: 'https://coach-app-gray.vercel.app/auth/set-password'
})
await supabase.from('profiles').upsert({ id: userId, name, role: 'client' })
```

---

## 9. ДЕПЛОЙ

```bash
# Стандартный деплой
git add .
git commit -m "описание"
git push origin main
# Vercel деплоит автоматически за 1-2 мин

# Форс-редеплой если Vercel завис
git commit --allow-empty -m "trigger redeploy"
git push origin main
```

### Проверка ошибок:
vercel.com → coach-app → Deployments → клик на деплой → вкладка Logs

---

## 10. ИЗВЕСТНЫЕ БАГИ И РЕШЕНИЯ

| Ошибка | Причина | Решение |
|--------|---------|---------|
| "Invalid API key" при инвайте | В Vercel Value содержит имя переменной | Оставить только JWT токен |
| "Auth session missing" на set-password | Токен из URL не обрабатывается | Использовать onAuthStateChange |
| RLS блокирует данные (406 ошибка) | Конфликт политик | Дропнуть все + пересоздать |
| Тренировка не назначается | uuid[] синтаксис PostgreSQL | Фильтровать на клиенте JS |
| Отчёт не сохраняется | Фото сохраняются как URL | Сохранять только path |
| Vercel показывает старую версию | Кэш | Пустой коммит или Redeploy |

---

## 11. ТЕКУЩИЕ КЛИЕНТЫ (продакшен)

```
Тренер Анна:   525535c1-50e3-4ca7-a142-ff26bcb98074
Клиент Вика:   292fe676-9523-496b-b410-92ea1247f55d
Клиент Карина: fcbc97bc-0051-4654-a61f-f1ce3f38562d
Клиент Тест:   2f71fff4-56dd-4b2e-a96b-7b74c282395c
```

---

## 12. КАК ДОБАВИТЬ НОВОГО КЛИЕНТА

1. Войти как тренер на coach-app-gray.vercel.app
2. Нажать **"+ Добавить клиента"**
3. Ввести имя и email
4. Нажать **"Отправить приглашение"**
5. Клиент получает письмо со ссылкой
6. Переходит по ссылке → страница `/auth/set-password`
7. Придумывает пароль → попадает на онбординг `/welcome`
8. После онбординга → главная страница `/client`
9. Тренер видит клиента в дашборде и назначает:
   - Программу тренировок
   - КБЖУ план
   - Период оплаты

---

## 13. PWA — УСТАНОВКА НА ТЕЛЕФОН

**iPhone (Safari):**
1. Открыть coach-app-gray.vercel.app
2. Нажать кнопку "Поделиться" (квадрат со стрелкой)
3. Выбрать "На экран «Домой»"
4. Нажать "Добавить"

**Android (Chrome):**
1. Открыть сайт
2. Появится баннер "Установить приложение"
3. Нажать "Установить"

---

## 14. ФИЛОСОФИЯ И ТОН ПРИЛОЖЕНИЯ

Приложение создано для конкретного тренера — специалиста по реабилитации и работе с женщинами 30+. Тон в описаниях упражнений:

> "Мышца под напряжением не включается нормально. Нашла больную точку — остановилась, подышала, дала отпустить."

> "Если ягодицы не проснулись — в приседе и тяге они будут спать, а вместо них впашет поясница."

> "Голеностоп после перелома деревенеет. Когда он не работает — колено начинает работать за него."

Это не фитнес-приложение. Это персональный инструмент тренера с душой.
