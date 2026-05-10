-- ============================================================
-- Coach App — Schema Migration Baseline
-- Выполнять СТРОГО по порядку. Шаг 3 — только после проверки.
--
-- Выполнить в: Supabase → SQL Editor → New query
-- ============================================================


-- ============================================================
-- ШАГ 1: Удалить мёртвое поле workouts.assigned_to
-- Безопасно: код везде использует assigned_to_multiple
-- ============================================================

ALTER TABLE workouts DROP COLUMN IF EXISTS assigned_to;


-- ============================================================
-- ШАГ 2: Перенести старые замеры в новые поля (weekly_reports)
-- ============================================================

-- Заполнить left_thigh / right_thigh из old-поля one_thigh
UPDATE weekly_reports
SET
  left_thigh  = COALESCE(left_thigh,  one_thigh),
  right_thigh = COALESCE(right_thigh, one_thigh)
WHERE one_thigh IS NOT NULL
  AND (left_thigh IS NULL OR right_thigh IS NULL);

-- Заполнить left_arm / right_arm из old-поля arm
UPDATE weekly_reports
SET
  left_arm  = COALESCE(left_arm,  arm),
  right_arm = COALESCE(right_arm, arm)
WHERE arm IS NOT NULL
  AND (left_arm IS NULL OR right_arm IS NULL);


-- ============================================================
-- ШАГ 3: ПРОВЕРКА — запустить отдельно, убедиться что = 0
-- Только после этого выполнять ШАГ 4
-- ============================================================

SELECT COUNT(*) AS remaining_unmigrated
FROM weekly_reports
WHERE (one_thigh IS NOT NULL AND (left_thigh IS NULL OR right_thigh IS NULL))
   OR (arm       IS NOT NULL AND (left_arm   IS NULL OR right_arm   IS NULL));

-- Ожидаемый результат: 0
-- Если > 0 — НЕ выполнять ШАГ 4, сообщить


-- ============================================================
-- ШАГ 4: Удалить устаревшие поля (только после COUNT = 0)
-- ============================================================

ALTER TABLE weekly_reports DROP COLUMN IF EXISTS one_thigh;
ALTER TABLE weekly_reports DROP COLUMN IF EXISTS arm;


-- ============================================================
-- ШАГ 5: Добавить CHECK constraint на profiles.role
-- Безопасно: код никогда не пишет других значений
-- ============================================================

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('coach', 'client'));


-- ============================================================
-- ШАГ 6: Убрать дублирующий UNIQUE на workout_logs
-- ============================================================

ALTER TABLE workout_logs
  DROP CONSTRAINT IF EXISTS workout_logs_player_exercise_unique;

ALTER TABLE workout_logs
  ADD CONSTRAINT workout_logs_player_exercise_unique
  UNIQUE (player, exercise_id);


-- ============================================================
-- ШАГ 7: Добавить недостающие колонки (ADD IF NOT EXISTS — безопасно)
-- ============================================================

ALTER TABLE programs        ADD COLUMN IF NOT EXISTS end_date     date;
ALTER TABLE payments        ADD COLUMN IF NOT EXISTS monthly_rate numeric;
ALTER TABLE weekly_reports  ADD COLUMN IF NOT EXISTS height_cm    numeric;
ALTER TABLE profiles        ADD COLUMN IF NOT EXISTS height_cm    numeric;
ALTER TABLE profiles        ADD COLUMN IF NOT EXISTS onboarded    boolean DEFAULT false;
ALTER TABLE workout_logs    ADD COLUMN IF NOT EXISTS workout_id   uuid;
ALTER TABLE workouts        ADD COLUMN IF NOT EXISTS assigned_to_multiple uuid[];
ALTER TABLE weekly_reports  ADD COLUMN IF NOT EXISTS left_arm     numeric;
ALTER TABLE weekly_reports  ADD COLUMN IF NOT EXISTS right_arm    numeric;
ALTER TABLE weekly_reports  ADD COLUMN IF NOT EXISTS left_thigh   numeric;
ALTER TABLE weekly_reports  ADD COLUMN IF NOT EXISTS right_thigh  numeric;


-- ============================================================
-- ФИНАЛЬНАЯ ПРОВЕРКА
-- ============================================================

-- Убедиться что одна политика на workout_logs
SELECT conname
FROM pg_constraint
WHERE conrelid = 'workout_logs'::regclass
  AND contype = 'u'
ORDER BY conname;
-- Ожидается: одна строка workout_logs_player_exercise_unique

-- Убедиться что CHECK существует
SELECT conname
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass
  AND contype = 'c';
-- Ожидается: profiles_role_check
