-- LocalPilot AI: CRM follow-ups + status history (Faz 2.2)
-- Run in Supabase SQL Editor after 003_campaigns_content.sql

CREATE TABLE IF NOT EXISTS crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  follow_up_date DATE,
  status_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_activities_business ON crm_activities(business_id);

ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_activities_owner ON crm_activities;
CREATE POLICY crm_activities_owner ON crm_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = crm_activities.business_id
        AND businesses.owner_id = auth.uid()
    )
  );