import unittest

from middleware.stripe_utils import (
    checkout_session_is_paid,
    checkout_session_user_id,
    read_stripe_field,
)


class StripeObjectStub:
    def __init__(self, data):
        self._data = data

    def __getattr__(self, name):
        try:
            return self._data[name]
        except KeyError as error:
            raise AttributeError(name) from error

    def __getitem__(self, key):
        return self._data[key]


class StripeUtilsTests(unittest.TestCase):
    def test_read_stripe_field_from_dict(self):
        self.assertEqual(read_stripe_field({"status": "complete"}, "status"), "complete")

    def test_read_stripe_field_from_stripe_object(self):
        session = StripeObjectStub(
            {
                "payment_status": "paid",
                "status": "complete",
                "metadata": StripeObjectStub({"user_id": "user-abc"}),
            }
        )
        self.assertEqual(read_stripe_field(session, "payment_status"), "paid")
        self.assertEqual(checkout_session_user_id(session), "user-abc")
        self.assertTrue(checkout_session_is_paid(session))

    def test_checkout_session_user_id_missing_metadata(self):
        session = StripeObjectStub({"payment_status": "paid"})
        self.assertIsNone(checkout_session_user_id(session))


if __name__ == "__main__":
    unittest.main()