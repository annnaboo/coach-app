-- ============================================================
-- Coach App — Security RLS Fix
-- Проблемы:
--   1. programs_client_select — любой клиент читает ВСЕ активные программы
--   2. weekly_reports — RLS отсутствует (любой авторизованный читает/пишет)
--   3. payments — RLS отсутствует
--   4. nutrition_plans — RLS отсутствует
--   5. progress_photos — RLS отсутствует
--
-- Выполнить в: Supabase → SQL Editor → New query
-- ============================================================


-- ============================================================
-- ФИХ 1: programs — клиент видит только свои программы
-- ============================================================

DROP POLICY IF EXISTS "programs_client_select" ON programs;

-- Клиент читает только программы, в которых он числится в assigned_to
CREATE POLICY "programs_client_select" ON programs
  FOR SELECT USING (
    is_active = true
    AND auth.uid() = ANY(assigned_to)
  );

-- Тренер уже покрыт политикой programs_coach_all (ALL) — не трогаем


-- ============================================================
-- ФИХ 2: weekly_reports — только свои данные + тренер
-- ============================================================

ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_select" ON weekly_reports;
DROP POLICY IF EXISTS "reports_insert" ON weekly_reports;
DROP POLICY IF EXISTS "reports_update" ON weekly_reports;
DROP POLICY IF EXISTS "reports_delete" ON weekly_reports;

CREATE POLICY "reports_select" ON weekly_reports
  FOR SELECT USING (
    auth.uid() = player_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "reports_insert" ON weekly_reports
  FOR INSERT WITH CHECK (auth.uid() = player_id);

CREATE POLICY "reports_update" ON weekly_reports
  FOR UPDATE USING (auth.uid() = player_id);

-- Тренер может удалять отчёты (административная задача)
CREATE POLICY "reports_delete" ON weekly_reports
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );


-- ============================================================
-- ФИХ 3: payments — клиент видит только своё, тренер — всё
-- ============================================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select" ON payments;
DROP POLICY IF EXISTS "payments_insert" ON payments;
DROP POLICY IF EXISTS "payments_update" ON payments;
DROP POLICY IF EXISTS "payments_delete" ON payments;

CREATE POLICY "payments_select" ON payments
  FOR SELECT USING (
    auth.uid() = player_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

-- Только тренер создаёт и редактирует записи об оплате
CREATE POLICY "payments_insert" ON payments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "payments_update" ON payments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "payments_delete" ON payments
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );


-- ============================================================
-- ФИХ 4: nutrition_plans — клиент читает только своё
-- ============================================================

ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nutrition_select" ON nutrition_plans;
DROP POLICY IF EXISTS "nutrition_insert" ON nutrition_plans;
DROP POLICY IF EXISTS "nutrition_update" ON nutrition_plans;

CREATE POLICY "nutrition_select" ON nutrition_plans
  FOR SELECT USING (
    auth.uid() = player_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

-- Только тренер создаёт и обновляет план питания
CREATE POLICY "nutrition_insert" ON nutrition_plans
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "nutrition_update" ON nutrition_plans
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );


-- ============================================================
-- ФИХ 5: progress_photos — клиент управляет своими, тренер читает
-- ============================================================

ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "photos_select" ON progress_photos;
DROP POLICY IF EXISTS "photos_insert" ON progress_photos;
DROP POLICY IF EXISTS "photos_delete" ON progress_photos;

CREATE POLICY "photos_select" ON progress_photos
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "photos_insert" ON progress_photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "photos_delete" ON progress_photos
  FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- ПРОВЕРКА
-- ============================================================

SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN (
  'programs', 'weekly_reports', 'payments', 'nutrition_plans', 'progress_photos'
)
ORDER BY tablename, cmd;
