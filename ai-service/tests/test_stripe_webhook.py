import unittest
from unittest.mock import MagicMock

from middleware.stripe_webhook import activate_pro_membership, handle_stripe_event


class StripeWebhookTests(unittest.TestCase):
    def test_activate_pro_missing_user_id(self):
        client = MagicMock()
        ok, error = activate_pro_membership(client, "")
        self.assertFalse(ok)
        self.assertIn("user_id", error or "")

    def test_activate_pro_idempotent_when_already_pro(self):
        client = MagicMock()
        client.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={"is_pro": True}
        )

        ok, error = activate_pro_membership(client, "user-123")
        self.assertTrue(ok)
        self.assertIsNone(error)
        client.table.return_value.update.assert_not_called()

    def test_activate_pro_updates_profile(self):
        client = MagicMock()
        client.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={"is_pro": False}
        )
        client.table.return_value.update.return_value.eq.return_value.select.return_value.single.return_value.execute.return_value = MagicMock(
            data={"id": "user-123", "is_pro": True}
        )

        ok, error = activate_pro_membership(client, "user-123")
        self.assertTrue(ok)
        self.assertIsNone(error)
        update_payload = client.table.return_value.update.call_args[0][0]
        self.assertTrue(update_payload["is_pro"])
        self.assertIn("pro_activated_at", update_payload)

    def test_handle_checkout_completed_success(self):
        client = MagicMock()
        client.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={"is_pro": False}
        )
        client.table.return_value.update.return_value.eq.return_value.select.return_value.single.return_value.execute.return_value = MagicMock(
            data={"id": "user-123", "is_pro": True}
        )

        payload, status = handle_stripe_event(
            {
                "type": "checkout.session.completed",
                "data": {"object": {"metadata": {"user_id": "user-123"}}},
            },
            client,
        )
        self.assertEqual(status, 200)
        self.assertEqual(payload["status"], "success")

    def test_handle_unknown_event_is_ignored(self):
        client = MagicMock()
        payload, status = handle_stripe_event({"type": "invoice.paid"}, client)
        self.assertEqual(status, 200)
        self.assertEqual(payload["status"], "ignored")


if __name__ == "__main__":
    unittest.main()