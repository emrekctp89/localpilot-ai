import os
import unittest

from dotenv import load_dotenv
from supabase import create_client

from middleware.stripe_webhook import activate_pro_membership

load_dotenv()


@unittest.skipUnless(
    os.getenv("RUN_STRIPE_INTEGRATION") == "1",
    "Set RUN_STRIPE_INTEGRATION=1 to run live Supabase activation test",
)
class StripeActivationIntegrationTests(unittest.TestCase):
    def test_activate_pro_membership_updates_profile(self):
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        user_id = os.getenv("STRIPE_TEST_USER_ID")
        self.assertTrue(url and key and user_id)

        client = create_client(url, key)
        before = (
            client.table("profiles")
            .select("is_pro")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        self.assertIsNotNone(before.data)

        if before.data.get("is_pro"):
            client.table("profiles").update({"is_pro": False}).eq("id", user_id).execute()

        ok, error = activate_pro_membership(client, user_id)
        self.assertTrue(ok, error)

        after = (
            client.table("profiles")
            .select("is_pro, pro_activated_at")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        self.assertTrue(after.data.get("is_pro"))
        self.assertTrue(after.data.get("pro_activated_at"))


if __name__ == "__main__":
    unittest.main()