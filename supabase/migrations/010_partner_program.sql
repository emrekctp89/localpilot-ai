-- LocalPilot AI: referral & agency commission program (Faz F)
-- Run in Supabase SQL Editor after 009_business_integrations.sql

CREATE TABLE IF NOT EXISTS partner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  partner_type TEXT NOT NULL CHECK (partner_type IN ('referral', 'agency')),
  referral_code TEXT NOT NULL UNIQUE,
  commission_rate_bps INTEGER NOT NULL
    CHECK (commission_rate_bps BETWEEN 500 AND 5000),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referral_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'converted', 'expired')),
  attributed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  converted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS commission_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attribution_id UUID REFERENCES referral_attributions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('pro_activation', 'subscription_payment')),
  gross_amount_try NUMERIC(12, 2) NOT NULL,
  commission_rate_bps INTEGER NOT NULL,
  commission_amount_try NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_profiles_code
  ON partner_profiles(referral_code)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_referral_attributions_partner
  ON referral_attributions(partner_user_id, attributed_at DESC);
CREATE INDEX IF NOT EXISTS idx_commission_ledger_partner
  ON commission_ledger(partner_user_id, created_at DESC);

ALTER TABLE partner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partner_profiles_self_read ON partner_profiles;
CREATE POLICY partner_profiles_self_read ON partner_profiles
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS partner_profiles_self_insert ON partner_profiles;
CREATE POLICY partner_profiles_self_insert ON partner_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS referral_attributions_partner_read ON referral_attributions;
CREATE POLICY referral_attributions_partner_read ON referral_attributions
  FOR SELECT USING (
    partner_user_id = auth.uid() OR referred_user_id = auth.uid()
  );

DROP POLICY IF EXISTS commission_ledger_partner_read ON commission_ledger;
CREATE POLICY commission_ledger_partner_read ON commission_ledger
  FOR SELECT USING (partner_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.attribute_referral(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_partner partner_profiles%ROWTYPE;
  v_normalized_code TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'detail', 'Oturum gerekli.');
  END IF;

  v_normalized_code := upper(trim(p_code));
  IF v_normalized_code = '' THEN
    RETURN jsonb_build_object('status', 'error', 'detail', 'Referans kodu boş.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM referral_attributions WHERE referred_user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('status', 'ignored', 'detail', 'Zaten atanmış.');
  END IF;

  SELECT * INTO v_partner
  FROM partner_profiles
  WHERE referral_code = v_normalized_code AND status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'error', 'detail', 'Geçersiz referans kodu.');
  END IF;

  IF v_partner.user_id = v_user_id THEN
    RETURN jsonb_build_object('status', 'error', 'detail', 'Kendi kodunuz kullanılamaz.');
  END IF;

  INSERT INTO referral_attributions (
    partner_user_id,
    referred_user_id,
    referral_code
  ) VALUES (
    v_partner.user_id,
    v_user_id,
    v_normalized_code
  );

  RETURN jsonb_build_object(
    'status', 'success',
    'partner_type', v_partner.partner_type,
    'referral_code', v_normalized_code
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.attribute_referral(TEXT) TO authenticated;

INSERT INTO schema_migrations (version, name) VALUES
  ('010', '010_partner_program.sql')
ON CONFLICT (version) DO NOTHING;