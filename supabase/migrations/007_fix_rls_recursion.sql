-- Fix infinite recursion between businesses <-> business_members RLS policies
-- Run in Supabase SQL Editor after 006_platform.sql

CREATE OR REPLACE FUNCTION public.user_owns_business(bid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM businesses
    WHERE id = bid
      AND owner_id = auth.uid()
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
    SELECT 1
    FROM business_members
    WHERE business_id = bid
      AND user_id = auth.uid()
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
      SELECT 1
      FROM business_members
      WHERE business_id = bid
        AND user_id = auth.uid()
        AND role = 'staff'
    );
$$;

GRANT EXECUTE ON FUNCTION public.user_owns_business(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_business_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_business(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_write_business(uuid) TO authenticated;

-- businesses: member read without cross-table policy recursion
DROP POLICY IF EXISTS businesses_member_select ON businesses;
CREATE POLICY businesses_member_select ON businesses
  FOR SELECT USING (
    owner_id = auth.uid()
    OR public.user_is_business_member(id)
  );

-- business_members: owner manage without querying businesses under RLS
DROP POLICY IF EXISTS business_members_owner_manage ON business_members;
CREATE POLICY business_members_owner_manage ON business_members
  FOR ALL
  USING (public.user_owns_business(business_id))
  WITH CHECK (public.user_owns_business(business_id));

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