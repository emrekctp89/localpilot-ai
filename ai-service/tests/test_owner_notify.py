from integrations.owner_notify import (
    build_lead_owner_message,
    is_valid_notify_email,
    parse_owner_notify_config,
    resend_env_configured,
)


def test_parse_owner_notify_defaults():
    assert parse_owner_notify_config(None) == {
        "email_enabled": False,
        "email": "",
        "whatsapp_enabled": False,
    }
    assert parse_owner_notify_config({})["whatsapp_enabled"] is False


def test_parse_owner_notify_enabled():
    cfg = parse_owner_notify_config(
        {
            "owner_notify": {
                "email_enabled": True,
                "email": "owner@example.com",
                "whatsapp_enabled": True,
            }
        }
    )
    assert cfg["email_enabled"] is True
    assert cfg["email"] == "owner@example.com"
    assert cfg["whatsapp_enabled"] is True


def test_parse_owner_notify_email_requires_address():
    cfg = parse_owner_notify_config(
        {"owner_notify": {"email_enabled": True, "email": "  "}}
    )
    assert cfg["email_enabled"] is False


def test_is_valid_notify_email():
    assert is_valid_notify_email("a@b.co") is True
    assert is_valid_notify_email("not-an-email") is False
    assert is_valid_notify_email("") is False


def test_build_lead_owner_message_includes_fields():
    msg = build_lead_owner_message(
        business_name="Kafe",
        full_name="Ayşe",
        phone="0532",
        notes="Menü sorusu",
    )
    assert "Kafe" in msg
    assert "Ayşe" in msg
    assert "0532" in msg
    assert "Menü sorusu" in msg
    assert "CRM" in msg


def test_resend_env_configured_false_by_default(monkeypatch):
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    assert resend_env_configured() is False


def test_resend_env_configured_true_when_set(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "re_test")
    assert resend_env_configured() is True
