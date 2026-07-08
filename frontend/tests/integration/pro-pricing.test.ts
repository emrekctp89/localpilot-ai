import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  getProPricing,
  PRO_PRICING,
  type BillingInterval,
} from "../../lib/pro-pricing";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("pro pricing integration", () => {
  it("defines monthly and yearly Pro options", () => {
    assert.equal(PRO_PRICING.monthly.amountTry, 299);
    assert.equal(PRO_PRICING.yearly.amountTry, 2990);
    assert.equal(PRO_PRICING.yearly.savingsBadge, "2 ay bedava");
  });

  it("resolves pricing by billing interval", () => {
    const intervals: BillingInterval[] = ["monthly", "yearly"];
    for (const interval of intervals) {
      assert.equal(getProPricing(interval).priceLabel.length > 0, true);
    }
  });

  it("wires checkout and pricing UI surfaces", () => {
    const dashboardSource = readSource("app/dashboard/page.tsx");
    const pricingCardsSource = readSource(
      "app/components/marketing/PricingCards.tsx",
    );
    const aiClientSource = readSource("lib/ai-client.ts");
    const mainPySource = readFileSync(
      join(root, "../ai-service/main.py"),
      "utf8",
    );

    assert.match(dashboardSource, /readBillingInterval/);
    assert.match(dashboardSource, /billing_interval/);
    assert.match(pricingCardsSource, /BillingIntervalToggle/);
    assert.match(aiClientSource, /billing_interval/);
    assert.match(mainPySource, /billing_interval/);
    assert.match(mainPySource, /build_checkout_params/);
  });
});