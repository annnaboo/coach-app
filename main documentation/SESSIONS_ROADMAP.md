# Роадмап сессий — что ты делаешь, что в Claude Code

---

## СЕССИЯ 1 — ~15k токенов
**Фичи: Неделя X из Y + Дни отдыха в календаре**

### ТЫ: SQL в Supabase (SQL Editor → New Query)

```sql
-- Таблица для дней отдыха
CREATE TABLE IF NOT EXISTS rest_days (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  UNIQUE(player_id, date),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE rest_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client can manage own rest days"
  ON rest_days FOR ALL
  USING (auth.uid() = player_id);

CREATE POLICY "Coach can view rest days"
  ON rest_days FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));
```

### CLAUDE CODE: вставь это

```
Репозиторий: coach-app (Next.js 14 + Supabase + TypeScript).
Дизайн-токены: фон #f5f0e8, акцент #7a4a20, текст #2d1f0e.
Шрифты: Epilogue (italic заголовки), Chillax (body, 300 weight).
Стили: минимальные секции с borderBottom: '1px solid rgba(45,31,14,0.08)', padding: '28px 0', без стеклянных карточек.

--- ЗАДАЧА 1: "Неделя X из Y" в программе ---
Файл: app/client/page.tsx

В блоке TODAY'S WORKOUT (уже есть program.title и даты в бейджах).
После h2 с названием тренировки добавь строку:

  const currentWeek = (weekOffset % program.workout_ids.length) + 1
  const totalWeeks = program.workout_ids.length

Показать под h2:
  <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px',
    letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.3)',
    margin: '4px 0 12px' }}>
    Неделя {currentWeek} из {totalWeeks}
  </p>

--- ЗАДАЧА 2: Дни отдыха в недельном календаре ---
Файл: app/client/page.tsx

SQL уже выполнен — есть таблица rest_days (id, player_id, date).

1. Добавь в useState: restDays: string[] = []

2. В useEffect, в массив Promise.all добавь 11-й запрос:
   supabase.from('rest_days').select('date')
     .eq('player_id', data.user.id)
     .gte('date', weekStartStr).lte('date', weekEndStr)
   Сохрани в setRestDays(res.data?.map(r => r.date) || [])

3. Добавь функции:
   async function addRestDay(dateStr: string) {
     if (!userId) return
     const supabase = createClient()
     await supabase.from('rest_days').upsert({ player_id: userId, date: dateStr }, { onConflict: 'player_id,date' })
     setRestDays(prev => [...prev.filter(d => d !== dateStr), dateStr])
     // если была тренировка — убрать её
     if (weekSchedule[dateStr]) await removeSchedule(dateStr)
   }
   async function removeRestDay(dateStr: string) {
     if (!userId) return
     const supabase = createClient()
     await supabase.from('rest_days').delete().eq('player_id', userId).eq('date', dateStr)
     setRestDays(prev => prev.filter(d => d !== dateStr))
   }

4. В функции assignWorkout — если день был отдыхом, удалить его:
   if (restDays.includes(dateStr)) await removeRestDay(dateStr)

5. В блоке WEEK CALENDAR, для каждого дня:
   const isRest = restDays.includes(dateStr)
   
   Обновить circleStyle:
   if (isRest): { background: 'rgba(45,31,14,0.06)', border: '1.5px solid rgba(45,31,14,0.12)' }
   
   Вместо цифры показывать: isRest ? '💤' : date.getDate()
   
   emoji: isRest ? '🛌' : (isDone ? '✅' : scheduled ? '💪' : null)
   
6. В workout picker dropdown, после списка тренировок добавь кнопку:
   {!isRest ? (
     <button onClick={() => { addRestDay(dateStr); setSchedulingDay(null) }}
       style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px',
         borderRadius: '10px', background: 'transparent', border: 'none', cursor: 'pointer',
         marginTop: '4px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '8px',
         fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px',
         color: 'rgba(45,31,14,0.5)' }}>
       💤 День отдыха
     </button>
   ) : (
     <button onClick={() => { removeRestDay(dateStr); setSchedulingDay(null) }}
       style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px',
         borderRadius: '10px', background: 'transparent', border: 'none', cursor: 'pointer',
         fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px',
         color: 'rgba(45,31,14,0.5)' }}>
       Убрать день отдыха
     </button>
   )}

После всех изменений:
1. npx tsc --noEmit --skipLibCheck
2. git add app/client/page.tsx
3. git commit -m "feat: week X of Y in program, rest days in weekly calendar"
4. git push origin main
```

