import unittest

from ai_cache import (
    build_cache_key,
    clear_cache,
    get_cached_response,
    get_cache_stats,
    set_cached_response,
)


class AiCacheTests(unittest.TestCase):
    def setUp(self):
        clear_cache()

    def test_cache_hit_for_same_prompt(self):
        key = build_cache_key("system", "user prompt", 0.5)
        payload = {"ok": True}
        set_cached_response(key, payload)
        self.assertEqual(get_cached_response(key), payload)

    def test_cache_miss_for_different_prompt(self):
        key_a = build_cache_key("system", "prompt a", 0.5)
        key_b = build_cache_key("system", "prompt b", 0.5)
        set_cached_response(key_a, {"a": 1})
        self.assertIsNone(get_cached_response(key_b))

    def test_cache_stats_track_entries(self):
        key = build_cache_key("system", "stats", 0.4)
        set_cached_response(key, {"value": 1})
        stats = get_cache_stats()
        self.assertEqual(stats["entries"], 1)
        self.assertGreater(stats["ttl_seconds"], 0)


if __name__ == "__main__":
    unittest.main()