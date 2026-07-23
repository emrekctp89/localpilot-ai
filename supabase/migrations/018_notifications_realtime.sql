-- LocalPilot AI: enable Realtime for owner notifications (Faz H.4)
-- Prerequisites: 017_business_notifications.sql MUST be applied first
-- (creates public.business_notifications).

DO $$
BEGIN
  IF to_regclass('public.business_notifications') IS NULL THEN
    RAISE EXCEPTION
      'public.business_notifications yok. Önce 017_business_notifications.sql çalıştırın, sonra 018.'
      USING ERRCODE = '42P01';
  END IF;

  -- Realtime INSERT events for in-app bell (poll remains as fallback)
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'business_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.business_notifications;
  END IF;

  -- Replica identity FULL so UPDATE payloads include old row (mark-read)
  ALTER TABLE public.business_notifications REPLICA IDENTITY FULL;
END $$;

INSERT INTO schema_migrations (version, name) VALUES
  ('018', '018_notifications_realtime.sql')
ON CONFLICT (version) DO NOTHING;

COMMENT ON TABLE public.business_notifications IS
  'In-app notifications for business owners (leads, mini site). Realtime enabled.';