---

## СЕССИЯ 2 — ~31k токенов
**Фичи: Сравнение фото + История тренировок**

### ТЫ: SQL — не нужен

### CLAUDE CODE: вставь это

```
Репозиторий: coach-app (Next.js 14 + Supabase + TypeScript).
Дизайн-токены: фон #f5f0e8, акцент #7a4a20, текст #2d1f0e.
Шрифты: Epilogue (italic заголовки), Chillax (body, 300 weight).
AnimatedBackground импортируется из @/app/components/AnimatedBackground и используется на всех страницах.
Стили: секции с borderBottom: '1px solid rgba(45,31,14,0.08)', padding: '28px 0'. Никаких glass-карточек.

--- ЗАДАЧА 1: Страница сравнения фото ---
Новый файл: app/progress/compare/page.tsx

Логика:
- Загружает все weekly_reports пользователя: id, week_start, weight, photo_front, photo_side, photo_back
- Для каждого отчёта с фото — создаёт signed URL (storage bucket 'reports', 3600 сек)
- Два состояния: selectedA (по умолчанию самый старый отчёт), selectedB (по умолчанию последний)

UI:
- Заголовок: Epilogue italic 52px "Прогре" + коричневое "сс." letterSpacing -2px
- Под заголовком: LABEL "сравнение фото" (Chillax 10px, letterSpacing 3px, uppercase, rgba(45,31,14,0.3))
- Два дропдауна: "Точка А" и "Точка Б" — select из дат отчётов (format dd.mm.yyyy)
- Два столбца рядом (50/50, gap 16px):
  Каждый столбец:
    - Дата: Epilogue italic 24px
    - Вес: Epilogue 40px letterSpacing -1px + "кг" Chillax 14px
    - Фото спереди: width 100%, height 220px, objectFit cover, borderRadius 8px
    - Два маленьких фото рядом (сбоку + сзади): width calc(50% - 4px), height 110px, objectFit cover, borderRadius 8px
    - Если фото нет: div placeholder height 220px, background rgba(45,31,14,0.04), borderRadius 8px, text 'Нет фото' по центру
- Снизу: блок с разницей весов
    const diff = selectedB.weight - selectedA.weight
    Epilogue 36px, цвет: diff < 0 ? '#1a7a3c' : '#8a2520'
    Текст: diff < 0 ? `−${Math.abs(diff)} кг` : `+${diff} кг`
    Под числом: Chillax 10px uppercase "За N недель"
- Кнопка "← Назад" → /progress (top left, перед заголовком)

В app/progress/page.tsx — найди кнопки навигации внизу страницы и добавь новую кнопку:
<button onClick={() => router.push('/progress/compare')}
  style={{ padding: '10px 24px', borderRadius: '999px', background: 'transparent',
    border: '1px solid rgba(122,74,32,0.25)', color: '#7a4a20',
    fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', cursor: 'pointer' }}>
  Сравнить фото →
</button>

--- ЗАДАЧА 2: История тренировок ---
Новый файл: app/workout-history/page.tsx

Логика:
- Загружает все workout_logs: exercise_id, w1, w2, w3, saved_at — order by saved_at desc
- Группирует по дате: saved_at.slice(0,10) → Map<string, log[]>
- Сортирует даты новые сверху

EXERCISE_NAMES:
{ foam: 'Миофасциальный релиз', ankle: 'Вращения голеностопа', 'glute-bridge': 'Ягодичный мост',
  'bird-dog': 'Bird Dog', 'wall-squat': 'Присед у стены', 'box-squat': 'Присед на тумбу',
  rdl: 'Румынская тяга', 'db-press': 'Жим гантелей', 'lat-pulldown': 'Тяга верхнего блока',
  'cable-row': 'Тяга горизонт. блока', abductor: 'Разведение ног', 'dead-bug': 'Dead Bug' }

UI:
- Заголовок: Epilogue italic 52px "Истори" + "я." коричневая, letterSpacing -2px
- LABEL "история тренировок"
- Кнопка "← Назад" → /client
- Если нет записей: текст "Тренировок пока нет" + subtext "После первой тренировки всё появится здесь" по центру
- Список сессий. Каждая сессия — секция с borderBottom:
    - Дата: Epilogue italic 22px, форматировать как "12 апр · пн" (toLocaleDateString ru-RU weekday:short day:numeric month:short)
    - Счётчик упражнений: Chillax 10px uppercase "N упражнений"
    - Список упражнений (gap: 8px):
        { EXERCISE_NAMES[log.exercise_id] || log.exercise_id }
        справа: лучший вес = Math.max(parseFloat(w1||'0'), parseFloat(w2||'0'), parseFloat(w3||'0'))
        если > 0: "X кг" Epilogue 15px #7a4a20
        если 0: скрыть

В app/client/page.tsx — в ACTION BUTTONS добавь:
<button onClick={() => router.push('/workout-history')}
  style={{ padding: '10px 24px', borderRadius: '999px', background: 'transparent',
    border: '1px solid rgba(122,74,32,0.25)', color: '#7a4a20',
    fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', cursor: 'pointer' }}>
  История тренировок →
</button>

После всех изменений:
1. npx tsc --noEmit --skipLibCheck
2. git add app/progress/compare/page.tsx app/workout-history/page.tsx app/progress/page.tsx app/client/page.tsx
3. git commit -m "feat: photo compare page, workout history page"
4. git push origin main
```

