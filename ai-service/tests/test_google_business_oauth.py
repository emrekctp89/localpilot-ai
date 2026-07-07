from integrations.google_business_oauth import (
    build_oauth_state,
    google_env_configured,
    parse_oauth_state,
)


def test_google_env_configured_false_by_default(monkeypatch):
    monkeypatch.delenv("GOOGLE_OAUTH_CLIENT_ID", raising=False)
    monkeypatch.delenv("GOOGLE_OAUTH_CLIENT_SECRET", raising=False)
    monkeypatch.delenv("GOOGLE_OAUTH_REDIRECT_URI", raising=False)
    assert google_env_configured() is False


def test_oauth_state_roundtrip():
    state = build_oauth_state("biz-1", "user-1")
    business_id, user_id = parse_oauth_state(state)
    assert business_id == "biz-1"
    assert user_id == "user-1"