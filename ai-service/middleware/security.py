from typing import Optional

from fastapi import Request
from fastapi.responses import JSONResponse
from supabase import Client

from middleware.config import (
    PUBLIC_PATHS,
    PUBLIC_PREFIXES,
    RateLimiter,
    auth_is_required,
    build_rate_limiter,
    parse_allow_origin_regex,
    parse_allowed_origins,
)

__all__ = [
    "PUBLIC_PATHS",
    "PUBLIC_PREFIXES",
    "RateLimiter",
    "auth_is_required",
    "build_rate_limiter",
    "parse_allowed_origins",
    "parse_allow_origin_regex",
    "create_auth_middleware",
    "create_rate_limit_middleware",
]


def extract_bearer_token(request: Request) -> Optional[str]:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.lower().startswith("bearer "):
        return auth_header[7:].strip()
    return None


async def verify_access(
    request: Request,
    supabase_client: Client,
    api_key: str,
) -> tuple[bool, str]:
    provided_api_key = request.headers.get("X-API-Key", "").strip()
    if api_key and provided_api_key and provided_api_key == api_key:
        return True, "api_key"

    token = extract_bearer_token(request)
    if not token:
        return False, "missing_credentials"

    if api_key and token == api_key:
        return True, "api_key_bearer"

    try:
        response = supabase_client.auth.get_user(token)
        if response and response.user:
            return True, f"user:{response.user.id}"
    except Exception:
        return False, "invalid_token"

    return False, "invalid_token"


def create_auth_middleware(supabase_client: Client, api_key: str):
    require_auth = auth_is_required()

    async def auth_middleware(request: Request, call_next):
        path = request.url.path
        if (
            request.method == "OPTIONS"
            or path in PUBLIC_PATHS
            or path.startswith(PUBLIC_PREFIXES)
        ):
            return await call_next(request)

        if not require_auth:
            request.state.auth_subject = "anonymous"
            return await call_next(request)

        allowed, subject = await verify_access(request, supabase_client, api_key)
        if not allowed:
            return JSONResponse(
                status_code=401,
                content={"detail": "Yetkisiz erişim. Oturum veya API anahtarı gerekli."},
            )

        request.state.auth_subject = subject
        return await call_next(request)

    return auth_middleware


def create_rate_limit_middleware(limiter: Optional[RateLimiter]):
    async def rate_limit_middleware(request: Request, call_next):
        path = request.url.path
        if (
            request.method == "OPTIONS"
            or path in PUBLIC_PATHS
            or path.startswith(PUBLIC_PREFIXES)
        ):
            return await call_next(request)

        if limiter is None:
            return await call_next(request)

        subject = getattr(request.state, "auth_subject", None)
        client_host = request.client.host if request.client else "unknown"
        bucket_key = subject or client_host

        if not limiter.allow(bucket_key):
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Çok fazla istek gönderildi. Lütfen biraz bekleyin.",
                },
            )

        return await call_next(request)

    return rate_limit_middleware