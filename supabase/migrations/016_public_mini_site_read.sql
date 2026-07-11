-- LocalPilot AI: public mini-site read without leaking private rows via open SELECT policies
-- Root cause: RLS only allows owner/member SELECT on businesses → anonymous /site/* returns 404.

CREATE OR REPLACE FUNCTION public.business_exists(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM businesses WHERE id = p_business_id
  );
$$;

REVOKE ALL ON FUNCTION public.business_exists(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.business_exists(uuid) TO anon, authenticated;

-- Lead form INSERT check must not depend on readable businesses under RLS
DROP POLICY IF EXISTS customers_public_insert ON customers;
CREATE POLICY customers_public_insert ON customers
  FOR INSERT
  WITH CHECK (public.business_exists(business_id));

/**
 * Resolve public mini site payload by business UUID or site_slug.
 * Returns null when not found.
 * Shape: { business, siteData, products }
 */
CREATE OR REPLACE FUNCTION public.resolve_public_mini_site(p_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text := btrim(coalesce(p_key, ''));
  v_business_id uuid;
  v_business jsonb;
  v_site_data jsonb := '{}'::jsonb;
  v_products jsonb := '[]'::jsonb;
  v_is_uuid boolean;
BEGIN
  IF v_key = '' THEN
    RETURN NULL;
  END IF;

  v_is_uuid := v_key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  IF v_is_uuid THEN
    SELECT b.id, to_jsonb(b) - 'owner_id'
    INTO v_business_id, v_business
    FROM businesses b
    WHERE b.id = v_key::uuid
    LIMIT 1;
  ELSE
    SELECT b.id, to_jsonb(b) - 'owner_id'
    INTO v_business_id, v_business
    FROM businesses b
    WHERE b.site_slug IS NOT NULL
      AND lower(b.site_slug) = lower(v_key)
    LIMIT 1;
  END IF;

  IF v_business_id IS NULL OR v_business IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    SELECT coalesce(gp.mini_site_data, '{}'::jsonb)
    INTO v_site_data
    FROM generated_plans gp
    WHERE gp.business_id = v_business_id
    LIMIT 1;
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    v_site_data := '{}'::jsonb;
  END;

  IF v_site_data IS NULL THEN
    v_site_data := '{}'::jsonb;
  END IF;

  BEGIN
    SELECT coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb)
    INTO v_products
    FROM products p
    WHERE p.business_id = v_business_id;
  EXCEPTION WHEN undefined_table THEN
    v_products := '[]'::jsonb;
  END;

  RETURN jsonb_build_object(
    'business', v_business,
    'siteData', coalesce(v_site_data, '{}'::jsonb),
    'products', coalesce(v_products, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_public_mini_site(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_public_mini_site(text) TO anon, authenticated;

COMMENT ON FUNCTION public.resolve_public_mini_site(text) IS
  'Public mini-site payload by UUID or site_slug (SECURITY DEFINER; bypasses owner-only RLS).';
COMMENT ON FUNCTION public.business_exists(uuid) IS
  'True if business id exists; used by public lead insert policy.';

INSERT INTO schema_migrations (version, name) VALUES
  ('016', '016_public_mini_site_read.sql')
ON CONFLICT (version) DO NOTHING;
