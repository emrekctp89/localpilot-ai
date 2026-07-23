"""Owner channel notify for mini-site leads (Faz H.4 / 2.6.6).

Channels (all optional, soft-fail):
- WhatsApp Cloud API → business.whatsapp_number when theme_config.owner_notify.whatsapp_enabled
- Resend email → theme_config.owner_notify.email when email_enabled + RESEND_API_KEY
"""

from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from typing import Any, Optional

from integrations.whatsapp_cloud import (
    send_whatsapp_text_message,
    whatsapp_env_configured,
)


def resend_env_configured() -> bool:
    return bool(os.getenv("RESEND_API_KEY", "").strip())


def parse_owner_notify_config(theme_config: Any) -> dict[str, Any]:
    if not isinstance(theme_config, dict):
        return {
            "email_enabled": False,
            "email": "",
            "whatsapp_enabled": False,
        }
    raw = theme_config.get("owner_notify")
    if not isinstance(raw, dict):
        raw = {}
    email = str(raw.get("email") or "").strip()
    return {
        "email_enabled": bool(raw.get("email_enabled")) and bool(email),
        "email": email,
        "whatsapp_enabled": bool(raw.get("whatsapp_enabled")),
    }


def is_valid_notify_email(email: str) -> bool:
    value = (email or "").strip()
    if len(value) < 5 or len(value) > 254:
        return False
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", value))


def build_lead_owner_message(
    *,
    business_name: str,
    full_name: str,
    phone: str,
    notes: str = "",
) -> str:
    lines = [
        f"Yeni mini site lead — {business_name or 'İşletme'}",
        f"Ad: {full_name}",
        f"Tel: {phone or '-'}",
    ]
    if notes and notes.strip():
        lines.append(f"Not: {notes.strip()[:200]}")
    lines.append("Panel → CRM sekmesinden takip edin.")
    return "\n".join(lines)


def send_owner_email_via_resend(
    *,
    to_email: str,
    subject: str,
    text: str,
) -> dict[str, Any]:
    api_key = os.getenv("RESEND_API_KEY", "").strip()
    from_email = (
        os.getenv("RESEND_FROM_EMAIL", "").strip()
        or "LocalPilot <onboarding@resend.dev>"
    )
    if not api_key:
        raise ValueError("RESEND_API_KEY yapılandırılmamış.")
    if not is_valid_notify_email(to_email):
        raise ValueError("Geçersiz alıcı e-posta.")

    payload = {
        "from": from_email,
        "to": [to_email],
        "subject": subject[:200],
        "text": text[:8000],
    }
    request = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            data = json.loads(response.read().decode("utf-8"))
            return {
                "status": "sent",
                "id": data.get("id"),
                "to": to_email,
            }
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise ValueError(f"Resend hata: {detail[:300]}") from error


def fetch_business_for_notify(supabase: Any, business_id: str) -> Optional[dict[str, Any]]:
    if not business_id or not supabase:
        return None
    try:
        result = (
            supabase.table("businesses")
            .select("id, name, whatsapp_number, theme_config")
            .eq("id", business_id)
            .maybe_single()
            .execute()
        )
        row = result.data if result else None
        return row if isinstance(row, dict) else None
    except Exception as error:
        print(f"owner_notify fetch business: {error}")
        return None


def notify_owner_of_lead(
    supabase: Any,
    *,
    business_id: str,
    full_name: str,
    phone: str = "",
    notes: str = "",
) -> dict[str, Any]:
    business = fetch_business_for_notify(supabase, business_id)
    if not business:
        return {
            "status": "skipped",
            "reason": "business_not_found",
            "channels": {},
        }

    config = parse_owner_notify_config(business.get("theme_config"))
    if not config["email_enabled"] and not config["whatsapp_enabled"]:
        return {
            "status": "skipped",
            "reason": "channels_disabled",
            "channels": {},
        }

    message = build_lead_owner_message(
        business_name=str(business.get("name") or "İşletme"),
        full_name=full_name,
        phone=phone,
        notes=notes,
    )
    channels: dict[str, Any] = {}

    if config["whatsapp_enabled"]:
        if not whatsapp_env_configured():
            channels["whatsapp"] = {
                "status": "skipped",
                "reason": "whatsapp_cloud_not_configured",
            }
        else:
            owner_phone = str(business.get("whatsapp_number") or "").strip()
            if not owner_phone:
                channels["whatsapp"] = {
                    "status": "skipped",
                    "reason": "business_whatsapp_missing",
                }
            else:
                try:
                    channels["whatsapp"] = send_whatsapp_text_message(
                        owner_phone,
                        message,
                    )
                except Exception as error:
                    channels["whatsapp"] = {
                        "status": "error",
                        "reason": str(error)[:200],
                    }

    if config["email_enabled"]:
        if not resend_env_configured():
            channels["email"] = {
                "status": "skipped",
                "reason": "resend_not_configured",
            }
        else:
            try:
                channels["email"] = send_owner_email_via_resend(
                    to_email=config["email"],
                    subject=f"Yeni lead: {full_name}",
                    text=message,
                )
            except Exception as error:
                channels["email"] = {
                    "status": "error",
                    "reason": str(error)[:200],
                }

    sent_any = any(
        isinstance(result, dict) and result.get("status") == "sent"
        for result in channels.values()
    )
    return {
        "status": "sent" if sent_any else "skipped",
        "reason": None if sent_any else "no_channel_sent",
        "channels": channels,
    }
