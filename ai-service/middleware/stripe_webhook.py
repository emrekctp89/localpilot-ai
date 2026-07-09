from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

from middleware.partner_commission import record_pro_activation_commission


def activate_pro_membership(
    supabase_client: Any, user_id: str
) -> Tuple[bool, Optional[str]]:
    if not user_id:
        return False, "checkout.session.completed: metadata.user_id eksik"

    try:
        response = (
            supabase_client.table("profiles")
            .select("is_pro")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        if response.data and response.data.get("is_pro"):
            return True, None
    except Exception as error:
        print(f"pro_activation_profile_read_failed user={user_id} error={error}")
        return False, f"Profil okunamadı: {error}"

    try:
        response = (
            supabase_client.table("profiles")
            .update(
                {
                    "is_pro": True,
                    "pro_activated_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            .eq("id", user_id)
            .select("id,is_pro")
            .execute()
        )
        rows = response.data or []
        if rows and rows[0].get("is_pro"):
            return True, None

        verify = (
            supabase_client.table("profiles")
            .select("is_pro")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        if verify.data and verify.data.get("is_pro"):
            return True, None

        print(f"pro_activation_profile_update_unverified user={user_id}")
        return False, "Profil güncellenemedi: is_pro doğrulanamadı."
    except Exception as error:
        print(f"pro_activation_profile_update_failed user={user_id} error={error}")
        return False, f"Profil güncellenemedi: {error}"


def handle_stripe_event(
    event: Dict[str, Any], supabase_client: Any
) -> Tuple[Dict[str, str], int]:
    event_type = event.get("type", "")

    if event_type != "checkout.session.completed":
        return {"status": "ignored", "event": event_type}, 200

    session = event.get("data", {}).get("object", {})
    metadata = session.get("metadata") or {}
    user_id = metadata.get("user_id")
    billing_interval = metadata.get("billing_interval")
    ok, error = activate_pro_membership(supabase_client, user_id)

    if ok:
        commission_ok, commission_error = record_pro_activation_commission(
            supabase_client,
            user_id,
            billing_interval,
        )
        if not commission_ok:
            print(
                f"partner_commission_skipped user={user_id} detail={commission_error}"
            )
        return {"status": "success", "event": event_type}, 200

    return {"status": "error", "detail": error or "Bilinmeyen hata"}, 500