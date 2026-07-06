import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  MARKETING_VALUE_PROPS,
  PRICING_PLANS,
  SECTOR_DEMOS,
} from "../../lib/marketing-site";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("marketing site integration", () => {
  it("defines value props, sector demos and pricing plans", () => {
    assert.ok(MARKETING_VALUE_PROPS.length >= 4);
    assert.ok(SECTOR_DEMOS.length >= 5);
    assert.equal(PRICING_PLANS.length, 2);
    assert.ok(PRICING_PLANS.some((plan) => plan.id === "pro"));
  });

  it("wires landing page with hero, features and sector showcase", () => {
    const landingSource = readSource("app/page.tsx");
    assert.match(landingSource, /MARKETING_VALUE_PROPS/);
    assert.match(landingSource, /SectorDemoShowcase/);
    assert.match(landingSource, /id="sektorler"/);
    assert.doesNotMatch(landingSource, /redirect\(/);
  });

  it("wires pricing page with plan cards and comparison table", () => {
    const pricingSource = readSource("app/fiyatlandirma/page.tsx");
    assert.match(pricingSource, /PricingCards/);
    assert.match(pricingSource, /MARKETING_FAQ/);
    assert.match(pricingSource, /FREE_AI_DAILY_LIMIT/);
  });

  it("exposes marketing navigation and footer links", () => {
    const navSource = readSource("app/components/marketing/MarketingNav.tsx");
    const footerSource = readSource("app/components/marketing/MarketingFooter.tsx");

    assert.match(navSource, /\/fiyatlandirma/);
    assert.match(navSource, /\/auth/);
    assert.match(footerSource, /Fiyatlandırma/);
  });
});