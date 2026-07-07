from typing import Any, Optional


ALLOWED_FEATURES = {
    "content",
    "campaign",
    "review_analysis",
    "google_suggestion",
    "decision",
}


def save_ai_feedback(
    supabase_client: Any,
    *,
    business_id: str,
    user_id: str,
    feature: str,
    rating: int,
    context: Optional[dict[str, Any]] = None,
) -> bool:
    if feature not in ALLOWED_FEATURES:
        raise ValueError("Geçersiz geri bildirim özelliği.")
    if rating not in (-1, 1):
        raise ValueError("Geri bildirim -1 veya 1 olmalı.")

    try:
        supabase_client.table("ai_quality_feedback").insert(
            {
                "business_id": business_id,
                "user_id": user_id,
                "feature": feature,
                "rating": rating,
                "context": context or {},
            }
        ).execute()
        return True
    except Exception:
        return False