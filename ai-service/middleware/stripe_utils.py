from typing import Any, Optional


def read_stripe_field(obj: Any, key: str, default: Any = None) -> Any:
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    value = getattr(obj, key, None)
    if value is not None:
        return value
    try:
        return obj[key]
    except (KeyError, TypeError, AttributeError):
        return default


def checkout_session_user_id(session: Any) -> Optional[str]:
    metadata = read_stripe_field(session, "metadata") or {}
    user_id = read_stripe_field(metadata, "user_id")
    return str(user_id) if user_id else None


def checkout_session_is_paid(session: Any) -> bool:
    payment_status = read_stripe_field(session, "payment_status")
    status = read_stripe_field(session, "status")
    return payment_status == "paid" or status == "complete"