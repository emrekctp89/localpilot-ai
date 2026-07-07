import json
import os
import secrets
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Optional

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_SCOPE = "https://www.googleapis.com/auth/business.manage"
BUSINESS_INFO_API = "https://mybusinessbusinessinformation.googleapis.com/v1"


def google_env_configured() -> bool:
    return bool(
        os.getenv("GOOGLE_OAUTH_CLIENT_ID", "").strip()
        and os.getenv("GOOGLE_OAUTH_CLIENT_SECRET", "").strip()
        and os.getenv("GOOGLE_OAUTH_REDIRECT_URI", "").strip()
    )


def build_google_status(integration: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    configured = google_env_configured()
    connected = bool(integration and integration.get("status") == "connected")
    config = (integration or {}).get("config") or {}

    if connected:
        label = "Google profili bağlı"
        detail = "Profil önerilerini OAuth ile uygulayabilirsiniz."
        status = "connected"
    elif configured:
        label = "Google OAuth hazır"
        detail = "Google İşletme Profilinizi bağlamak için Bağlan düğmesine tıklayın."
        status = "pending_oauth"
    else:
        label = "Google OAuth yapılandırması bekleniyor"
        detail = "GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET ve GOOGLE_OAUTH_REDIRECT_URI ekleyin."
        status = "pending_oauth"

    return {
        "provider": "google_business",
        "configured": configured,
        "status": status,
        "label": label,
        "detail": detail,
        "location_id": config.get("location_id"),
        "account_name": config.get("account_name"),
    }


def build_oauth_state(business_id: str, user_id: str) -> str:
    nonce = secrets.token_urlsafe(16)
    return f"{business_id}:{user_id}:{nonce}"


def parse_oauth_state(state: str) -> tuple[str, str]:
    parts = (state or "").split(":")
    if len(parts) < 3:
        raise ValueError("Geçersiz OAuth state.")
    return parts[0], parts[1]


def build_google_oauth_url(state: str) -> str:
    client_id = os.getenv("GOOGLE_OAUTH_CLIENT_ID", "").strip()
    redirect_uri = os.getenv("GOOGLE_OAUTH_REDIRECT_URI", "").strip()
    if not client_id or not redirect_uri:
        raise ValueError("Google OAuth yapılandırması eksik.")

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": GOOGLE_SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"


def exchange_code_for_tokens(code: str) -> dict[str, Any]:
    client_id = os.getenv("GOOGLE_OAUTH_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET", "").strip()
    redirect_uri = os.getenv("GOOGLE_OAUTH_REDIRECT_URI", "").strip()
    if not client_id or not client_secret or not redirect_uri:
        raise ValueError("Google OAuth yapılandırması eksik.")

    payload = urllib.parse.urlencode(
        {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }
    ).encode("utf-8")

    request = urllib.request.Request(
        GOOGLE_TOKEN_URL,
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise ValueError(f"Google token hatası: {detail}") from error


def refresh_access_token(refresh_token: str) -> dict[str, Any]:
    client_id = os.getenv("GOOGLE_OAUTH_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        raise ValueError("Google OAuth yapılandırması eksik.")

    payload = urllib.parse.urlencode(
        {
            "refresh_token": refresh_token,
            "client_id": client_id,
            "client_secret": client_secret,
            "grant_type": "refresh_token",
        }
    ).encode("utf-8")

    request = urllib.request.Request(
        GOOGLE_TOKEN_URL,
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def _authorized_request(
    method: str,
    url: str,
    access_token: str,
    payload: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    data = None
    headers = {"Authorization": f"Bearer {access_token}"}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=30) as response:
        raw = response.read().decode("utf-8")
        return json.loads(raw) if raw else {}


def discover_primary_location(access_token: str) -> dict[str, str]:
    accounts = _authorized_request(
        "GET",
        "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
        access_token,
    )
    account_items = accounts.get("accounts") or []
    if not account_items:
        raise ValueError("Bağlı Google hesabında işletme profili bulunamadı.")

    account_name = account_items[0]["name"]
    locations = _authorized_request(
        "GET",
        f"{BUSINESS_INFO_API}/{account_name}/locations?readMask=name,title",
        access_token,
    )
    location_items = locations.get("locations") or []
    if not location_items:
        raise ValueError("Google hesabında konum bulunamadı.")

    location = location_items[0]
    return {
        "account_name": account_name,
        "location_id": location["name"],
        "location_title": location.get("title", ""),
    }


def apply_profile_field_with_refresh(
    config: dict[str, Any],
    field: str,
    value: str,
) -> tuple[dict[str, Any], dict[str, Any]]:
    access_token = config.get("access_token", "")
    refresh_token = config.get("refresh_token", "")
    location_id = config.get("location_id", "")
    next_config = dict(config)

    try:
        result = apply_profile_field(access_token, location_id, field, value)
        return result, next_config
    except urllib.error.HTTPError:
        if not refresh_token:
            raise
        refreshed = refresh_access_token(refresh_token)
        access_token = refreshed.get("access_token", access_token)
        next_config["access_token"] = access_token
        result = apply_profile_field(access_token, location_id, field, value)
        return result, next_config


def apply_profile_field(
    access_token: str,
    location_id: str,
    field: str,
    value: str,
) -> dict[str, Any]:
    field = field.strip()
    value = value.strip()
    if not location_id:
        raise ValueError("Google konum kimliği eksik.")
    if not value:
        raise ValueError("Uygulanacak metin boş.")

    update_mask = ""
    body: dict[str, Any] = {}

    if field == "description-written":
        update_mask = "profile.description"
        body = {"profile": {"description": value}}
    elif field == "first-post-published":
        raise ValueError(
            "Google gönderi yayını henüz desteklenmiyor. Metni kopyalayıp manuel paylaşın."
        )
    else:
        raise ValueError(f"'{field}' alanı için otomatik yazma henüz desteklenmiyor.")

    url = (
        f"{BUSINESS_INFO_API}/{location_id}"
        f"?updateMask={urllib.parse.quote(update_mask)}"
    )
    result = _authorized_request("PATCH", url, access_token, body)
    return {
        "status": "applied",
        "field": field,
        "location_id": location_id,
        "google_response": result,
    }