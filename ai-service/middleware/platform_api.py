import hashlib
from datetime import datetime, timezone
from typing import Any, Optional


def hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def verify_business_api_key(
    supabase_client: Any, raw_key: str, business_id: str
) -> bool:
    if not raw_key or not business_id:
        return False

    key_hash = hash_api_key(raw_key)
    try:
        response = (
            supabase_client.table("business_api_keys")
            .select("id")
            .eq("business_id", business_id)
            .eq("key_hash", key_hash)
            .is_("revoked_at", "null")
            .maybe_single()
            .execute()
        )
        if not response.data:
            return False

        supabase_client.table("business_api_keys").update(
            {"last_used_at": datetime.now(timezone.utc).isoformat()}
        ).eq("id", response.data["id"]).execute()
        return True
    except Exception:
        return False


def fetch_business_summary(
    supabase_client: Any, business_id: str
) -> Optional[dict[str, Any]]:
    try:
        business = (
            supabase_client.table("businesses")
            .select(
                "id, name, sector, city, created_at, site_slug, custom_domain, custom_domain_status"
            )
            .eq("id", business_id)
            .maybe_single()
            .execute()
        )
        if not business.data:
            return None

        customers = (
            supabase_client.table("customers")
            .select("id", count="exact")
            .eq("business_id", business_id)
            .execute()
        )
        appointments = (
            supabase_client.table("appointments")
            .select("id", count="exact")
            .eq("business_id", business_id)
            .execute()
        )
        orders = (
            supabase_client.table("orders")
            .select("id", count="exact")
            .eq("business_id", business_id)
            .execute()
        )

        site_slug = business.data.get("site_slug")
        custom_domain = business.data.get("custom_domain")
        custom_domain_status = business.data.get("custom_domain_status")
        public_path = f"/site/{site_slug or business.data.get('id')}"
        if custom_domain_status == "active" and custom_domain:
            public_url = f"https://{custom_domain}"
        else:
            public_url = public_path

        return {
            "business": business.data,
            "public_site": {
                "path": public_path,
                "url_hint": public_url,
                "site_slug": site_slug,
                "custom_domain": custom_domain,
                "custom_domain_status": custom_domain_status,
            },
            "metrics": {
                "customers": customers.count or 0,
                "appointments": appointments.count or 0,
                "orders": orders.count or 0,
            },
        }
    except Exception:
        return None