import os
import unittest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from middleware.ai_usage import (
    build_pro_usage_snapshot,
    evaluate_ai_access,
    free_ai_daily_limit,
    free_ai_monthly_limit,
    get_usage_snapshot,
    period_keys,
)


class AiUsageTests(unittest.TestCase):
    def test_period_keys(self):
        fixed = datetime(2026, 7, 6, 12, 0, tzinfo=timezone.utc)
        daily, monthly = period_keys(fixed)
        self.assertEqual(daily, "2026-07-06")
        self.assertEqual(monthly, "2026-07")

    def test_free_limits_defaults(self):
        with patch.dict(os.environ, {}, clear=False):
            self.assertEqual(free_ai_daily_limit(), 3)
            self.assertEqual(free_ai_monthly_limit(), 15)

    def test_pro_snapshot_unlimited(self):
        snapshot = build_pro_usage_snapshot()
        self.assertTrue(snapshot["is_pro"])
        self.assertTrue(snapshot["can_use_ai"])
        self.assertIsNone(snapshot["daily"]["limit"])

    def test_get_usage_snapshot_under_limit(self):
        client = MagicMock()

        def fake_select_chain(*_args, **_kwargs):
            chain = MagicMock()
            chain.eq.return_value = chain
            chain.maybe_single.return_value = chain
            chain.execute.return_value = MagicMock(data=None)
            return chain

        client.table.return_value.select.side_effect = fake_select_chain

        snapshot = get_usage_snapshot(client, "user-1")
        self.assertFalse(snapshot["is_pro"])
        self.assertTrue(snapshot["can_use_ai"])
        self.assertEqual(snapshot["daily"]["remaining"], 3)

    def test_evaluate_ai_access_blocks_when_daily_exhausted(self):
        client = MagicMock()

        def fake_select_chain(*_args, **_kwargs):
            chain = MagicMock()
            chain.eq.return_value = chain
            chain.maybe_single.return_value = chain

            def execute():
                table_name = client.table.call_args[0][0]
                if table_name == "ai_usage_counters":
                    return MagicMock(data={"usage_count": 3})
                return MagicMock(data=None)

            chain.execute.side_effect = execute
            return chain

        client.table.return_value.select.side_effect = fake_select_chain

        allowed, snapshot, detail = evaluate_ai_access(client, "user-1", False)
        self.assertFalse(allowed)
        self.assertFalse(snapshot["can_use_ai"])
        self.assertIn("Günlük AI limitinize", detail or "")

    def test_evaluate_ai_access_allows_pro(self):
        client = MagicMock()
        allowed, snapshot, detail = evaluate_ai_access(client, "user-1", True)
        self.assertTrue(allowed)
        self.assertTrue(snapshot["is_pro"])
        self.assertIsNone(detail)


if __name__ == "__main__":
    unittest.main()