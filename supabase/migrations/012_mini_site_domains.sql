-- LocalPilot AI: mini site slug + custom domain columns (Faz G white-label)
-- G.1 uses site_slug; custom_domain* reserved for G.2+

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS site_slug TEXT,
  ADD COLUMN IF NOT EXISTS custom_domain TEXT,
  ADD COLUMN IF NOT EXISTS custom_domain_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS custom_domain_error TEXT;

ALTER TABLE businesses
  DROP CONSTRAINT IF EXISTS businesses_custom_domain_status_check;

ALTER TABLE businesses
  ADD CONSTRAINT businesses_custom_domain_status_check
  CHECK (
    custom_domain_status IN ('none', 'pending_dns', 'active', 'error')
  );

CREATE UNIQUE INDEX IF NOT EXISTS businesses_site_slug_lower_uidx
  ON businesses (lower(site_slug))
  WHERE site_slug IS NOT NULL AND btrim(site_slug) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS businesses_custom_domain_lower_uidx
  ON businesses (lower(custom_domain))
  WHERE custom_domain IS NOT NULL AND btrim(custom_domain) <> '';

COMMENT ON COLUMN businesses.site_slug IS
  'Public mini site path key: /site/{site_slug} (unique, lowercased lookup).';
COMMENT ON COLUMN businesses.custom_domain IS
  'Optional custom hostname for white-label mini site (Faz G.2+).';
COMMENT ON COLUMN businesses.custom_domain_status IS
  'none | pending_dns | active | error';
