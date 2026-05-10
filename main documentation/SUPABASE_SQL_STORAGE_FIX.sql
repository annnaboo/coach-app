-- ============================================================
-- Coach App — Storage bucket policies
-- Проблема: бакеты 'reports' и 'progress-photos' не имеют политик,
-- тренер не может видеть фото клиентов.
--
-- Структура путей:
--   reports:          {userId}/{timestamp}_{position}
--   progress-photos:  {userId}/{filename}
--
-- Выполнить в: Supabase → SQL Editor → New query
-- ============================================================


-- ============================================================
-- ФИХ 1: reports — фото еженедельных отчётов
-- ============================================================

DROP POLICY IF EXISTS "reports_upload"   ON storage.objects;
DROP POLICY IF EXISTS "reports_read"     ON storage.objects;
DROP POLICY IF EXISTS "reports_delete"   ON storage.objects;

-- Клиент загружает только в свою папку
CREATE POLICY "reports_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'reports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Клиент читает только свои фото; тренер — все
CREATE POLICY "reports_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'reports'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    )
  );

-- Клиент удаляет только своё
CREATE POLICY "reports_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'reports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- ============================================================
-- ФИХ 2: progress-photos — произвольные фото прогресса
-- ============================================================

DROP POLICY IF EXISTS "progress_photos_upload" ON storage.objects;
DROP POLICY IF EXISTS "progress_photos_read"   ON storage.objects;
DROP POLICY IF EXISTS "progress_photos_delete" ON storage.objects;

CREATE POLICY "progress_photos_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "progress_photos_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'progress-photos'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    )
  );

CREATE POLICY "progress_photos_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- ============================================================
-- ПРОВЕРКА
-- ============================================================

SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE 'reports%' OR policyname LIKE 'progress_photos%'
ORDER BY policyname;
