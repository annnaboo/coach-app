---
tags: [project, coach-app, supabase, vercel, active]
created: 2026-05-08
updated: 2026-05-08
status: active
---

# 🏋️ Coach App

> Веб-приложение для тренера и клиентов. Тренер ведёт программы тренировок, питание, оплаты. Клиент логирует тренировки, замеры, настроение, фото прогресса.

## Ссылки

- 🌐 Прод: https://coach-app.vercel.app
- 📦 GitHub: https://github.com/annnaboo/coach-app
- 🔺 Vercel: https://vercel.com/anna-boo/coach-app
- 🐘 Supabase: https://supabase.com/dashboard/project/zenpkbvllqwdstecafrn
- 📁 Локальная папка: `~/Documents/Claude/Projects/CoachApp`

## Стек

| Слой | Технология |
|---|---|
| Frontend | Вероятно Next.js / Vite + React |
| Backend / DB | Supabase (Postgres 17, RLS) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Хостинг | Vercel |

## Координаты (технические)

```
Supabase project ref: zenpkbvllqwdstecafrn
Supabase name:        workout-tracker
Region:               eu-west-2
API URL:              https://zenpkbvllqwdstecafrn.supabase.co
Vercel project:       anna-boo/coach-app
GitHub repo:          annnaboo/coach-app
```

## Роли

| Роль | Доступ |
|---|---|
| `coach` | Управляет всем, видит данные всех клиентов |
| `client` | Видит только своё |

Хранится в `profiles.role` (text, default `'client'`, без CHECK-constraint).

## Схема БД — таблицы

```
profiles           → пользователи (расширение auth.users)
workouts           → шаблоны тренировок (упражнения в jsonb)
programs           → программы (массив workout_ids)
workout_schedule   → даты тренировок клиента
workout_logs       → выполнение упражнений (LAST state, не журнал!)
workout_swap_requests → запросы на замену тренировки
rest_days          → дни отдыха
mood_logs          → самочувствие (настроение/энергия/боль в мышцах)
weekly_reports     → замеры тела + 3 фото (front/side/back)
progress_photos    → произвольные фото прогресса
nutrition_plans    → план питания (1 на клиента)
payments           → учёт оплат
```

Storage buckets: `progress-photos` (приватный), `reports` (приватный)

## ⚠️ Технический долг

### 🔴 Критично

- [ ] **Дыра в RLS `workout_logs`** — удалить политики `allow all inserts` и `allow all reads` (любой авторизованный читает чужие логи)
- [ ] **Зафиксировать схему в миграциях** — `supabase db pull` + закоммитить. Сейчас схема только в живой БД

### 🟡 Важно

- [ ] **Дубль полей в `workouts`** — `assigned_to` vs `assigned_to_multiple`, оставить одно
- [ ] **Старые поля в `weekly_reports`** — дропнуть `arm` и `one_thigh` (заменены `left/right_arm`, `left/right_thigh`)
- [ ] **CHECK на `profiles.role`** — ограничить `('coach', 'client')`
- [ ] **Coach-доступ к `progress_photos`** — тренер не видит фото клиентов, нужна политика если требуется

### 🟢 Мелкое

- [ ] **Дубль UNIQUE в `workout_logs`** — два одинаковых констрейнта на `(player, exercise_id)`, один лишний

## Важные архитектурные детали

> [!important] workout_logs хранит ПОСЛЕДНЕЕ состояние
> Из-за `UNIQUE (player, exercise_id)` таблица не ведёт журнал подходов — хранит только последнее выполнение. Учитывай при разработке фич истории прогресса.

> [!warning] exercises.sets и reps — строки
> В jsonb-массиве `exercises` поля `sets` и `reps` — строки (`"4"`, `"12-15"`), не числа. Не парсить без проверки.

> [!warning] Миграций нет
> `supabase/migrations/` в репо пустая или отсутствует. Схема правилась через Supabase UI. Единственный источник правды — живая БД.

## Переменные окружения

```env
NEXT_PUBLIC_SUPABASE_URL=https://zenpkbvllqwdstecafrn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<взять в Supabase Dashboard → Settings → API>
```

## Локальный запуск

```bash
git clone https://github.com/annnaboo/coach-app.git
cd coach-app
npm install
cp .env.example .env.local   # или создать вручную
npm run dev
```

## Регрессионное тестирование

> [!rule] Перед новой фичей — проверить все предыдущие
> Прежде чем начинать разработку новой функциональности, убедиться что всё ранее реализованное работает корректно. Если обнаружен сбой — зафиксировать и не двигаться дальше, пока не исправлено.

### Формат описания ошибки

**Суть ошибки**
`[Что происходит] + [Где происходит] + [При каком условии]`

**Ожидаемый результат**
`[Условие] → [Результат]`

**Шаги воспроизведения**
1. ...
2. ...
3. ...

**Среда:** dev / prod
**Статус:** open / in progress / fixed / won't fix

> [!tip] После исправления
> Повторно пройти по всем функциям, которые могли быть затронуты изменением. Только после этого — к новой фиче.

---

## История

| Дата | Событие |
|---|---|
| 2026-05-02 | Восстановление контекста через Supabase MCP после смены машины |
| 2026-05-08 | Обновление контекста, создание Obsidian-заметки |

## Связанные заметки

- [[Coach App — Schema Details]]
- [[Coach App — RLS Policies]]
- [[Coach App — Tech Debt]]
