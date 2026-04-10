# Coach App — Баг-репорт
*По результатам QA-тестирования 08.04.2026*

---

## Итог

| | |
|---|---|
| ✅ Работает | 22 |
| ❌ Баги | 20 |
| ⚠️ Под вопросом | 8 |

---

## 🔴 КРИТИЧНЫЕ — фиксить первыми

---

### БАГ 1 — Программа не назначается клиенту (4.3)

**Симптом:** создаёшь программу, назначаешь клиента — не сохраняется.

**Причина:** Supabase не понимает массив UUID при фильтрации `.contains()`. Это известный баг PostgreSQL uuid[].

**Фикс — в `/coach/programs/new/page.tsx`:**
Когда сохраняешь программу, убедись что `assigned_to` передаётся как массив строк:
```typescript
// ❌ Неправильно
assigned_to: clientId

// ✅ Правильно
assigned_to: [clientId]  // уже массив
```

При чтении программ для клиента — фильтруй на клиентской стороне JS, не через Supabase `.contains()`:
```typescript
// ❌ Не работает с uuid[]
const { data } = await supabase
  .from('programs')
  .select('*')
  .contains('assigned_to', [userId])

// ✅ Работает — тянем все активные и фильтруем на клиенте
const { data } = await supabase
  .from('programs')
  .select('*')
  .eq('is_active', true)

const myProgram = data?.find(p => p.assigned_to?.includes(userId))
```

---

### БАГ 2 — Клиент видит старую тестовую тренировку (5.2, 6.1)

**Симптом:** в блоке "тренировка сегодня" и на `/workout/[id]` показывает первую хардкожную тренировку.

**Причина:** программа не назначается (баг 1), поэтому `getTodayWorkout()` возвращает `null`, и приложение падает обратно на хардкод (скорее всего `/workout/2`).

**Фикс:** сначала починить Баг 1. После этого тренировка должна подтягиваться правильно.

Дополнительно — в `/client/page.tsx` проверь что при `null` программе показывается заглушка, а не редирект на `/workout/2`:
```typescript
if (!program) {
  // показать "Программа ещё не назначена"
  return <p>Тренер ещё не назначил программу</p>
}
```

---

### БАГ 3 — Веса не сохраняются и не подгружаются (6.5, 6.6)

**Симптом:** вводишь веса — не сохраняется. При повторном открытии тренировки — пусто.

**Причина:** для таблицы `workout_logs` нет RLS политик — Supabase блокирует все запросы.

**Фикс — выполнить в Supabase SQL Editor:**
```sql
-- Разрешить клиенту вставлять свои логи
CREATE POLICY "workout_logs_insert" ON workout_logs 
  FOR INSERT WITH CHECK (auth.uid() = player);

-- Разрешить читать свои логи (и тренеру — все)
CREATE POLICY "workout_logs_select" ON workout_logs 
  FOR SELECT USING (
    auth.uid() = player OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

-- Разрешить обновлять свои логи
CREATE POLICY "workout_logs_update" ON workout_logs 
  FOR UPDATE USING (auth.uid() = player);
```

---

### БАГ 4 — Самочувствие не сохраняется (5.6)

**Симптом:** ставишь слайдеры, нажимаешь сохранить — при повторном открытии пусто.

**Причина:** скорее всего RLS политика для `mood_logs` есть, но upsert не работает из-за отсутствия `ON CONFLICT` или неверного ключа.

**Фикс — в коде `/client/page.tsx` при сохранении:**
```typescript
// ✅ Upsert по player_id + logged_date
const { error } = await supabase
  .from('mood_logs')
  .upsert({
    player_id: userId,
    logged_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    mood,
    energy,
    muscle_pain
  }, {
    onConflict: 'player_id,logged_date'  // ← важно!
  })
```

Также нужен UNIQUE constraint в БД:
```sql
ALTER TABLE mood_logs 
  ADD CONSTRAINT mood_logs_player_date_unique 
  UNIQUE (player_id, logged_date);
```

---

### БАГ 5 — Одобрение/отклонение замены тренировки не работает (2.8, 2.9)

**Симптом:** нажимаешь "Одобрить" или "Отклонить" — ничего не происходит.

**Причина:** нет RLS политики для таблицы `workout_swap_requests`, которая разрешает тренеру UPDATE.

**Фикс — в Supabase SQL Editor:**
```sql
-- Клиент может создавать запросы
CREATE POLICY "swap_insert" ON workout_swap_requests 
  FOR INSERT WITH CHECK (auth.uid() = player_id);

-- Тренер видит все запросы
CREATE POLICY "swap_select" ON workout_swap_requests 
  FOR SELECT USING (
    auth.uid() = player_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

-- Тренер может менять статус
CREATE POLICY "swap_update_coach" ON workout_swap_requests 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );
```

---

