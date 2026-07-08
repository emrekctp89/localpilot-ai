import os
from typing import Any, Dict, List, Tuple

VALID_INTERVALS = frozenset({"monthly", "yearly"})

PRO_PRODUCT_NAME = "LocalPilot AI - Pro Paket"
PRO_PRODUCT_DESCRIPTION = (
    "Sınırsız AI, kampanya motoru ve gelişmiş büyüme araçları."
)

# Fallback amounts in kuruş when Stripe Price IDs are not configured.
FALLBACK_AMOUNTS_KURUS = {
    "monthly": 29900,
    "yearly": 299000,
}


def normalize_billing_interval(raw: str) -> str:
    value = (raw or "monthly").strip().lower()
    if value not in VALID_INTERVALS:
        raise ValueError(f"Geçersiz billing_interval: {raw}")
    return value


def stripe_price_id_for_interval(interval: str) -> str:
    if interval == "yearly":
        return (os.getenv("STRIPE_PRICE_ID_YEARLY") or "").strip()
    return (os.getenv("STRIPE_PRICE_ID_MONTHLY") or "").strip()


def build_checkout_params(interval: str) -> Tuple[List[Dict[str, Any]], str]:
    """Return Stripe Checkout line_items and mode."""
    normalized = normalize_billing_interval(interval)
    price_id = stripe_price_id_for_interval(normalized)

    if price_id:
        return [{"price": price_id, "quantity": 1}], "subscription"

    recurring_interval = "year" if normalized == "yearly" else "month"
    amount = FALLBACK_AMOUNTS_KURUS[normalized]

    return (
        [
            {
                "price_data": {
                    "currency": "try",
                    "product_data": {
                        "name": PRO_PRODUCT_NAME,
                        "description": PRO_PRODUCT_DESCRIPTION,
                    },
                    "unit_amount": amount,
                    "recurring": {"interval": recurring_interval},
                },
                "quantity": 1,
            }
        ],
        "subscription",
    )