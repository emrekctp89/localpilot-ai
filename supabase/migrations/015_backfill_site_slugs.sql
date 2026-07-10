-- LocalPilot AI: backfill site_slug for existing businesses + migration registry
-- Safe to re-run. Requires 012 (site_slug column).

CREATE OR REPLACE FUNCTION public.lp_normalize_site_slug(p_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  t text;
BEGIN
  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RETURN NULL;
  END IF;

  t := lower(btrim(p_name));
  t := replace(t, 'ğ', 'g');
  t := replace(t, 'ü', 'u');
  t := replace(t, 'ş', 's');
  t := replace(t, 'ı', 'i');
  t := replace(t, 'ö', 'o');
  t := replace(t, 'ç', 'c');
  t := replace(t, 'â', 'a');
  t := replace(t, 'î', 'i');
  t := replace(t, 'û', 'u');
  t := regexp_replace(t, '[^a-z0-9]+', '-', 'g');
  t := regexp_replace(t, '-+', '-', 'g');
  t := trim(both '-' from t);
  t := left(t, 48);
  t := regexp_replace(t, '-+$', '');

  IF t IS NULL OR length(t) < 2 THEN
    RETURN NULL;
  END IF;

  -- Reject UUID-shaped values
  IF t ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN NULL;
  END IF;

  RETURN t;
END;
$$;

CREATE OR REPLACE FUNCTION public.lp_backfill_business_site_slugs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  base text;
  candidate text;
  n integer := 0;
  i integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'businesses'
      AND column_name = 'site_slug'
  ) THEN
    RETURN 0;
  END IF;

  FOR r IN
    SELECT id, name
    FROM businesses
    WHERE site_slug IS NULL OR btrim(site_slug) = ''
    ORDER BY created_at NULLS LAST, id
  LOOP
    base := public.lp_normalize_site_slug(r.name);
    IF base IS NULL THEN
      base := 'isletme-' || substr(replace(r.id::text, '-', ''), 1, 8);
    END IF;

    candidate := base;
    i := 1;
    WHILE EXISTS (
      SELECT 1 FROM businesses b
      WHERE lower(b.site_slug) = lower(candidate)
        AND b.id <> r.id
    ) LOOP
      i := i + 1;
      candidate := left(base, greatest(2, 48 - length('-' || i::text))) || '-' || i::text;
      IF i > 50 THEN
        candidate := 'isletme-' || substr(replace(r.id::text, '-', ''), 1, 12);
        EXIT;
      END IF;
    END LOOP;

    UPDATE businesses
    SET site_slug = candidate
    WHERE id = r.id
      AND (site_slug IS NULL OR btrim(site_slug) = '');

    IF FOUND THEN
      n := n + 1;
    END IF;
  END LOOP;

  RETURN n;
END;
$$;

-- Run once for existing rows
SELECT public.lp_backfill_business_site_slugs();

COMMENT ON FUNCTION public.lp_normalize_site_slug(text) IS
  'Normalize business name to public mini-site slug (TR-aware).';
COMMENT ON FUNCTION public.lp_backfill_business_site_slugs() IS
  'Assign unique site_slug to businesses missing one. Safe to re-run.';

-- Registry for applied migrations (012–015)
INSERT INTO schema_migrations (version, name) VALUES
  ('012', '012_mini_site_domains.sql'),
  ('013', '013_resolve_mini_site_domain.sql'),
  ('014', '014_manual_pro_commission.sql'),
  ('015', '015_backfill_site_slugs.sql')
ON CONFLICT (version) DO NOTHING;
