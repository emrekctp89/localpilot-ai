"""Mini site public path slug helpers (matches frontend mini-site-domain.ts)."""

from __future__ import annotations

import re
import unicodedata
from typing import Any, Optional

_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.I,
)
_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def normalize_site_slug(raw: str) -> str:
    text = (raw or "").strip()
    # Turkish-specific replacements (single chars only for str.translate)
    for src, dst in (
        ("ğ", "g"),
        ("ü", "u"),
        ("ş", "s"),
        ("ı", "i"),
        ("ö", "o"),
        ("ç", "c"),
        ("Ğ", "g"),
        ("Ü", "u"),
        ("Ş", "s"),
        ("İ", "i"),
        ("I", "i"),
        ("Ö", "o"),
        ("Ç", "c"),
    ):
        text = text.replace(src, dst)
    text = text.casefold()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    text = text[:48].rstrip("-")
    return text


def is_valid_site_slug(slug: str) -> bool:
    if not slug or len(slug) < 2 or len(slug) > 48:
        return False
    if _UUID_RE.match(slug):
        return False
    return bool(_SLUG_RE.match(slug))


def suggest_site_slug_from_name(name: Optional[str]) -> str:
    slug = normalize_site_slug(name or "")
    return slug if is_valid_site_slug(slug) else ""


def allocate_unique_site_slug(
    supabase_client: Any,
    name: Optional[str],
    business_id_hint: Optional[str] = None,
) -> Optional[str]:
    """
    Return a unique site_slug for a new business, or None if none can be built.
    """
    base = suggest_site_slug_from_name(name)
    if not base:
        if business_id_hint:
            # last resort: short id fragment (not a full UUID)
            fragment = re.sub(r"[^a-z0-9]", "", (business_id_hint or "").lower())[:8]
            base = f"isletme-{fragment}" if fragment else ""
        if not is_valid_site_slug(base):
            return None

    candidates = [base]
    for i in range(2, 12):
        suffix = f"-{i}"
        trimmed = base[: max(2, 48 - len(suffix))].rstrip("-")
        candidates.append(f"{trimmed}{suffix}")

    for candidate in candidates:
        try:
            resp = (
                supabase_client.table("businesses")
                .select("id")
                .eq("site_slug", candidate)
                .limit(1)
                .execute()
            )
            if not resp.data:
                return candidate
        except Exception as error:
            # Column may not exist yet (migration 012 pending)
            print(f"site_slug_lookup_skipped: {error}")
            return None

    return None
