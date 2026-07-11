import unittest
from unittest.mock import MagicMock

from middleware.platform_api import (
    fetch_business_summary,
    hash_api_key,
    verify_business_api_key,
)


class PlatformApiTests(unittest.TestCase):
    def test_hash_api_key_is_stable(self):
        first = hash_api_key("lp_test_key")
        second = hash_api_key("lp_test_key")
        self.assertEqual(first, second)
        self.assertEqual(len(first), 64)

    def test_verify_business_api_key_success(self):
        client = MagicMock()
        client.table.return_value.select.return_value.eq.return_value.eq.return_value.is_.return_value.maybe_single.return_value.execute.return_value = MagicMock(
            data={"id": "key-1"}
        )
        client.table.return_value.update.return_value.eq.return_value.execute.return_value = (
            MagicMock()
        )

        ok = verify_business_api_key(client, "lp_test_key", "biz-1")
        self.assertTrue(ok)

    def test_verify_business_api_key_rejects_missing(self):
        client = MagicMock()
        client.table.return_value.select.return_value.eq.return_value.eq.return_value.is_.return_value.maybe_single.return_value.execute.return_value = MagicMock(
            data=None
        )

        ok = verify_business_api_key(client, "lp_bad", "biz-1")
        self.assertFalse(ok)

    def test_fetch_business_summary_includes_public_site(self):
        client = MagicMock()

        def table(name: str):
            mock = MagicMock()
            if name == "businesses":
                mock.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                    data={
                        "id": "biz-1",
                        "name": "Kuaför",
                        "sector": "salon",
                        "city": "İstanbul",
                        "created_at": "2026-01-01",
                        "site_slug": "guzel-kuafor",
                        "custom_domain": None,
                        "custom_domain_status": "none",
                    }
                )
            else:
                mock.select.return_value.eq.return_value.execute.return_value = MagicMock(
                    count=3
                )
            return mock

        client.table.side_effect = table
        summary = fetch_business_summary(client, "biz-1")
        self.assertIsNotNone(summary)
        assert summary is not None
        self.assertEqual(summary["public_site"]["path"], "/site/guzel-kuafor")
        self.assertEqual(summary["metrics"]["orders"], 3)


if __name__ == "__main__":
    unittest.main()