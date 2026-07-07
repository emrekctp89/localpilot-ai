-- LocalPilot AI: migration version tracking (Faz B/C)
-- Run after 007_fix_rls_recursion.sql

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE schema_migrations IS 'Manuel veya CI ile uygulanan SQL migration kayıtları';

INSERT INTO schema_migrations (version, name) VALUES
  ('001', '001_operational_tables.sql'),
  ('002', '002_core_rls.sql'),
  ('003', '003_campaigns_content.sql'),
  ('004', '004_crm_activities.sql'),
  ('005', '005_ai_usage.sql'),
  ('006', '006_platform.sql'),
  ('007', '007_fix_rls_recursion.sql'),
  ('008', '008_schema_migrations.sql')
ON CONFLICT (version) DO NOTHING;

ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS schema_migrations_service_read ON schema_migrations;
CREATE POLICY schema_migrations_service_read ON schema_migrations
  FOR SELECT USING (auth.role() = 'service_role');