---

## СЕССИЯ 3 — ~42k токенов
**Фичи: Рост в стартовом отчёте + Заметки тренера + Флаг "осталось N дней"**

### ТЫ: SQL в Supabase

```sql
-- Заметки тренера к отчёту
ALTER TABLE weekly_reports
  ADD COLUMN IF NOT EXISTS coach_feedback text;
```

### CLAUDE CODE: вставь это

```
Репозиторий: coach-app (Next.js 14 + Supabase + TypeScript).
Дизайн-токены: фон #f5f0e8, акцент #7a4a20, текст #2d1f0e.
Шрифты: Epilogue, Chillax 300 weight. Стили: borderBottom секции.

SQL уже выполнен: weekly_reports.coach_feedback text (nullable).

--- ЗАДАЧА 1: Поле роста в стартовом отчёте ---
Файл: app/coach/page.tsx

В starterForms type — добавить поле: height_cm: string
В начальных значениях starterForms — добавить: height_cm: ''
В функции saveStarterReport — добавить в INSERT: height_cm: form.height_cm ? parseFloat(form.height_cm) : null
В JSX формы addingStarterReport — добавить поле рядом с weight:
  { key: 'height_cm', label: 'Рост (см)' }
  в том же grid 2 колонки что и остальные измерения

--- ЗАДАЧА 2: Заметки тренера к отчётам ---
Файлы: app/coach/page.tsx + app/reports-history/page.tsx

В app/coach/page.tsx:
1. В тип ClientData добавить reports типизацию с coach_feedback: string | null
2. В запросе weekly_reports добавить coach_feedback в select
3. В секции "Г — ОТЧЁТ" (развёрнутая карточка клиента), после кнопок "Открыть полный отчёт" и "Все отчёты":
   Добавить стейт editingFeedback: string | null и feedbackText: Record<string, string>
   
   JSX:
   {/* Coach feedback */}
   <div style={{ marginTop: '12px' }}>
     {latestReport.coach_feedback && editingFeedback !== client.id && (
       <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px',
         color: 'rgba(45,31,14,0.5)', fontStyle: 'italic', margin: '0 0 8px',
         borderLeft: '2px solid rgba(122,74,32,0.3)', paddingLeft: '10px' }}>
         {latestReport.coach_feedback}
       </p>
     )}
     {editingFeedback === client.id ? (
       <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
         <textarea
           value={feedbackText[client.id] || ''}
           onChange={e => setFeedbackText(prev => ({ ...prev, [client.id]: e.target.value }))}
           placeholder="Заметка к отчёту..."
           rows={2}
           style={{ width: '100%', background: 'rgba(0,0,0,0.04)', border: 'none',
             borderRadius: '10px', padding: '10px 12px', fontFamily: 'Chillax, sans-serif',
             fontWeight: 300, fontSize: '13px', color: '#2d1f0e', outline: 'none',
             resize: 'none', lineHeight: 1.5, boxSizing: 'border-box' }}
         />
         <div style={{ display: 'flex', gap: '8px' }}>
           <button onClick={async () => {
             const supabase = createClient()
             await supabase.from('weekly_reports')
               .update({ coach_feedback: feedbackText[client.id] || null })
               .eq('id', latestReport.id)
             setClients(prev => prev.map(c => c.id === client.id ? {
               ...c,
               report: { ...c.report, coach_feedback: feedbackText[client.id] },
               reports: c.reports.map((r, i) => i === 0 ? { ...r, coach_feedback: feedbackText[client.id] } : r)
             } : c))
             setEditingFeedback(null)
           }} style={{ padding: '6px 16px', borderRadius: '999px', background: '#7a4a20',
             color: '#fff', border: 'none', fontFamily: 'Chillax, sans-serif',
             fontWeight: 300, fontSize: '12px', cursor: 'pointer' }}>
             Сохранить
           </button>
           <button onClick={() => setEditingFeedback(null)}
             style={{ padding: '6px 14px', borderRadius: '999px', background: 'transparent',
               border: 'none', color: 'rgba(45,31,14,0.4)', fontFamily: 'Chillax, sans-serif',
               fontWeight: 300, fontSize: '12px', cursor: 'pointer' }}>
             Отмена
           </button>
         </div>
       </div>
     ) : (
       <button onClick={() => {
         setEditingFeedback(client.id)
         setFeedbackText(prev => ({ ...prev, [client.id]: latestReport.coach_feedback || '' }))
       }} style={{ background: 'none', border: 'none', fontFamily: 'Chillax, sans-serif',
         fontWeight: 300, fontSize: '11px', color: 'rgba(122,74,32,0.7)', cursor: 'pointer',
         padding: 0, textDecoration: 'underline', textUnderlineOffset: '2px' }}>
         {latestReport.coach_feedback ? 'Редактировать заметку' : '+ Написать заметку тренера'}
       </button>
     )}
   </div>

В app/reports-history/page.tsx:
- В тип Report добавить: coach_feedback: string | null
- В запросе добавить coach_feedback в select
- В каждом отчёте, после notes, добавить:
  {r.coach_feedback && (
    <div style={{ borderLeft: '2px solid rgba(122,74,32,0.25)', paddingLeft: '10px', marginTop: '10px' }}>
      <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px',
        letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(122,74,32,0.5)', margin: '0 0 4px' }}>
        От тренера
      </p>
      <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '13px',
        color: 'rgba(45,31,14,0.6)', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
        {r.coach_feedback}
      </p>
    </div>
  )}

--- ЗАДАЧА 3: Флаг "осталось N дней" до конца оплаты ---
Файл: app/coach/page.tsx

В клиентской карточке (header), рядом с бейджем оплаты, добавить:

  const now = new Date()
  const daysUntilExpiry = payment?.period_end
    ? Math.ceil((new Date(payment.period_end).getTime() - now.getTime()) / 86400000)
    : null

  {payment && !payment.paid && daysUntilExpiry !== null && daysUntilExpiry <= 0 && (
    <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px',
      padding: '4px 10px', borderRadius: '999px', background: 'transparent',
      border: '1px solid rgba(138,37,32,0.5)', color: '#8a2520',
      whiteSpace: 'nowrap', letterSpacing: '1px' }}>
      Просрочено
    </span>
  )}
  {payment && daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 5 && (
    <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px',
      padding: '4px 10px', borderRadius: '999px', background: 'transparent',
      border: '1px solid rgba(184,134,11,0.5)', color: '#b8860b',
      whiteSpace: 'nowrap', letterSpacing: '1px' }}>
      ⏰ {daysUntilExpiry} дн.
    </span>
  )}

После всех изменений:
1. npx tsc --noEmit --skipLibCheck
2. git add app/coach/page.tsx app/reports-history/page.tsx
3. git commit -m "feat: height in starter report, coach feedback on reports, payment expiry badge"
4. git push origin main
```

