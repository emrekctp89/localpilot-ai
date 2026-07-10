import unittest
from unittest.mock import MagicMock

from site_slug import (
    allocate_unique_site_slug,
    is_valid_site_slug,
    normalize_site_slug,
    suggest_site_slug_from_name,
)


class SiteSlugTests(unittest.TestCase):
    def test_normalize_turkish(self):
        self.assertEqual(normalize_site_slug("Güzel Kuaför!"), "guzel-kuafor")
        self.assertEqual(normalize_site_slug("  Şişli--Salon  "), "sisli-salon")
        self.assertTrue(is_valid_site_slug("guzel-kuafor"))
        self.assertFalse(is_valid_site_slug("a"))
        self.assertEqual(suggest_site_slug_from_name("Yıldız Makine"), "yildiz-makine")

    def test_allocate_unique_skips_taken(self):
        table = MagicMock()
        chain = MagicMock()
        table.select.return_value = chain
        chain.eq.return_value = chain
        chain.limit.return_value = chain

        # first candidate taken, second free
        first = MagicMock()
        first.data = [{"id": "existing"}]
        second = MagicMock()
        second.data = []
        chain.execute.side_effect = [first, second]

        client = MagicMock()
        client.table.return_value = table

        slug = allocate_unique_site_slug(client, "Güzel Kuaför")
        self.assertEqual(slug, "guzel-kuafor-2")


if __name__ == "__main__":
    unittest.main()
