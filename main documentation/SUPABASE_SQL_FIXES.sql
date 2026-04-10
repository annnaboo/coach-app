-- ============================================================
-- Coach App — SQL фиксы (исправленная версия)
-- Выполнить в: Supabase → SQL Editor → New query
-- Запускать всё сразу (выделить всё → Run)
-- ============================================================


-- ============================================================
-- ФИХ 1: workout_logs — RLS политики
-- Причина: веса не сохраняются и не подгружаются
-- ============================================================

ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workout_logs_insert" ON workout_logs;
DROP POLICY IF EXISTS "workout_logs_select" ON workout_logs;
DROP POLICY IF EXISTS "workout_logs_update" ON workout_logs;

CREATE POLICY "workout_logs_insert" ON workout_logs
  FOR INSERT WITH CHECK (auth.uid()::text = player::text);

CREATE POLICY "workout_logs_select" ON workout_logs
  FOR SELECT USING (
    auth.uid()::text = player::text OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "workout_logs_update" ON workout_logs
  FOR UPDATE USING (auth.uid()::text = player::text);


-- ============================================================
-- ФИХ 2: workout_swap_requests — RLS политики
-- Причина: одобрение/отклонение замены не работает
-- ============================================================

ALTER TABLE workout_swap_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "swap_insert" ON workout_swap_requests;
DROP POLICY IF EXISTS "swap_select" ON workout_swap_requests;
DROP POLICY IF EXISTS "swap_update_coach" ON workout_swap_requests;

CREATE POLICY "swap_insert" ON workout_swap_requests
  FOR INSERT WITH CHECK (auth.uid()::text = player_id::text);

CREATE POLICY "swap_select" ON workout_swap_requests
  FOR SELECT USING (
    auth.uid()::text = player_id::text OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "swap_update_coach" ON workout_swap_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );


-- ============================================================
-- ФИХ 3: mood_logs — UNIQUE constraint для upsert
-- Причина: самочувствие не сохраняется при повторном открытии
-- ============================================================

ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mood_select" ON mood_logs;
DROP POLICY IF EXISTS "mood_insert" ON mood_logs;
DROP POLICY IF EXISTS "mood_upsert" ON mood_logs;

CREATE POLICY "mood_select" ON mood_logs
  FOR SELECT USING (
    auth.uid()::text = player_id::text OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "mood_insert" ON mood_logs
  FOR INSERT WITH CHECK (auth.uid()::text = player_id::text);

CREATE POLICY "mood_upsert" ON mood_logs
  FOR UPDATE USING (auth.uid()::text = player_id::text);

-- Уникальный ключ для upsert (один лог в день на клиента)
ALTER TABLE mood_logs
  DROP CONSTRAINT IF EXISTS mood_logs_player_date_unique;

ALTER TABLE mood_logs
  ADD CONSTRAINT mood_logs_player_date_unique
  UNIQUE (player_id, logged_date);


-- ============================================================
-- ФИХ 4: Storage — политики для аватаров
-- Причина: аватар не сохраняется
-- ============================================================

DROP POLICY IF EXISTS "avatar_upload" ON storage.objects;
DROP POLICY IF EXISTS "avatar_read" ON storage.objects;
DROP POLICY IF EXISTS "avatar_update" ON storage.objects;
DROP POLICY IF EXISTS "avatar_delete" ON storage.objects;

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

CREATE POLICY "avatar_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );


-- ============================================================
-- ПРОВЕРКА — покажет все включённые политики
-- ============================================================

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('workout_logs', 'workout_swap_requests', 'mood_logs')
ORDER BY tablename, cmd;
