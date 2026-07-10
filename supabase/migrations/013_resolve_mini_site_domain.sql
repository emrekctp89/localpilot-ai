-- LocalPilot AI: public resolve of active custom domain → business id (Faz G.3 middleware)

CREATE OR REPLACE FUNCTION public.resolve_mini_site_by_domain(p_domain text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id
  FROM businesses b
  WHERE b.custom_domain IS NOT NULL
    AND btrim(b.custom_domain) <> ''
    AND lower(b.custom_domain) = lower(btrim(p_domain))
    AND b.custom_domain_status = 'active'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_mini_site_by_domain(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_mini_site_by_domain(text) TO anon, authenticated;

COMMENT ON FUNCTION public.resolve_mini_site_by_domain(text) IS
  'Returns business id for an active custom mini-site domain (middleware / edge).';
