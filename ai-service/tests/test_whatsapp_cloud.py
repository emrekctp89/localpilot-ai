from integrations.whatsapp_cloud import (
    normalize_recipient_phone,
    whatsapp_env_configured,
)


def test_normalize_recipient_phone_tr_mobile():
    assert normalize_recipient_phone("0555 111 22 33") == "905551112233"


def test_normalize_recipient_phone_already_international():
    assert normalize_recipient_phone("+90 555 111 22 33") == "905551112233"


def test_whatsapp_env_configured_false_by_default(monkeypatch):
    monkeypatch.delenv("WHATSAPP_ACCESS_TOKEN", raising=False)
    monkeypatch.delenv("WHATSAPP_PHONE_NUMBER_ID", raising=False)
    assert whatsapp_env_configured() is False


def test_whatsapp_env_configured_true_when_set(monkeypatch):
    monkeypatch.setenv("WHATSAPP_ACCESS_TOKEN", "token")
    monkeypatch.setenv("WHATSAPP_PHONE_NUMBER_ID", "123")
    assert whatsapp_env_configured() is True