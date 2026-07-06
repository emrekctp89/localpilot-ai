import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

AI_LIMITED_PATHS = {
    "/analyze-reviews",
    "/generate-campaigns",
    "/forecast-finance",
    "/analyze-churn",
    "/integration/google-profile-suggestions",
}


def free_ai_daily_limit() -> int:
    raw = os.getenv("FREE_AI_DAILY_LIMIT", "3").strip()
    try:
        return max(0, int(raw))
    except ValueError:
        return 3


def free_ai_monthly_limit() -> int:
    raw = os.getenv("FREE_AI_MONTHLY_LIMIT", "15").strip()
    try:
        return max(0, int(raw))
    except ValueError:
        return 15


def usage_guard_enabled() -> bool:
    return os.getenv("ENVIRONMENT", "development").lower() == "production"


def period_keys(now: Optional[datetime] = None) -> Tuple[str, str]:
    current = now or datetime.now(timezone.utc)
    daily_key = current.strftime("%Y-%m-%d")
    monthly_key = current.strftime("%Y-%m")
    return daily_key, monthly_key


def _read_counter(
    supabase_client: Any, user_id: str, period_type: str, period_key: str
) -> int:
    try:
        response = (
            supabase_client.table("ai_usage_counters")
            .select("usage_count")
            .eq("user_id", user_id)
            .eq("period_type", period_type)
            .eq("period_key", period_key)
            .maybe_single()
            .execute()
        )
        if response.data:
            return int(response.data.get("usage_count") or 0)
    except Exception:
        pass
    return 0


def get_usage_snapshot(supabase_client: Any, user_id: str) -> Dict[str, Any]:
    daily_key, monthly_key = period_keys()
    daily_limit = free_ai_daily_limit()
    monthly_limit = free_ai_monthly_limit()
    daily_used = _read_counter(supabase_client, user_id, "daily", daily_key)
    monthly_used = _read_counter(supabase_client, user_id, "monthly", monthly_key)

    daily_remaining = max(0, daily_limit - daily_used)
    monthly_remaining = max(0, monthly_limit - monthly_used)
    can_use = daily_remaining > 0 and monthly_remaining > 0

    return {
        "is_pro": False,
        "daily": {
            "used": daily_used,
            "limit": daily_limit,
            "remaining": daily_remaining,
            "period_key": daily_key,
        },
        "monthly": {
            "used": monthly_used,
            "limit": monthly_limit,
            "remaining": monthly_remaining,
            "period_key": monthly_key,
        },
        "can_use_ai": can_use,
    }


def _increment_counter(
    supabase_client: Any, user_id: str, period_type: str, period_key: str
) -> None:
    current = _read_counter(supabase_client, user_id, period_type, period_key)
    payload = {
        "user_id": user_id,
        "period_type": period_type,
        "period_key": period_key,
        "usage_count": current + 1,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    supabase_client.table("ai_usage_counters").upsert(
        payload,
        on_conflict="user_id,period_type,period_key",
    ).execute()


def consume_ai_usage(supabase_client: Any, user_id: str) -> Dict[str, Any]:
    daily_key, monthly_key = period_keys()
    _increment_counter(supabase_client, user_id, "daily", daily_key)
    _increment_counter(supabase_client, user_id, "monthly", monthly_key)
    return get_usage_snapshot(supabase_client, user_id)


def build_pro_usage_snapshot() -> Dict[str, Any]:
    return {
        "is_pro": True,
        "daily": {"used": 0, "limit": None, "remaining": None, "period_key": None},
        "monthly": {
            "used": 0,
            "limit": None,
            "remaining": None,
            "period_key": None,
        },
        "can_use_ai": True,
    }


def evaluate_ai_access(
    supabase_client: Any, user_id: str, is_pro: bool
) -> Tuple[bool, Dict[str, Any], Optional[str]]:
    if is_pro:
        return True, build_pro_usage_snapshot(), None

    snapshot = get_usage_snapshot(supabase_client, user_id)
    if snapshot["can_use_ai"]:
        return True, snapshot, None

    daily = snapshot["daily"]
    monthly = snapshot["monthly"]
    if daily["remaining"] <= 0:
        detail = (
            f"Günlük AI limitinize ulaştınız ({daily['used']}/{daily['limit']}). "
            "Pro plan ile sınırsız AI kullanın."
        )
    else:
        detail = (
            f"Aylık AI limitinize ulaştınız ({monthly['used']}/{monthly['limit']}). "
            "Pro plan ile sınırsız AI kullanın."
        )
    return False, snapshot, detail