---

## СЕССИЯ 4 — ~43k токенов
**Фича: Страница клиента для тренера /coach/clients/[id]**

### ТЫ: SQL — не нужен

### CLAUDE CODE: вставь это

```
Репозиторий: coach-app (Next.js 14 + Supabase + TypeScript).
Дизайн-токены: фон #f5f0e8, акцент #7a4a20, текст #2d1f0e.
Шрифты: Epilogue (italic заголовки), Chillax (body, 300 weight).
AnimatedBackground на всех страницах.
Стили: borderBottom секции, padding 28px 0, без glass-карточек.

--- ЗАДАЧА: Страница клиента для тренера ---
Новый файл: app/coach/clients/[id]/page.tsx

Параметры: params.id = client_id (uuid)

Данные загрузить параллельно (Promise.all):
1. profiles: name, height_cm — WHERE id = clientId
2. workout_logs: все — WHERE player = clientId ORDER BY saved_at DESC LIMIT 50
3. weekly_reports: все — WHERE player_id = clientId ORDER BY week_start DESC LIMIT 20
   + создать signed URLs для photo_front, photo_side, photo_back (bucket 'reports', 3600s)
4. payments: последний — WHERE player_id = clientId ORDER BY created_at DESC LIMIT 1
5. mood_logs: последний — WHERE player_id = clientId ORDER BY logged_date DESC LIMIT 1
6. nutrition_plans: WHERE player_id = clientId
7. programs: активные — WHERE is_active = true (потом фильтровать по assigned_to contains clientId)
8. workouts: активные — WHERE is_active = true (потом найти назначенную клиенту)

Вычислить:
- assignedWorkout = workouts.find(w => w.assigned_to_multiple?.includes(clientId))
- clientProgram = programs.find(p => p.assigned_to?.includes(clientId))
- weekOffset = clientProgram ? Math.floor((now - new Date(clientProgram.start_date)) / (7*86400000)) : 0
- currentWeek = weekOffset % (clientProgram?.workout_ids?.length || 1) + 1
- fourWeeksAgo = new Date(now - 28*86400000)
- recentLogs = logs.filter(l => new Date(l.saved_at) >= fourWeeksAgo)
- completionPct = Math.min(100, Math.round((new Set(recentLogs.map(l=>l.saved_at.slice(0,10))).size / 16) * 100))
- lastReport = reports[0]
- latestWeight = lastReport?.weight
- bmi = latestWeight && profile.height_cm ? +(latestWeight / Math.pow(profile.height_cm/100, 2)).toFixed(1) : null

UI структура:

HEADER секция:
  <button onClick={() => router.push('/coach')} style back button "← Клиенты">
  Имя: Epilogue italic 52px, letterSpacing -2px (последние 2 буквы #7a4a20)
  LABEL "профиль клиента"
  Значки активности: lastSeen (сколько дней назад), completionPct%

ПРОГРАММА секция (если clientProgram):
  LABEL "Программа"
  Название Epilogue 22px
  "Неделя {currentWeek} из {clientProgram.workout_ids.length}" Chillax 11px
  Даты: start_date — end_date
  Прогресс-бар completionPct: height 2px, background rgba(45,31,14,0.08), fill #7a4a20

ТЕЛО секция:
  LABEL "Физические данные"
  Горизонтальный ряд 3 метрики (borderRight разделители):
  - Вес: latestWeight (48px Epilogue) + "кг" (Chillax 14px) + label "Сейчас"
  - Рост: profile.height_cm (48px) + "см" + label "Рост"
  - ИМТ: bmi + label "ИМТ · Норма/Избыток" (цвет как в client/page.tsx)

ОПЛАТА секция:
  LABEL "Оплата"
  Бейдж оплачено/не оплачено, сумма/мес, период
  Кнопка toggle "✓ Отметить оплату" / "✕ Отменить оплату"
  daysUntilExpiry badge если <= 5 дней

КБЖУ секция (если nutrition):
  LABEL "Питание"
  4 числа в ряд (calories/protein/fat/carbs) как в client/page.tsx

ПОСЛЕДНИЙ ОТЧЁТ секция:
  LABEL "Отчёт недели"
  Если нет: текст "Отчётов нет"
  Если есть:
    - Дата + вес крупно
    - Измерения строкой (грудь/талия/бёдра/etc)
    - Фото 3 штуки маленьких рядом (52x52, borderRadius 8px)
    - coach_feedback (если есть, borderLeft стиль)
    - Кнопка "Все отчёты" — accordion показывает все остальные отчёты

НАСТРОЕНИЕ секция (если mood):
  LABEL "Самочувствие сегодня"
  Эмодзи + Энергия N/10 + Боль мышц N/10

ПОСЛЕДНИЕ ТРЕНИРОВКИ секция:
  LABEL "Последние тренировки"
  Последние 5 сессий сгруппированных по дате
  Каждая: дата italic + список упражнений с весами

УДАЛИТЬ клиента:
  Кнопка текстовая "Удалить клиента" rgba(138,37,32,0.4) внизу, логика как в coach/page.tsx

---

В app/coach/page.tsx — в клиентской карточке (header), добавить кнопку справа от имени:
  <button onClick={e => { e.stopPropagation(); router.push('/coach/clients/' + client.id) }}
    style={{ background: 'none', border: 'none', fontFamily: 'Chillax, sans-serif',
      fontWeight: 300, fontSize: '11px', color: 'rgba(122,74,32,0.6)', cursor: 'pointer',
      padding: '2px 8px', textDecoration: 'underline', textUnderlineOffset: '2px',
      flexShrink: 0 }}>
    Профиль →
  </button>

После всех изменений:
1. npx tsc --noEmit --skipLibCheck
2. git add app/coach/clients/[id]/page.tsx app/coach/page.tsx
3. git commit -m "feat: coach client profile page /coach/clients/[id]"
4. git push origin main
```

