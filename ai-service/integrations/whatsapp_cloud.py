import json
import os
import re
import urllib.error
import urllib.request
from typing import Any, Optional


GRAPH_API_VERSION = os.getenv("WHATSAPP_GRAPH_API_VERSION", "v21.0")


def normalize_recipient_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone or "")
    if digits.startswith("0"):
        digits = f"90{digits[1:]}"
    if len(digits) == 10 and digits.startswith("5"):
        digits = f"90{digits}"
    return digits


def whatsapp_env_configured() -> bool:
    return bool(
        os.getenv("WHATSAPP_ACCESS_TOKEN", "").strip()
        and os.getenv("WHATSAPP_PHONE_NUMBER_ID", "").strip()
    )


def build_whatsapp_status() -> dict[str, Any]:
    configured = whatsapp_env_configured()
    return {
        "provider": "whatsapp_business",
        "configured": configured,
        "status": "connected" if configured else "pending_oauth",
        "label": "Cloud API aktif" if configured else "Cloud API yapılandırması bekleniyor",
        "detail": (
            "Meta Cloud API ile müşterilere doğrudan mesaj gönderebilirsiniz."
            if configured
            else "Render/Vercel ortamına WHATSAPP_ACCESS_TOKEN ve WHATSAPP_PHONE_NUMBER_ID ekleyin."
        ),
        "phone_number_id": os.getenv("WHATSAPP_PHONE_NUMBER_ID", "").strip() or None,
    }


def send_whatsapp_text_message(
    recipient_phone: str,
    message: str,
    *,
    access_token: Optional[str] = None,
    phone_number_id: Optional[str] = None,
) -> dict[str, Any]:
    token = (access_token or os.getenv("WHATSAPP_ACCESS_TOKEN", "")).strip()
    sender_id = (phone_number_id or os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")).strip()
    to = normalize_recipient_phone(recipient_phone)
    body = (message or "").strip()

    if not token or not sender_id:
        raise ValueError("WhatsApp Cloud API yapılandırması eksik.")
    if not to:
        raise ValueError("Alıcı telefon numarası gerekli.")
    if not body:
        raise ValueError("Mesaj metni boş olamaz.")
    if len(body) > 4096:
        raise ValueError("Mesaj en fazla 4096 karakter olabilir.")

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to,
        "type": "text",
        "text": {"preview_url": False, "body": body},
    }

    url = f"https://graph.facebook.com/{GRAPH_API_VERSION}/{sender_id}/messages"
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            data = json.loads(response.read().decode("utf-8"))
            message_id = None
            messages = data.get("messages")
            if isinstance(messages, list) and messages:
                message_id = messages[0].get("id")
            return {
                "status": "sent",
                "message_id": message_id,
                "recipient": to,
            }
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(detail)
            message = parsed.get("error", {}).get("message", detail)
        except json.JSONDecodeError:
            message = detail
        raise ValueError(f"WhatsApp API hatası: {message}") from error