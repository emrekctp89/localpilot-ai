-- LocalPilot AI: campaigns + content_items (Faz 2.1)
-- Run in Supabase SQL Editor after 002_core_rls.sql

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  campaign_name TEXT NOT NULL,
  strategy TEXT NOT NULL,
  sms_whatsapp_template TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('social_post', 'whatsapp_template')),
  platform TEXT,
  label TEXT,
  body TEXT NOT NULL,
  image_prompt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_business ON campaigns(business_id);
CREATE INDEX IF NOT EXISTS idx_content_items_business ON content_items(business_id);
CREATE INDEX IF NOT EXISTS idx_content_items_type ON content_items(business_id, content_type);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaigns_owner ON campaigns;
CREATE POLICY campaigns_owner ON campaigns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = campaigns.business_id
        AND businesses.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS content_items_owner ON content_items;
CREATE POLICY content_items_owner ON content_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = content_items.business_id
        AND businesses.owner_id = auth.uid()
    )
  );