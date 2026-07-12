-- LocalPilot AI: in-app notifications for business owners (Faz H)
-- Run in Supabase SQL Editor after 016_public_mini_site_read.sql

CREATE TABLE IF NOT EXISTS business_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL
    CHECK (type IN (
      'lead.created',
      'mini_site.updated',
      'mini_site.published',
      'mini_site.draft'
    )),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_notifications_business_created
  ON business_notifications (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_business_notifications_unread
  ON business_notifications (business_id, created_at DESC)
  WHERE read_at IS NULL;

ALTER TABLE business_notifications ENABLE ROW LEVEL SECURITY;

-- Members / owners can read their notifications
DROP POLICY IF EXISTS business_notifications_select ON business_notifications;
CREATE POLICY business_notifications_select ON business_notifications
  FOR SELECT
  USING (
    public.user_owns_business(business_id)
    OR public.user_is_business_member(business_id)
  );

-- Members with write access can mark read / manage
DROP POLICY IF EXISTS business_notifications_update ON business_notifications;
CREATE POLICY business_notifications_update ON business_notifications
  FOR UPDATE
  USING (
    public.user_owns_business(business_id)
    OR public.user_can_write_business(business_id)
  )
  WITH CHECK (
    public.user_owns_business(business_id)
    OR public.user_can_write_business(business_id)
  );

-- Authenticated writers may insert (e.g. settings save)
DROP POLICY IF EXISTS business_notifications_insert_member ON business_notifications;
CREATE POLICY business_notifications_insert_member ON business_notifications
  FOR INSERT
  WITH CHECK (
    public.user_owns_business(business_id)
    OR public.user_can_write_business(business_id)
  );

-- Public lead form: anon cannot INSERT directly; use SECURITY DEFINER RPC
CREATE OR REPLACE FUNCTION public.notify_business_lead(
  p_business_id UUID,
  p_full_name TEXT,
  p_phone TEXT DEFAULT '',
  p_notes TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_name TEXT;
  v_title TEXT;
  v_body TEXT;
BEGIN
  IF p_business_id IS NULL THEN
    RAISE EXCEPTION 'business_id required';
  END IF;

  IF NOT public.business_exists(p_business_id) THEN
    RAISE EXCEPTION 'business not found';
  END IF;

  v_name := NULLIF(trim(p_full_name), '');
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'full_name required';
  END IF;

  v_title := 'Yeni mini site lead';
  v_body := v_name
    || CASE WHEN NULLIF(trim(p_phone), '') IS NOT NULL
         THEN ' · ' || trim(p_phone)
         ELSE ''
       END
    || CASE WHEN NULLIF(trim(p_notes), '') IS NOT NULL
         THEN ' — ' || left(trim(p_notes), 120)
         ELSE ''
       END;

  INSERT INTO business_notifications (
    business_id, type, title, body, metadata
  ) VALUES (
    p_business_id,
    'lead.created',
    v_title,
    v_body,
    jsonb_build_object(
      'full_name', v_name,
      'phone', COALESCE(trim(p_phone), ''),
      'notes', COALESCE(trim(p_notes), '')
    )
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_business_lead(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_business_lead(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;

COMMENT ON TABLE business_notifications IS
  'In-app notifications for business owners (leads, mini site changes).';
COMMENT ON FUNCTION public.notify_business_lead IS
  'Public mini-site lead → owner notification (SECURITY DEFINER).';

INSERT INTO schema_migrations (version, name) VALUES
  ('017', '017_business_notifications.sql')
ON CONFLICT (version) DO NOTHING;