### БАГ 6 — Фото не отображаются в форме отчёта (8.3, 8.4)

**Симптом:** выбираешь фото — не показывает превью. Тренер не видит отчёт (8.7).

**Причина:** два отдельных бага:
1. Превью в форме — компонент не читает `FileReader` для показа выбранного файла
2. Тренер не видит фото — фото сохраняется как URL вместо path (известный баг из доки)

**Фикс превью — в `/report/page.tsx`:**
```typescript
const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>, side: string) => {
  const file = e.target.files?.[0]
  if (!file) return
  
  // ✅ Показать превью
  const reader = new FileReader()
  reader.onload = (ev) => {
    setPreview(prev => ({ ...prev, [side]: ev.target?.result as string }))
  }
  reader.readAsDataURL(file)
  
  setPhotos(prev => ({ ...prev, [side]: file }))
}
```

**Фикс сохранения фото (path, не URL) — при upload:**
```typescript
const { data, error } = await supabase.storage
  .from('reports')
  .upload(`${userId}/${Date.now()}_front`, file)

// ✅ Сохранять data.path, а НЕ getPublicUrl()
await supabase.from('weekly_reports').upsert({
  photo_front: data?.path,  // ← path, не URL!
  ...
})
```

---

### БАГ 7 — После онбординга ведёт на страницу тренера (1.9)

**Симптом:** новый клиент проходит онбординг и попадает на `/coach` вместо `/client`.

**Причина:** в `/welcome/page.tsx` redirect идёт на `/coach`, или роль не читается правильно.

**Фикс — в `/welcome/page.tsx` в конце онбординга:**
```typescript
// Убедиться что onboarded = true записывается
await supabase
  .from('profiles')
  .update({ onboarded: true })
  .eq('id', userId)

// ✅ Всегда редиректить на /client (не на /coach)
router.push('/client')
```

---

### БАГ 8 — При инвайте подтягивает email тренера (1.8)

**Симптом:** клиент переходит по инвайт-ссылке, на странице установки пароля показывается email тренера.

**Причина:** страница `/auth/set-password` читает `supabase.auth.getUser()` — возвращает текущую активную сессию (тренера), а не инвайт-токен.

**Фикс — в `/auth/set-password/page.tsx`:**
```typescript
// ❌ Неправильно — берёт текущего залогиненного пользователя
const { data: { user } } = await supabase.auth.getUser()

// ✅ Правильно — слушать событие из инвайт-ссылки
useEffect(() => {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
      setEmail(session?.user?.email || '')
    }
  })
}, [])
```

---

## 🟡 СРЕДНИЕ

---

### БАГ 9 — Аватар не сохраняется (10.3)

**Причина:** нет Storage политики для bucket аватаров (или аватары сохраняются в bucket 'reports' без нужной политики).

**Фикс — в Supabase SQL Editor:**
```sql
-- Если аватары в отдельном bucket 'avatars':
CREATE POLICY "avatar_upload" ON storage.objects 
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatar_read" ON storage.objects 
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatar_update" ON storage.objects 
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

### БАГ 10 — Оплата не сохраняется (2.6)

**Симптом:** непонятные поля, не сохраняется.

**Фикс UX:** поля дат заменить на date picker, добавить плейсхолдеры. В коде убедиться что `period_start` и `period_end` передаются как строки формата `YYYY-MM-DD`.

---

### БАГ 11 — Прогресс пуст (7.2)

**Причина:** следствие бага 3 (веса не сохраняются). После фикса RLS политик для `workout_logs` прогресс заработает.

---

### БАГ 12 — История отчётов на стороне тренера (9.3, 9.4)

**Причина:** тренер не видит отчёты из-за бага с фото (баг 6). После фикса сохранения фото как path — отчёты должны появиться.

---

## 🟢 МЕЛКИЕ

---

### БАГ 13 — Нет кнопки удаления упражнения (3.7)

Добавить иконку корзины рядом с каждым упражнением в `/coach/workout/edit/[id]/page.tsx` и `/coach/workout/new/page.tsx`.

---

### БАГ 14 — Сумма оплат не в евро (2.4)

В компоненте с суммой добавить `€` перед числом.

---

### БАГ 15 — Зум в Safari на малых полях (12.2)

Проверить что у ВСЕХ `<input>` стоит `fontSize: 16px` — Safari зумит если меньше.

---

## Порядок фиксов

1. **SQL в Supabase** (баги 3, 4, 5, 9) — занимает 15 минут, не нужен код
2. **Баг с программой** (баг 1) — исправить фильтрацию uuid[]
3. **Фото в отчёте** (баг 6) — FileReader + сохранение path
4. **Онбординг** (баг 7) — redirect на /client
5. **Set-password** (баг 8) — onAuthStateChange
6. **Тренировка дня** (баг 2) — заработает автоматически после багов 1+3
