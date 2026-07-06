import unittest

from prompt_context import (
    build_business_profile_block,
    build_campaign_mode_instruction,
    get_sector_hints,
)


class PromptContextTests(unittest.TestCase):
    def test_sector_hints_match_industry(self):
        hint = get_sector_hints(sector="", industry="Kuaför & Güzellik Salonu")
        self.assertIn("Randevu", hint)

    def test_business_profile_includes_city_and_goals(self):
        block = build_business_profile_block(
            business_name="Yıldız Salon",
            sector="güzellik",
            city="Düzce",
            goals=["Daha fazla randevu"],
        )
        self.assertIn("Yıldız Salon", block)
        self.assertIn("Düzce", block)
        self.assertIn("Daha fazla randevu", block)

    def test_variant_mode_requests_single_campaign(self):
        instruction = build_campaign_mode_instruction(
            "variant",
            existing_campaigns=[
                {"campaign_name": "Yaz İndirimi", "strategy": "Sezon kampanyası"}
            ],
            variant_index=0,
        )
        self.assertIn("VARYANT", instruction)
        self.assertIn("tam 1 kampanya", instruction)


if __name__ == "__main__":
    unittest.main()