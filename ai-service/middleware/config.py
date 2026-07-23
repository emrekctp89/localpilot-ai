import os
import re
import time
from collections import defaultdict, deque
from typing import Deque, Dict, Optional

PUBLIC_PATHS = {
    "/",
    "/health",
    "/stripe-webhook",
    "/integration/google/oauth/callback",
    "/public/owner-lead-notify",
    "/docs",
    "/openapi.json",
    "/redoc",
}

PUBLIC_PREFIXES = ("/docs/", "/platform/")


def _wildcard_origin_to_regex(origin: str) -> str:
    return re.escape(origin).replace(r"\*", ".*")


def parse_allowed_origins(frontend_url: str) -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "").strip()
    origins: set[str] = set()
    frontend = (frontend_url or "").strip()
    if frontend:
        origins.add(frontend)
    if raw:
        for item in raw.split(","):
            origin = item.strip()
            if origin and "*" not in origin:
                origins.add(origin)
    if origins:
        return sorted(origins)

    defaults = {frontend, "http://localhost:3000", "http://127.0.0.1:3000"}
    return sorted(origin for origin in defaults if origin)


def is_origin_allowed(
    origin: str,
    allowed_origins: list[str],
    allow_origin_regex: Optional[str] = None,
) -> bool:
    candidate = (origin or "").strip()
    if not candidate:
        return False
    if candidate in allowed_origins:
        return True
    if allow_origin_regex:
        return bool(re.fullmatch(allow_origin_regex, candidate))
    return False


def parse_allow_origin_regex(frontend_url: str) -> Optional[str]:
    explicit = os.getenv("ALLOW_ORIGIN_REGEX", "").strip()
    if explicit:
        return explicit

    patterns = []
    raw = os.getenv("ALLOWED_ORIGINS", "").strip()
    if raw:
        for item in raw.split(","):
            origin = item.strip()
            if origin and "*" in origin:
                patterns.append(_wildcard_origin_to_regex(origin))

    if patterns:
        return "|".join(patterns)

    if os.getenv("CORS_ALLOW_VERCEL_PREVIEWS", "").lower() in {"1", "true", "yes"}:
        return r"https://.*\.vercel\.app"

    return None


def is_development() -> bool:
    return os.getenv("ENVIRONMENT", "development").lower() == "development"


def auth_is_required() -> bool:
    explicit = os.getenv("AI_SERVICE_REQUIRE_AUTH", "").lower()
    if explicit in {"0", "false", "no"}:
        return False
    if explicit in {"1", "true", "yes"}:
        return True

    api_key = os.getenv("AI_SERVICE_API_KEY", "").strip()
    environment = os.getenv("ENVIRONMENT", "development").lower()
    return bool(api_key) or environment == "production"


class RateLimiter:
    def __init__(self, limit: int, window_seconds: int = 60):
        self.limit = limit
        self.window_seconds = window_seconds
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)

    def allow(self, key: str) -> bool:
        now = time.time()
        bucket = self._hits[key]

        while bucket and now - bucket[0] > self.window_seconds:
            bucket.popleft()

        if len(bucket) >= self.limit:
            return False

        bucket.append(now)
        return True


def build_rate_limiter() -> Optional[RateLimiter]:
    raw_limit = os.getenv("RATE_LIMIT_PER_MINUTE", "60").strip()
    try:
        limit = int(raw_limit)
    except ValueError:
        limit = 60

    if limit <= 0:
        return None

    return RateLimiter(limit=limit, window_seconds=60)


def resolve_stripe_mode(secret_key: Optional[str]) -> str:
    if not secret_key:
        return "unset"
    if secret_key.startswith("sk_test_"):
        return "test"
    if secret_key.startswith("sk_live_"):
        return "live"
    return "unknown"