---

## СЕССИЯ 5 — ~37k токенов
**Фичи: Библиотека упражнений + Шаблоны программ**

### ТЫ: SQL в Supabase

```sql
-- Шаблоны программ
ALTER TABLE programs ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS template_name text;
```

### CLAUDE CODE: вставь это

```
Репозиторий: coach-app (Next.js 14 + Supabase + TypeScript).
Дизайн-токены: фон #f5f0e8, акцент #7a4a20, текст #2d1f0e.
Шрифты: Epilogue, Chillax 300.

SQL уже выполнен:
- programs.is_template boolean DEFAULT false
- programs.template_name text

--- ЗАДАЧА 1: Компонент библиотеки упражнений ---
Новый файл: app/components/ExerciseLibrary.tsx

Props: { onSelect: (exercise: { name: string; sets: number; reps: string; description: string }) => void; onClose: () => void }

Статичный массив EXERCISE_LIBRARY:
const EXERCISE_LIBRARY = [
  { group: 'Ноги', exercises: [
    { name: 'Присед со штангой', sets: 4, reps: '8-10' },
    { name: 'Присед на тумбу', sets: 3, reps: '12-15' },
    { name: 'Жим ногами', sets: 3, reps: '12-15' },
    { name: 'Выпады с гантелями', sets: 3, reps: '10-12' },
    { name: 'Румынская тяга', sets: 3, reps: '10-12' },
    { name: 'Сгибания ног лёжа', sets: 3, reps: '12-15' },
    { name: 'Разгибания ног', sets: 3, reps: '15' },
  ]},
  { group: 'Ягодицы', exercises: [
    { name: 'Ягодичный мост со штангой', sets: 4, reps: '12' },
    { name: 'Болгарские выпады', sets: 3, reps: '10-12' },
    { name: 'Отведение ног в кроссовере', sets: 3, reps: '15' },
    { name: 'Разведение ног (abductor)', sets: 3, reps: '15-20' },
    { name: 'Монстр-вок с резиной', sets: 3, reps: '15' },
  ]},
  { group: 'Спина', exercises: [
    { name: 'Тяга верхнего блока', sets: 3, reps: '10-12' },
    { name: 'Тяга горизонтального блока', sets: 3, reps: '10-12' },
    { name: 'Тяга гантели одной рукой', sets: 3, reps: '10-12' },
    { name: 'Гиперэкстензия', sets: 3, reps: '15' },
    { name: 'Подтягивания', sets: 3, reps: 'макс' },
  ]},
  { group: 'Грудь', exercises: [
    { name: 'Жим гантелей лёжа', sets: 3, reps: '10-12' },
    { name: 'Жим на наклонной скамье', sets: 3, reps: '10-12' },
    { name: 'Разводка гантелей', sets: 3, reps: '12-15' },
    { name: 'Кроссовер', sets: 3, reps: '15' },
  ]},
  { group: 'Плечи', exercises: [
    { name: 'Жим гантелей сидя', sets: 3, reps: '10-12' },
    { name: 'Боковые подъёмы', sets: 3, reps: '12-15' },
    { name: 'Тяга к подбородку', sets: 3, reps: '12' },
  ]},
  { group: 'Пресс / кор', exercises: [
    { name: 'Dead Bug', sets: 3, reps: '10' },
    { name: 'Bird Dog', sets: 3, reps: '10' },
    { name: 'Скручивания', sets: 3, reps: '15-20' },
    { name: 'Планка', sets: 3, reps: '30-60 сек' },
    { name: 'Подъём ног лёжа', sets: 3, reps: '12-15' },
  ]},
  { group: 'Разминка', exercises: [
    { name: 'Миофасциальный релиз', sets: 1, reps: '60 сек/зона' },
    { name: 'Вращения голеностопа', sets: 1, reps: '10 в каждую' },
    { name: 'Ягодичный мост (активация)', sets: 2, reps: '15' },
  ]},
]

UI: попап (fixed overlay rgba(0,0,0,0.4), центрированный, max-width 480px, background #f5f0e8, borderRadius 20px, padding 24px):
- Заголовок "Библиотека" Epilogue 22px + кнопка закрыть ✕
- Поиск: input type=text "Найти упражнение..." стиль как другие инпуты
- Фильтр групп: горизонтальный скролл с кнопками групп (Все / Ноги / Ягодицы / ...)
  активная кнопка: background #7a4a20, color #fff; остальные: border rgba(45,31,14,0.15)
- Список отфильтрованных упражнений (max-height 350px, overflow-y auto):
  каждое упражнение: padding 10px 0, borderBottom rgba(45,31,14,0.06)
  имя Chillax 13px + сетс×повт правее rgba(45,31,14,0.4)
  при клике: onSelect({ name, sets, reps: reps, description: '' })

Интеграция в app/coach/workout/new/page.tsx:
- Добавить стейт: showLibrary: boolean = false
- Рядом с существующей кнопкой добавления упражнения добавить:
  <button onClick={() => setShowLibrary(true)}>
    Из библиотеки
  </button>
- Когда библиотека выбрала упражнение: добавить его в массив exercises формы
- <ExerciseLibrary onSelect={...} onClose={() => setShowLibrary(false)} /> рендерить если showLibrary

Та же интеграция в app/coach/workout/edit/[id]/page.tsx.

--- ЗАДАЧА 2: Шаблоны программ ---
Файлы: app/coach/programs/new/page.tsx + app/coach/programs/page.tsx

В app/coach/programs/new/page.tsx:
1. Добавить стейт: isTemplate: boolean, templateName: string
2. Загрузить шаблоны: programs WHERE is_template = true — в useEffect
3. Перед формой добавить секцию "Создать из шаблона":
   Если есть шаблоны — показать кнопки с названиями.
   При клике на шаблон: setTitle(template.title), setWorkoutIds(template.workout_ids)
4. Внизу формы, перед кнопкой сохранения:
   <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 0', borderTop: '1px solid rgba(45,31,14,0.08)' }}>
     <input type="checkbox" checked={isTemplate} onChange={e => setIsTemplate(e.target.checked)} />
     <label Chillax 13px>Сохранить как шаблон</label>
   </div>
   {isTemplate && <input placeholder="Название шаблона (например: Базовый 8 недель)" ... />}
5. При сохранении добавить в INSERT: is_template: isTemplate, template_name: isTemplate ? templateName : null
   Если is_template = true: НЕ назначать клиентам (selectedClients = [])

В app/coach/programs/page.tsx:
1. Добавить tabs: "Программы" / "Шаблоны" — стейт activeTab: 'programs' | 'templates'
2. Фильтровать список: programs WHERE is_template = activeTab === 'templates'
3. В шаблонах: кнопка "Использовать" → router.push('/coach/programs/new?template=' + prog.id)
4. В new/page.tsx: в useEffect читать searchParams.get('template') → загрузить шаблон и prefill форму

После всех изменений:
1. npx tsc --noEmit --skipLibCheck
2. git add app/components/ExerciseLibrary.tsx app/coach/workout/new/page.tsx app/coach/workout/edit/[id]/page.tsx app/coach/programs/new/page.tsx app/coach/programs/page.tsx
3. git commit -m "feat: exercise library component, program templates"
4. git push origin main
```

