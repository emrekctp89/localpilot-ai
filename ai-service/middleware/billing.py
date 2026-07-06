import os
from typing import Optional, Set

from fastapi import Request
from fastapi.responses import JSONResponse
from supabase import Client

from middleware.ai_usage import (
    AI_LIMITED_PATHS,
    consume_ai_usage,
    evaluate_ai_access,
    usage_guard_enabled,
)
from middleware.config import auth_is_required

PRO_REQUIRED_PATHS: Set[str] = AI_LIMITED_PATHS


def pro_guard_enabled() -> bool:
    return usage_guard_enabled()


def fetch_user_is_pro(supabase_client: Client, user_id: str) -> Optional[bool]:
    try:
        response = (
            supabase_client.table("profiles")
            .select("is_pro")
            .eq("id", user_id)
            .single()
            .execute()
        )
        return bool(response.data and response.data.get("is_pro"))
    except Exception:
        return None


def create_pro_guard_middleware(supabase_client: Client):
    async def pro_guard_middleware(request: Request, call_next):
        path = request.url.path
        if path not in AI_LIMITED_PATHS or not usage_guard_enabled():
            return await call_next(request)

        if not auth_is_required():
            return await call_next(request)

        subject = getattr(request.state, "auth_subject", "")
        if subject in {"api_key", "anonymous"} or subject.startswith("api_key"):
            return await call_next(request)

        if not subject.startswith("user:"):
            return JSONResponse(
                status_code=403,
                content={"detail": "Pro özellikler için oturum açmanız gerekir."},
            )

        user_id = subject.split(":", 1)[1]
        is_pro = fetch_user_is_pro(supabase_client, user_id)
        if is_pro is None:
            return JSONResponse(
                status_code=503,
                content={"detail": "Üyelik durumu doğrulanamadı. Tekrar deneyin."},
            )

        allowed, usage_snapshot, detail = evaluate_ai_access(
            supabase_client, user_id, bool(is_pro)
        )
        if not allowed:
            return JSONResponse(
                status_code=403,
                content={
                    "detail": detail,
                    "usage": usage_snapshot,
                    "upgrade_required": True,
                },
            )

        response = await call_next(request)
        if response.status_code < 400 and not is_pro:
            try:
                consume_ai_usage(supabase_client, user_id)
            except Exception as error:
                print(f"ai_usage_increment_failed user={user_id} error={error}")
        return response

    return pro_guard_middleware