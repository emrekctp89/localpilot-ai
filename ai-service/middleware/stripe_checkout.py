from typing import Any, Dict, Optional, Tuple

from middleware.stripe_webhook import activate_pro_membership


def _is_paid_checkout_session(session: Any) -> bool:
    payment_status = getattr(session, "payment_status", None) or session.get(
        "payment_status"
    )
    status = getattr(session, "status", None) or session.get("status")
    return payment_status == "paid" or status == "complete"


def _session_user_id(session: Any) -> Optional[str]:
    metadata = getattr(session, "metadata", None) or session.get("metadata") or {}
    return metadata.get("user_id")


def find_recent_paid_session(stripe_client: Any, user_id: str) -> Optional[Any]:
    sessions = stripe_client.checkout.Session.list(limit=25)
    data = getattr(sessions, "data", None) or sessions.get("data") or []
    for session in data:
        if _session_user_id(session) != user_id:
            continue
        if _is_paid_checkout_session(session):
            return session
    return None


def confirm_pro_checkout(
    stripe_client: Any,
    supabase_client: Any,
    user_id: Optional[str],
    session_id: Optional[str] = None,
) -> Tuple[Dict[str, Any], int]:
    if not user_id and not session_id:
        return {"status": "error", "detail": "Kullanıcı kimliği gerekli."}, 401

    session = None
    if session_id:
        try:
            session = stripe_client.checkout.Session.retrieve(session_id)
        except Exception as error:
            return {
                "status": "error",
                "detail": f"Ödeme oturumu bulunamadı: {error}",
            }, 404
    elif user_id:
        try:
            session = find_recent_paid_session(stripe_client, user_id)
        except Exception as error:
            return {
                "status": "error",
                "detail": f"Ödeme oturumları alınamadı: {error}",
            }, 503
    else:
        return {
            "status": "error",
            "detail": "Ödeme oturumu kimliği gerekli.",
            "is_pro": False,
        }, 400

    if not session:
        return {
            "status": "not_found",
            "detail": "Onaylanacak ödeme bulunamadı.",
            "is_pro": False,
        }, 404

    session_user_id = _session_user_id(session)
    if not session_user_id:
        return {
            "status": "error",
            "detail": "Ödeme oturumunda kullanıcı bilgisi bulunamadı.",
            "is_pro": False,
        }, 400

    if user_id and session_user_id != user_id:
        return {
            "status": "forbidden",
            "detail": "Bu ödeme oturumu hesabınıza ait değil.",
            "is_pro": False,
        }, 403

    effective_user_id = user_id or session_user_id

    if not _is_paid_checkout_session(session):
        return {
            "status": "unpaid",
            "detail": "Ödeme henüz tamamlanmamış.",
            "is_pro": False,
        }, 402

    ok, error = activate_pro_membership(supabase_client, effective_user_id)
    if not ok:
        return {
            "status": "error",
            "detail": error or "Pro aktivasyonu başarısız.",
            "is_pro": False,
        }, 500

    return {"status": "success", "is_pro": True}, 200