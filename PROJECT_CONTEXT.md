# Coach App — Project Context

> **Этот файл — постоянный контекст проекта для Claude и для тебя.**
> Здесь только то, что **не выводится автоматически** из кода или git.
> Когда что-то меняется (новая фича, миграция, переезд) — дописывай сюда.
> README.md — публичное описание; PROJECT_CONTEXT.md — рабочий «второй мозг».

**Последнее обновление:** 2026-05-08 (код репозитория скопирован локально)

---

## TL;DR

Веб-приложение для **одного тренера и нескольких клиентов** (на сегодня в БД: 1 coach + 3 client).
Тренер собирает программы тренировок и план питания, клиент логирует выполнение, замеры и настроение.
Бэкенд — Supabase (Postgres 17, RLS), фронт хостится на Vercel.

---

## Координаты

| Что | Где |
|---|---|
| Репозиторий | https://github.com/annnaboo/coach-app |
| Прод | https://coach-app.vercel.app |
| Vercel project | https://vercel.com/anna-boo/coach-app |
| Supabase dashboard | https://supabase.com/dashboard/project/zenpkbvllqwdstecafrn |
| Supabase API URL | `https://zenpkbvllqwdstecafrn.supabase.co` |
| Supabase project ref | `zenpkbvllqwdstecafrn` |
| Supabase имя / регион | `workout-tracker` / `eu-west-2` |
| Postgres версия | 17 |
| Локальная папка | `~/Documents/Claude/Projects/CoachApp` |
| Email владельца | a.g.izotova@gmail.com |

### Ограничения Claude-среды (sandbox)

- **GitHub доступен** — `git clone` работает через `/tmp`. Код репозитория скопирован в папку CoachApp.
- **Vercel MCP** на личном аккаунте: `list_projects`/`get_project` → 403. Работает только `web_fetch_vercel_url`.
- **Удаление файлов** из папки CoachApp — через Finder, не через bash.

---

## Роли

`public.profiles.role` — `text` без CHECK, default `'client'`.

| Роль | Доступ |
|---|---|
| `coach` | Управляет всем: программы, тренировки, питание, оплаты. Видит данные всех клиентов. |
| `client` | Видит и редактирует только своё. |

Паттерн в RLS-политиках для тренера:
```sql
EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
```

---

## Доменная модель (схема `public`, все таблицы RLS=true)

### `profiles` — расширение `auth.users`

`id` (uuid PK, FK → `auth.users.id`), `name`, `role`, `avatar_url`, `onboarded` (bool), `height_cm`

INSERT-политика открыта (`with_check = true`) — нужно для онбординга.

---

### `workouts` — шаблоны тренировок

`id`, `title`, `subtitle`, `exercises` (jsonb), `assigned_to` (uuid), `assigned_to_multiple` (uuid[]), `created_by`, `is_active`

**Структура `exercises` (jsonb-массив):**
```json
{
  "name": "Ягодичный мост",
  "muscleGroup": "Ягодицы, задняя поверхность бедра",
  "sets": "4",
  "reps": "12-15",
  "youtube": "",
  "description": "Длинный текст с техникой..."
}
```
`sets` и `reps` — строки (бывает `"12-15"`). Контент в основном на русском.

⚠️ **Дубль:** `assigned_to` (uuid) + `assigned_to_multiple` (uuid[]) — исторически было single, добавили multi. Нужно оставить одно.

---

### `programs` — программы (последовательности тренировок)

`id`, `title`, `workout_ids` (uuid[], порядок важен), `assigned_to` (uuid[]), `start_date`, `end_date`, `is_active`

---

### `workout_schedule` — даты запланированных тренировок

`id`, `player_id`, `workout_id`, `scheduled_date`
`UNIQUE (player_id, scheduled_date)` — одна тренировка на дату у клиента.

---

### `workout_logs` — выполнение упражнений

⚠️ **Архитектурная деталь:** `UNIQUE (player, exercise_id)` — таблица хранит **ПОСЛЕДНЕЕ состояние** выполнения, а не полный журнал подходов.

| Поле | Тип | Примечание |
|---|---|---|
| `player` | text | `auth.uid()::text` |
| `exercise_id` | text | |
| `workout_id` | uuid | |
| `w1`, `w2`, `w3` | numeric | веса по сетам |
| `reps`, `reps1`, `reps2` | text | повторения |
| `t1`, `t2`, `t3` | text | время отдыха/сета |
| `notes` | text | |
| `saved_at` | timestamptz | |

Индекс: `idx_workout_logs_player_exercise_time (player, exercise_id, saved_at DESC)`

⚠️ **Два дублирующих UNIQUE** на `(player, exercise_id)` — один лишний.

---

### `workout_swap_requests` — запросы на замену тренировки

`player_id`, `current_workout_id`, `reason`, `status` (CHECK: `'pending'`/`'approved'`/`'declined'`), `coach_comment`

---

### `rest_days` — дни отдыха

`player_id`, `date`. `UNIQUE (player_id, date)`.

---

### `mood_logs` — дневник самочувствия (1 запись в день)

`player_id`, `logged_date`, `mood` (CHECK 1–5), `energy` (CHECK 1–10), `muscle_pain` (CHECK 1–10)
`UNIQUE (player_id, logged_date)`

---

### `weekly_reports` — еженедельные замеры + фото

