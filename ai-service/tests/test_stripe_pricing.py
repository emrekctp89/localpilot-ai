import os
import unittest
from unittest.mock import patch

from middleware.stripe_pricing import (
    build_checkout_params,
    normalize_billing_interval,
    stripe_price_id_for_interval,
)


class StripePricingTests(unittest.TestCase):
    def test_normalize_billing_interval_defaults_to_monthly(self):
        self.assertEqual(normalize_billing_interval(""), "monthly")
        self.assertEqual(normalize_billing_interval("MONTHLY"), "monthly")

    def test_normalize_billing_interval_rejects_unknown(self):
        with self.assertRaises(ValueError):
            normalize_billing_interval("weekly")

    @patch.dict(os.environ, {"STRIPE_PRICE_ID_MONTHLY": "price_monthly_test"}, clear=False)
    def test_stripe_price_id_for_interval_monthly(self):
        self.assertEqual(stripe_price_id_for_interval("monthly"), "price_monthly_test")

    @patch.dict(os.environ, {"STRIPE_PRICE_ID_YEARLY": "price_yearly_test"}, clear=False)
    def test_stripe_price_id_for_interval_yearly(self):
        self.assertEqual(stripe_price_id_for_interval("yearly"), "price_yearly_test")

    @patch.dict(os.environ, {}, clear=True)
    def test_build_checkout_params_fallback_monthly(self):
        line_items, mode = build_checkout_params("monthly")
        self.assertEqual(mode, "subscription")
        self.assertEqual(line_items[0]["price_data"]["unit_amount"], 29900)
        self.assertEqual(line_items[0]["price_data"]["recurring"]["interval"], "month")

    @patch.dict(os.environ, {}, clear=True)
    def test_build_checkout_params_fallback_yearly(self):
        line_items, mode = build_checkout_params("yearly")
        self.assertEqual(mode, "subscription")
        self.assertEqual(line_items[0]["price_data"]["unit_amount"], 299000)
        self.assertEqual(line_items[0]["price_data"]["recurring"]["interval"], "year")

    @patch.dict(
        os.environ,
        {"STRIPE_PRICE_ID_YEARLY": "price_yearly_live"},
        clear=False,
    )
    def test_build_checkout_params_uses_configured_price_id(self):
        line_items, mode = build_checkout_params("yearly")
        self.assertEqual(mode, "subscription")
        self.assertEqual(line_items[0]["price"], "price_yearly_live")


if __name__ == "__main__":
    unittest.main()