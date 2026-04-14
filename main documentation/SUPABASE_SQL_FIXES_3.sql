-- ============================================================
-- Coach App — SQL фиксы v3
-- Выполнить в: Supabase → SQL Editor → New query
-- ============================================================

-- ФИХ 1: Добавить end_date в таблицу programs
ALTER TABLE programs ADD COLUMN IF NOT EXISTS end_date date;

-- ФИХ 2: RLS для таблицы programs
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "programs_coach_all" ON programs;
DROP POLICY IF EXISTS "programs_client_select" ON programs;

-- Тренер может делать всё со своими программами
CREATE POLICY "programs_coach_all" ON programs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

-- Клиент может читать только активные программы
CREATE POLICY "programs_client_select" ON programs
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND is_active = true
  );

-- ФИХ 3: Добавить monthly_rate в таблицу payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS monthly_rate numeric;

-- ФИХ 4: Добавить height_cm в weekly_reports для расчёта ИМТ
ALTER TABLE weekly_reports ADD COLUMN IF NOT EXISTS height_cm numeric;

-- ФИХ 5: Добавить height_cm в profiles (постоянный параметр)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height_cm numeric;

-- ПРОВЕРКА — покажет все включённые политики
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('programs', 'payments', 'profiles', 'weekly_reports')
ORDER BY tablename, cmd;