`player_id`, `week_start`, `weight`, `chest`, `waist`, `waist_navel`, `hips`, `left_thigh`, `right_thigh`, `left_arm`, `right_arm`, `height_cm`, `photo_front`, `photo_side`, `photo_back`, `notes`

⚠️ **Старые поля:** `arm` и `one_thigh` — дубли новых `left/right_arm`, `left/right_thigh`. Дропнуть после миграции данных.

---

### `progress_photos` — произвольные фото прогресса

`user_id`, `photo_url`, `taken_at`, `weight_kg`, `notes`. Без уникальных констрейнтов.

---

### `nutrition_plans` — план питания

`player_id`, `calories`, `protein`, `fat`, `carbs`, `notes`
`UNIQUE (player_id)` — один план на клиента.

---

### `payments` — учёт оплат

`player_id`, `period_start`, `period_end`, `paid` (bool), `amount`, `monthly_rate`, `notes`

---

## Storage buckets

| Bucket | Доступ | Используется для |
|---|---|---|
| `progress-photos` | приватный | `progress_photos.photo_url` |
| `reports` | приватный | `weekly_reports.photo_front/side/back` |

---

## RLS — сводная таблица

| Таблица | Клиент | Тренер |
|---|---|---|
| `profiles` | читает всех, обновляет себя | обновляет любого |
| `workouts` | только читает | всё |
| `programs` | читает свои или активные без назначения | всё |
| `workout_schedule` | управляет своим | читает всё |
| `workout_logs` | пишет/обновляет/читает свои | читает всё |
| `workout_swap_requests` | создаёт/читает свои | читает всё, меняет статус |
| `rest_days` | управляет своими | читает |
| `mood_logs` | пишет/обновляет/читает свои | читает |
| `weekly_reports` | пишет/обновляет/читает свои | вставляет за клиента, читает всё |
| `progress_photos` | всё своё (`user_id = auth.uid()`) | **не видит** фото клиентов (нужна coach-политика) |
| `nutrition_plans` | читает свой | всё |
| `payments` | читает свои | всё |

---

## Инфраструктура

### Расширения Postgres (активные)
`pg_stat_statements`, `pgcrypto`, `uuid-ossp`, `supabase_vault`, `plpgsql`

### Миграции
`list_migrations` → `[]` — схема правилась через Supabase UI. Файлов `supabase/migrations/*.sql` в репо нет.

### Edge Functions
`list_edge_functions` → `[]` — не используются.

### Triggers
Триггеров нет (`information_schema.triggers` для `public` пусто).

---

## Frontend / деплой

- **Хостинг:** Vercel `anna-boo/coach-app` → `https://coach-app.vercel.app`
- **Supabase клиент:** `@supabase/supabase-js` с anon-ключом + auth-сессией; разграничение — RLS
- **Вероятный стек:** Next.js или Vite + React (уточнить по `package.json`)
- **Storage:** бакеты `progress-photos` и `reports`

### Переменные окружения

```env
NEXT_PUBLIC_SUPABASE_URL=https://zenpkbvllqwdstecafrn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```
Для Vite: `VITE_` вместо `NEXT_PUBLIC_`. `service_role` — только серверные скрипты, никогда фронт.

---

## Локальный запуск

```bash
git clone https://github.com/annnaboo/coach-app.git
cd coach-app
npm install                   # или pnpm/yarn — смотри lock-файл
cp .env.example .env.local    # если нет — создай вручную
npm run dev
```

---

## Технический долг (приоритизированный)

### 🔴 Критично

**1. Дыра в RLS на `workout_logs`**
Политики `allow all inserts` (`with_check = true`) и `allow all reads` (`using = true`) перекрывают правильные per-user политики. Любой авторизованный читает чужие логи и пишет от чужого имени.
```sql
DROP POLICY "allow all inserts" ON workout_logs;
DROP POLICY "allow all reads" ON workout_logs;
```

**2. Схема не зафиксирована в миграциях**
Единственный источник правды — живая БД. При потере проекта — схема пропадёт.
```bash
supabase login
supabase link --project-ref zenpkbvllqwdstecafrn
supabase db pull
git add supabase/migrations/
git commit -m "chore: snapshot current schema"
```

### 🟡 Важно

**3. Дубль полей назначения в `workouts`**
`assigned_to` (uuid) vs `assigned_to_multiple` (uuid[]) — определить по коду какое используется, дропнуть второе.

**4. Устаревшие поля в `weekly_reports`**
`arm` и `one_thigh` дублируют `left/right_arm`, `left/right_thigh`.
```sql
-- После проверки, что данные перенесены:
ALTER TABLE weekly_reports DROP COLUMN arm, DROP COLUMN one_thigh;
```

**5. CHECK на `profiles.role`**
```sql
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('coach', 'client'));
```

**6. Coach-доступ к `progress_photos`**
Тренер сейчас не видит фото клиентов. Если нужно:
```sql
CREATE POLICY "Coach can view all photos" ON progress_photos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );
```

### 🟢 Мелкое

**7. Дубль UNIQUE в `workout_logs`**
`workout_logs_player_exercise_key` и `workout_logs_player_exercise_unique` — одно и то же.
```sql
ALTER TABLE workout_logs DROP CONSTRAINT workout_logs_player_exercise_unique;
```

---

## История изменений файла

| Дата | Что |
|---|---|
| 2026-05-02 | Первичная сборка. Источник: схема Supabase через MCP. Код репозитория недоступен. |
| 2026-05-08 | Расширение: SQL-примеры для техдолга, таблица инфраструктуры, структурирование. |
