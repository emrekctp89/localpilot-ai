from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, Optional, Tuple

DEFAULT_PRO_GROSS_TRY = Decimal("299")
YEARLY_PRO_GROSS_TRY = Decimal("2990")


def commission_amount(gross_try: Decimal, rate_bps: int) -> Decimal:
    raw = gross_try * Decimal(rate_bps) / Decimal(10000)
    return raw.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def resolve_pro_gross_amount(billing_interval: Optional[str] = None) -> Decimal:
    if (billing_interval or "").strip().lower() == "yearly":
        return YEARLY_PRO_GROSS_TRY
    return DEFAULT_PRO_GROSS_TRY


def record_pro_activation_commission(
    supabase_client: Any,
    referred_user_id: str,
    billing_interval: Optional[str] = None,
) -> Tuple[bool, Optional[str]]:
    if not referred_user_id:
        return False, "commission: referred_user_id eksik"

    try:
        attribution_resp = (
            supabase_client.table("referral_attributions")
            .select("id, partner_user_id, status")
            .eq("referred_user_id", referred_user_id)
            .maybe_single()
            .execute()
        )
        attribution = attribution_resp.data
        if not attribution:
            return True, None

        if attribution.get("status") == "converted":
            return True, None

        partner_user_id = attribution.get("partner_user_id")
        if not partner_user_id:
            return False, "commission: partner_user_id eksik"

        partner_resp = (
            supabase_client.table("partner_profiles")
            .select("commission_rate_bps, status")
            .eq("user_id", partner_user_id)
            .maybe_single()
            .execute()
        )
        partner = partner_resp.data
        if not partner or partner.get("status") != "active":
            return True, None

        rate_bps = int(partner.get("commission_rate_bps") or 0)
        if rate_bps <= 0:
            return False, "commission: geçersiz komisyon oranı"

        gross_try = resolve_pro_gross_amount(billing_interval)
        payout = commission_amount(gross_try, rate_bps)

        ledger_resp = (
            supabase_client.table("commission_ledger")
            .insert(
                {
                    "partner_user_id": partner_user_id,
                    "attribution_id": attribution.get("id"),
                    "event_type": "pro_activation",
                    "gross_amount_try": float(gross_try),
                    "commission_rate_bps": rate_bps,
                    "commission_amount_try": float(payout),
                    "status": "pending",
                    "metadata": {
                        "referred_user_id": referred_user_id,
                        "billing_interval": billing_interval or "monthly",
                    },
                }
            )
            .execute()
        )
        if not ledger_resp.data:
            return False, "commission: defter kaydı oluşturulamadı"

        supabase_client.table("referral_attributions").update(
            {
                "status": "converted",
                "converted_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", attribution.get("id")).execute()

        return True, None
    except Exception as error:
        print(
            f"partner_commission_failed user={referred_user_id} error={error}"
        )
        return False, f"commission: {error}"