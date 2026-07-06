-- LocalPilot AI: free-tier AI usage counters (Faz 5.1)
-- Run in Supabase SQL Editor or via supabase db push

CREATE TABLE IF NOT EXISTS ai_usage_counters (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'monthly')),
  period_key TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, period_type, period_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_counters_user
  ON ai_usage_counters(user_id);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pro_activated_at TIMESTAMPTZ;

ALTER TABLE ai_usage_counters ENABLE ROW LEVEL SECURITY;