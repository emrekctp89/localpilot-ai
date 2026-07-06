from __future__ import annotations

import hashlib
import os
import time
from typing import Any, Dict, Optional, Tuple

_CACHE: Dict[str, Tuple[float, Dict[str, Any]]] = {}
CACHE_TTL_SECONDS = int(os.getenv("AI_CACHE_TTL_SECONDS", "300"))
CACHE_MAX_ENTRIES = int(os.getenv("AI_CACHE_MAX_ENTRIES", "128"))


def build_cache_key(
    system_instruction: str,
    user_prompt: str,
    temperature: float,
) -> str:
    payload = f"{system_instruction}|{user_prompt}|{temperature:.2f}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _evict_expired(now: float) -> None:
    expired_keys = [
        key
        for key, (expires_at, _) in _CACHE.items()
        if expires_at <= now
    ]
    for key in expired_keys:
        _CACHE.pop(key, None)


def _trim_cache() -> None:
    if len(_CACHE) <= CACHE_MAX_ENTRIES:
        return

    sorted_items = sorted(_CACHE.items(), key=lambda item: item[1][0])
    overflow = len(_CACHE) - CACHE_MAX_ENTRIES
    for key, _ in sorted_items[:overflow]:
        _CACHE.pop(key, None)


def get_cached_response(cache_key: str) -> Optional[Dict[str, Any]]:
    now = time.time()
    _evict_expired(now)
    entry = _CACHE.get(cache_key)
    if not entry:
        return None

    expires_at, payload = entry
    if expires_at <= now:
        _CACHE.pop(cache_key, None)
        return None

    return payload


def set_cached_response(cache_key: str, payload: Dict[str, Any]) -> None:
    now = time.time()
    _evict_expired(now)
    _CACHE[cache_key] = (now + CACHE_TTL_SECONDS, payload)
    _trim_cache()


def get_cache_stats() -> Dict[str, int]:
    now = time.time()
    _evict_expired(now)
    return {
        "entries": len(_CACHE),
        "ttl_seconds": CACHE_TTL_SECONDS,
        "max_entries": CACHE_MAX_ENTRIES,
    }


def clear_cache() -> None:
    _CACHE.clear()