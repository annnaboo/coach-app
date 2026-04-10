-- ============================================================
-- Coach App — SQL фиксы #2
-- Причина: upsert весов падает без UNIQUE constraint
-- ============================================================

-- 1. Добавить UNIQUE constraint чтобы upsert работал
ALTER TABLE workout_logs
  DROP CONSTRAINT IF EXISTS workout_logs_player_exercise_unique;

ALTER TABLE workout_logs
  ADD CONSTRAINT workout_logs_player_exercise_unique
  UNIQUE (player, exercise_id);

-- 2. Добавить колонку workout_id (код её пишет, в схеме её не было)
ALTER TABLE workout_logs
  ADD COLUMN IF NOT EXISTS workout_id uuid;

-- Проверка
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'workout_logs';
