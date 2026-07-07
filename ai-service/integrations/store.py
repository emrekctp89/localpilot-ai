from datetime import datetime, timezone
from typing import Any, Optional


def get_integration(
    supabase_client: Any, business_id: str, provider: str
) -> Optional[dict[str, Any]]:
    try:
        response = (
            supabase_client.table("business_integrations")
            .select("*")
            .eq("business_id", business_id)
            .eq("provider", provider)
            .maybe_single()
            .execute()
        )
        return response.data
    except Exception:
        return None


def upsert_integration(
    supabase_client: Any,
    business_id: str,
    provider: str,
    status: str,
    config: dict[str, Any],
) -> bool:
    now = datetime.now(timezone.utc).isoformat()
    payload = {
        "business_id": business_id,
        "provider": provider,
        "status": status,
        "config": config,
        "updated_at": now,
    }
    if status == "connected":
        payload["connected_at"] = now

    try:
        supabase_client.table("business_integrations").upsert(
            payload,
            on_conflict="business_id,provider",
        ).execute()
        return True
    except Exception:
        return False