-- LocalPilot AI: platform scale (Faz 6)
-- Run in Supabase SQL Editor after 005_ai_usage.sql

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'owner'
    CHECK (role IN ('owner', 'agency', 'staff'));

CREATE TABLE IF NOT EXISTS business_members (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'staff', 'read_only')),
  invited_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, user_id),
  UNIQUE (business_id, invited_email)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_api_keys (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'default',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS business_webhooks (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  secret TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_members_user ON business_members(user_id);
CREATE INDEX IF NOT EXISTS idx_business_members_business ON business_members(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_business ON audit_logs(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_api_keys_business ON business_api_keys(business_id);

ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_webhooks ENABLE ROW LEVEL SECURITY;

-- Helper functions (SECURITY DEFINER) avoid businesses <-> business_members RLS recursion.
-- See 007_fix_rls_recursion.sql if upgrading from an earlier 006 without these functions.
CREATE OR REPLACE FUNCTION public.user_owns_business(bid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM businesses WHERE id = bid AND owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_business_member(bid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_members WHERE business_id = bid AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_business(bid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.user_owns_business(bid) OR public.user_is_business_member(bid);
$$;

CREATE OR REPLACE FUNCTION public.user_can_write_business(bid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.user_owns_business(bid)
    OR EXISTS (
      SELECT 1 FROM business_members
      WHERE business_id = bid AND user_id = auth.uid() AND role = 'staff'
    );
$$;

GRANT EXECUTE ON FUNCTION public.user_owns_business(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_business_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_business(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_write_business(uuid) TO authenticated;

DROP POLICY IF EXISTS businesses_member_select ON businesses;
CREATE POLICY businesses_member_select ON businesses
  FOR SELECT USING (
    owner_id = auth.uid()
    OR public.user_is_business_member(id)
  );

DROP POLICY IF EXISTS business_members_owner_manage ON business_members;
CREATE POLICY business_members_owner_manage ON business_members
  FOR ALL
  USING (public.user_owns_business(business_id))
  WITH CHECK (public.user_owns_business(business_id));

DROP POLICY IF EXISTS business_members_self_read ON business_members;
CREATE POLICY business_members_self_read ON business_members
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS audit_logs_business_read ON audit_logs;
CREATE POLICY audit_logs_business_read ON audit_logs
  FOR SELECT USING (public.user_can_access_business(business_id));

DROP POLICY IF EXISTS audit_logs_business_insert ON audit_logs;
CREATE POLICY audit_logs_business_insert ON audit_logs
  FOR INSERT WITH CHECK (public.user_can_write_business(business_id));

DROP POLICY IF EXISTS business_api_keys_owner ON business_api_keys;
CREATE POLICY business_api_keys_owner ON business_api_keys
  FOR ALL
  USING (public.user_owns_business(business_id))
  WITH CHECK (public.user_owns_business(business_id));

DROP POLICY IF EXISTS business_webhooks_owner ON business_webhooks;
CREATE POLICY business_webhooks_owner ON business_webhooks
  FOR ALL
  USING (public.user_owns_business(business_id))
  WITH CHECK (public.user_owns_business(business_id));

DROP POLICY IF EXISTS customers_member_read ON customers;
CREATE POLICY customers_member_read ON customers
  FOR SELECT USING (public.user_is_business_member(business_id));

DROP POLICY IF EXISTS customers_member_write ON customers;
CREATE POLICY customers_member_write ON customers
  FOR ALL
  USING (public.user_can_write_business(business_id))
  WITH CHECK (public.user_can_write_business(business_id));