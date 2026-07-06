import unittest
from unittest.mock import MagicMock, patch

from middleware.stripe_checkout import confirm_pro_checkout


class StripeCheckoutTests(unittest.TestCase):
    def test_confirm_with_session_id_activates_pro(self):
        stripe_client = MagicMock()
        stripe_client.checkout.Session.retrieve.return_value = {
            "id": "cs_test_123",
            "payment_status": "paid",
            "metadata": {"user_id": "user-123"},
        }
        supabase = MagicMock()
        supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={"is_pro": False}
        )
        supabase.table.return_value.update.return_value.eq.return_value.select.return_value.single.return_value.execute.return_value = MagicMock(
            data={"id": "user-123", "is_pro": True}
        )

        payload, status = confirm_pro_checkout(
            stripe_client,
            supabase,
            "user-123",
            "cs_test_123",
        )
        self.assertEqual(status, 200)
        self.assertTrue(payload["is_pro"])

    def test_confirm_rejects_foreign_session(self):
        stripe_client = MagicMock()
        stripe_client.checkout.Session.retrieve.return_value = {
            "payment_status": "paid",
            "metadata": {"user_id": "other-user"},
        }

        payload, status = confirm_pro_checkout(
            stripe_client,
            MagicMock(),
            "user-123",
            "cs_test_123",
        )
        self.assertEqual(status, 403)
        self.assertEqual(payload["status"], "forbidden")

    def test_confirm_with_session_id_without_auth_user(self):
        stripe_client = MagicMock()
        stripe_client.checkout.Session.retrieve.return_value = {
            "id": "cs_test_456",
            "payment_status": "paid",
            "metadata": {"user_id": "user-456"},
        }
        supabase = MagicMock()
        supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={"is_pro": False}
        )
        supabase.table.return_value.update.return_value.eq.return_value.select.return_value.single.return_value.execute.return_value = MagicMock(
            data={"id": "user-456", "is_pro": True}
        )

        payload, status = confirm_pro_checkout(
            stripe_client,
            supabase,
            None,
            "cs_test_456",
        )
        self.assertEqual(status, 200)
        self.assertTrue(payload["is_pro"])

    def test_confirm_finds_recent_paid_session_without_id(self):
        stripe_client = MagicMock()
        stripe_client.checkout.Session.list.return_value = {
            "data": [
                {
                    "payment_status": "paid",
                    "metadata": {"user_id": "user-123"},
                }
            ]
        }
        supabase = MagicMock()
        supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={"is_pro": True}
        )

        payload, status = confirm_pro_checkout(
            stripe_client,
            supabase,
            "user-123",
            None,
        )
        self.assertEqual(status, 200)
        self.assertTrue(payload["is_pro"])


if __name__ == "__main__":
    unittest.main()