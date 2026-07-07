-- LocalPilot AI: business integrations + AI feedback (Faz E)
-- Run in Supabase SQL Editor after 008_schema_migrations.sql

CREATE TABLE IF NOT EXISTS business_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('whatsapp_business', 'google_business')),
  status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('disconnected', 'connected', 'error')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  connected_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, provider)
);

CREATE TABLE IF NOT EXISTS ai_quality_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feature TEXT NOT NULL CHECK (feature IN (
    'content', 'campaign', 'review_analysis', 'google_suggestion', 'decision'
  )),
  rating SMALLINT NOT NULL CHECK (rating IN (-1, 1)),
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_integrations_business
  ON business_integrations(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_quality_feedback_business
  ON ai_quality_feedback(business_id, feature, created_at DESC);

ALTER TABLE business_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_quality_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_integrations_owner ON business_integrations;
CREATE POLICY business_integrations_owner ON business_integrations
  FOR ALL
  USING (public.user_can_write_business(business_id))
  WITH CHECK (public.user_can_write_business(business_id));

DROP POLICY IF EXISTS business_integrations_member_read ON business_integrations;
CREATE POLICY business_integrations_member_read ON business_integrations
  FOR SELECT USING (public.user_can_access_business(business_id));

DROP POLICY IF EXISTS ai_quality_feedback_owner ON ai_quality_feedback;
CREATE POLICY ai_quality_feedback_owner ON ai_quality_feedback
  FOR ALL
  USING (
    user_id = auth.uid()
    AND public.user_can_write_business(business_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    AND public.user_can_write_business(business_id)
  );

INSERT INTO schema_migrations (version, name) VALUES
  ('009', '009_business_integrations.sql')
ON CONFLICT (version) DO NOTHING;