---

## СЕССИЯ 6 — ~14k токенов
**Фича: Настройки тренера /coach/settings**

### ТЫ: SQL — не нужен

### CLAUDE CODE: вставь это

```
Репозиторий: coach-app (Next.js 14 + Supabase + TypeScript).
Дизайн-токены: фон #f5f0e8, акцент #7a4a20, текст #2d1f0e.
Шрифты: Epilogue (italic), Chillax 300. AnimatedBackground на всех страницах.
Стили: секции borderBottom 1px solid rgba(45,31,14,0.08), padding 28px 0.

--- ЗАДАЧА: Страница настроек тренера ---
Новый файл: app/coach/settings/page.tsx

Скопируй структуру из app/settings/page.tsx и адаптируй под тренера.
Маршрут: /coach/settings

Логика:
- Загружает profiles (name, avatar_url) WHERE id = auth user
- Проверяет role = 'coach', иначе redirect /client

Секции:

HEADER:
  Заголовок Epilogue italic 52px "Настро" + "йки." коричневое
  LABEL "профиль тренера"
  Кнопка "← Дашборд" → /coach

АВАТАР секция:
  Круглый аватар 80px (если есть avatar_url — img, иначе инициал имени)
  Кнопка "Изменить фото" → input type=file accept=image/*
  При выборе: upload в bucket 'avatars' путь '{userId}/avatar.jpg', upsert: true
  Затем: UPDATE profiles SET avatar_url = publicUrl
  Preview сразу после upload

ИМЯ секция:
  Текущее имя Epilogue 24px
  Кнопка "Изменить" → inline input + "Сохранить"
  UPDATE profiles SET name = newName WHERE id = userId

ПАРОЛЬ секция:
  Кнопка "Изменить пароль"
  При клике: два input (новый пароль + подтверждение)
  supabase.auth.updateUser({ password: newPassword })
  Показать "Пароль обновлён ✓" после успеха

ВЫХОД:
  Кнопка "Выйти из аккаунта" → signOut → router.push('/')

---
В app/coach/page.tsx — кнопка ⚙️ в header уже есть (стиль: background none, цвет rgba(45,31,14,0.3)).
Убедись что она делает router.push('/coach/settings').
Если не делает — добавь onClick.

После всех изменений:
1. npx tsc --noEmit --skipLibCheck
2. git add app/coach/settings/page.tsx app/coach/page.tsx
3. git commit -m "feat: coach settings page"
4. git push origin main
```

---

## ИТОГО

| Сессия | Фичи | Токенов | SQL нужен |
|--------|------|---------|-----------|
| 1 | Неделя X/Y + Дни отдыха | ~15k | ✅ Да |
| 2 | Сравнение фото + История тренировок | ~31k | — |
| 3 | Рост в отчёте + Заметки тренера + Флаг дней | ~42k | ✅ Да |
| 4 | Страница клиента для тренера | ~43k | — |
| 5 | Библиотека упражнений + Шаблоны | ~37k | ✅ Да |
| 6 | Настройки тренера | ~14k | — |
