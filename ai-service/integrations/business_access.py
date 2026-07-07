from typing import Any, Optional


def extract_user_id(subject: str) -> Optional[str]:
    if subject.startswith("user:"):
        return subject.split(":", 1)[1]
    return None


def user_can_write_business(
    supabase_client: Any, user_id: str, business_id: str
) -> bool:
    if not user_id or not business_id:
        return False

    try:
        owned = (
            supabase_client.table("businesses")
            .select("id")
            .eq("id", business_id)
            .eq("owner_id", user_id)
            .maybe_single()
            .execute()
        )
        if owned.data:
            return True

        member = (
            supabase_client.table("business_members")
            .select("role")
            .eq("business_id", business_id)
            .eq("user_id", user_id)
            .eq("role", "staff")
            .maybe_single()
            .execute()
        )
        return bool(member.data)
    except Exception:
        return False


def require_business_write_access(
    supabase_client: Any, subject: str, business_id: str
) -> str:
    user_id = extract_user_id(subject)
    if not user_id:
        raise PermissionError("Oturum gerekli.")
    if not user_can_write_business(supabase_client, user_id, business_id):
        raise PermissionError("Bu işletme için yazma yetkiniz yok.")
    return user_id