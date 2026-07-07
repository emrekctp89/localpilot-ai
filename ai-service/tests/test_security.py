import os
import unittest
from unittest.mock import patch

from middleware.config import (
    RateLimiter,
    auth_is_required,
    parse_allow_origin_regex,
    parse_allowed_origins,
    resolve_stripe_mode,
)


class SecurityConfigTests(unittest.TestCase):
    def test_parse_allowed_origins_from_env(self):
        with patch.dict(
            os.environ,
            {"ALLOWED_ORIGINS": "https://app.example.com, https://staging.example.com"},
            clear=False,
        ):
            origins = parse_allowed_origins("https://panel.example.com")
            self.assertEqual(
                origins,
                [
                    "https://app.example.com",
                    "https://panel.example.com",
                    "https://staging.example.com",
                ],
            )

    def test_parse_allowed_origins_strips_wildcard_entries(self):
        with patch.dict(
            os.environ,
            {
                "ALLOWED_ORIGINS": "https://app.vercel.app,https://app-*.vercel.app",
            },
            clear=False,
        ):
            origins = parse_allowed_origins("http://localhost:3000")
            self.assertEqual(
                origins,
                ["http://localhost:3000", "https://app.vercel.app"],
            )

    def test_parse_allow_origin_regex_from_wildcard_origins(self):
        with patch.dict(
            os.environ,
            {
                "ALLOWED_ORIGINS": "https://app.vercel.app,https://localpilot-*.vercel.app",
                "ALLOW_ORIGIN_REGEX": "",
                "CORS_ALLOW_VERCEL_PREVIEWS": "",
            },
            clear=False,
        ):
            regex = parse_allow_origin_regex("https://app.vercel.app")
            self.assertEqual(regex, r"https://localpilot\-.*\.vercel\.app")

    def test_parse_allow_origin_regex_explicit_override(self):
        with patch.dict(
            os.environ,
            {"ALLOW_ORIGIN_REGEX": r"https://.*\.vercel\.app"},
            clear=False,
        ):
            regex = parse_allow_origin_regex("http://localhost:3000")
            self.assertEqual(regex, r"https://.*\.vercel\.app")

    def test_parse_allow_origin_regex_vercel_preview_flag(self):
        with patch.dict(
            os.environ,
            {
                "ALLOWED_ORIGINS": "",
                "ALLOW_ORIGIN_REGEX": "",
                "CORS_ALLOW_VERCEL_PREVIEWS": "true",
            },
            clear=False,
        ):
            regex = parse_allow_origin_regex("http://localhost:3000")
            self.assertEqual(regex, r"https://.*\.vercel\.app")

    def test_auth_required_in_production(self):
        with patch.dict(
            os.environ,
            {"ENVIRONMENT": "production", "AI_SERVICE_REQUIRE_AUTH": ""},
            clear=False,
        ):
            self.assertTrue(auth_is_required())

    def test_auth_disabled_when_explicitly_off(self):
        with patch.dict(
            os.environ,
            {"AI_SERVICE_REQUIRE_AUTH": "false", "ENVIRONMENT": "production"},
            clear=False,
        ):
            self.assertFalse(auth_is_required())

    def test_rate_limiter_blocks_after_limit(self):
        limiter = RateLimiter(limit=2, window_seconds=60)
        self.assertTrue(limiter.allow("client-a"))
        self.assertTrue(limiter.allow("client-a"))
        self.assertFalse(limiter.allow("client-a"))

    def test_resolve_stripe_mode(self):
        self.assertEqual(resolve_stripe_mode(None), "unset")
        self.assertEqual(resolve_stripe_mode(""), "unset")
        self.assertEqual(resolve_stripe_mode("sk_test_abc"), "test")
        self.assertEqual(resolve_stripe_mode("sk_live_abc"), "live")
        self.assertEqual(resolve_stripe_mode("rk_live_abc"), "unknown")


if __name__ == "__main__":
    unittest.main()