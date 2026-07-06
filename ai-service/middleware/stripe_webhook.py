from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple


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
            .single()
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
            .single()
            .execute()
        )
        if response.data and response.data.get("is_pro"):
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
    user_id = (session.get("metadata") or {}).get("user_id")
    ok, error = activate_pro_membership(supabase_client, user_id)

    if ok:
        return {"status": "success", "event": event_type}, 200

    return {"status": "error", "detail": error or "Bilinmeyen hata"}, 500