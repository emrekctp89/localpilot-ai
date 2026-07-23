-- LocalPilot AI: enable Realtime for owner notifications (Faz H.4)
-- Run in Supabase SQL Editor after 017_business_notifications.sql

-- Realtime INSERT events for in-app bell (poll remains as fallback)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'business_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.business_notifications;
  END IF;
END $$;

-- Replica identity FULL so UPDATE payloads include old row (mark-read)
ALTER TABLE public.business_notifications REPLICA IDENTITY FULL;

INSERT INTO schema_migrations (version, name) VALUES
  ('018', '018_notifications_realtime.sql')
ON CONFLICT (version) DO NOTHING;

COMMENT ON TABLE public.business_notifications IS
  'In-app notifications for business owners (leads, mini site). Realtime enabled.';
