-- LocalPilot AI: commission admin can record commission after manual is_pro
-- Mirrors ai-service middleware/partner_commission.py for SQL-activated Pro users.

CREATE OR REPLACE FUNCTION public.record_manual_pro_commission(
  p_referred_user_id UUID,
  p_billing_interval TEXT DEFAULT 'monthly'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_attr referral_attributions%ROWTYPE;
  v_partner partner_profiles%ROWTYPE;
  v_gross NUMERIC(12, 2);
  v_payout NUMERIC(12, 2);
  v_interval TEXT;
  v_ledger_id UUID;
BEGIN
  IF v_admin IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'detail', 'Oturum gerekli.');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = v_admin AND commission_admin = true
  ) THEN
    RETURN jsonb_build_object('status', 'error', 'detail', 'Komisyon admin yetkisi gerekli.');
  END IF;

  IF p_referred_user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'detail', 'referred_user_id gerekli.');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_referred_user_id AND is_pro = true
  ) THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'detail', 'Kullanıcı Pro değil. Önce profiles.is_pro = true yapın.'
    );
  END IF;

  SELECT * INTO v_attr
  FROM referral_attributions
  WHERE referred_user_id = p_referred_user_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'ignored',
      'detail', 'Bu kullanıcı için referans attribution yok.'
    );
  END IF;

  IF v_attr.status = 'converted' THEN
    RETURN jsonb_build_object(
      'status', 'ignored',
      'detail', 'Attribution zaten converted; komisyon daha önce yazılmış olabilir.'
    );
  END IF;

  SELECT * INTO v_partner
  FROM partner_profiles
  WHERE user_id = v_attr.partner_user_id AND status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'ignored',
      'detail', 'Partner aktif değil veya bulunamadı.'
    );
  END IF;

  IF v_partner.commission_rate_bps IS NULL OR v_partner.commission_rate_bps <= 0 THEN
    RETURN jsonb_build_object('status', 'error', 'detail', 'Geçersiz komisyon oranı.');
  END IF;

  v_interval := lower(trim(coalesce(p_billing_interval, 'monthly')));
  IF v_interval = 'yearly' THEN
    v_gross := 2990;
  ELSE
    v_gross := 299;
    v_interval := 'monthly';
  END IF;

  v_payout := round(v_gross * v_partner.commission_rate_bps / 10000.0, 2);

  INSERT INTO commission_ledger (
    partner_user_id,
    attribution_id,
    event_type,
    gross_amount_try,
    commission_rate_bps,
    commission_amount_try,
    status,
    metadata
  ) VALUES (
    v_attr.partner_user_id,
    v_attr.id,
    'pro_activation',
    v_gross,
    v_partner.commission_rate_bps,
    v_payout,
    'pending',
    jsonb_build_object(
      'referred_user_id', p_referred_user_id,
      'billing_interval', v_interval,
      'source', 'manual_is_pro',
      'triggered_by', v_admin
    )
  )
  RETURNING id INTO v_ledger_id;

  UPDATE referral_attributions
  SET status = 'converted',
      converted_at = NOW()
  WHERE id = v_attr.id;

  RETURN jsonb_build_object(
    'status', 'success',
    'detail', 'Komisyon deftere eklendi (pending).',
    'ledger_id', v_ledger_id,
    'commission_amount_try', v_payout,
    'gross_amount_try', v_gross
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_manual_pro_commission(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_manual_pro_commission(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.record_manual_pro_commission(UUID, TEXT) IS
  'Commission admin: after manual profiles.is_pro=true, create pending partner commission if referral attribution exists.';

INSERT INTO schema_migrations (version, name) VALUES
  ('014', '014_manual_pro_commission.sql')
ON CONFLICT (version) DO NOTHING;
