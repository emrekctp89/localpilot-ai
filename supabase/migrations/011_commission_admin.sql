-- LocalPilot AI: commission admin approvals from panel (Faz F)
-- Run after 010_partner_program.sql

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS commission_admin BOOLEAN NOT NULL DEFAULT false;

DROP POLICY IF EXISTS partner_profiles_admin_read ON partner_profiles;
CREATE POLICY partner_profiles_admin_read ON partner_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND commission_admin = true
    )
  );

DROP POLICY IF EXISTS commission_ledger_admin_read ON commission_ledger;
CREATE POLICY commission_ledger_admin_read ON commission_ledger
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND commission_admin = true
    )
  );

DROP POLICY IF EXISTS commission_ledger_admin_update ON commission_ledger;
CREATE POLICY commission_ledger_admin_update ON commission_ledger
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND commission_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND commission_admin = true
    )
  );

INSERT INTO schema_migrations (version, name) VALUES
  ('011', '011_commission_admin.sql')
ON CONFLICT (version) DO NOTHING;