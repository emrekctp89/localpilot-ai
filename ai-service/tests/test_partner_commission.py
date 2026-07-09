import unittest
from decimal import Decimal
from unittest.mock import MagicMock

from middleware.partner_commission import (
    commission_amount,
    record_pro_activation_commission,
    resolve_pro_gross_amount,
)


class PartnerCommissionTests(unittest.TestCase):
    def test_commission_amount_monthly_default(self):
        self.assertEqual(
            commission_amount(Decimal("299"), 1000),
            Decimal("29.90"),
        )

    def test_resolve_pro_gross_amount_yearly(self):
        self.assertEqual(resolve_pro_gross_amount("yearly"), Decimal("2990"))

    def test_record_commission_without_attribution_is_noop(self):
        supabase = MagicMock()
        supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
            data=None
        )

        ok, error = record_pro_activation_commission(supabase, "user-1")
        self.assertTrue(ok)
        self.assertIsNone(error)

    def test_record_commission_creates_ledger_and_marks_converted(self):
        supabase = MagicMock()
        attribution_table = MagicMock()
        partner_table = MagicMock()
        ledger_table = MagicMock()

        def table(name):
            if name == "referral_attributions":
                return attribution_table
            if name == "partner_profiles":
                return partner_table
            if name == "commission_ledger":
                return ledger_table
            raise AssertionError(f"unexpected table {name}")

        supabase.table.side_effect = table

        attribution_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
            data={
                "id": "attr-1",
                "partner_user_id": "partner-1",
                "status": "pending",
            }
        )
        partner_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
            data={"commission_rate_bps": 2000, "status": "active"}
        )
        ledger_table.insert.return_value.execute.return_value = MagicMock(data=[{"id": "led-1"}])
        attribution_table.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "attr-1"}]
        )

        ok, error = record_pro_activation_commission(
            supabase, "user-2", "monthly"
        )
        self.assertTrue(ok)
        self.assertIsNone(error)
        ledger_table.insert.assert_called_once()
        attribution_table.update.assert_called_once()


if __name__ == "__main__":
    unittest.main()