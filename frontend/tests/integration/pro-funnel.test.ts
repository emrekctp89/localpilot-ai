import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  activationProgress,
  buildActivationChecklist,
  formatUsageLabel,
  isWithinActivationWindow,
  PRO_FEATURES,
} from "../../lib/pro-funnel";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("pro funnel integration", () => {
  it("defines free AI limits and feature matrix", () => {
    assert.equal(PRO_FEATURES.length, 6);
    assert.ok(PRO_FEATURES.some((feature) => feature.id === "campaigns"));
  });

  it("tracks activation checklist milestones", () => {
    const items = buildActivationChecklist({
      campaigns: [
        { campaign_name: "Test", strategy: "S", sms_whatsapp_template: "M" },
      ],
      plan: {
        mini_site_data: { publish_status: "published", hero_slogan: "Merhaba" },
      } as never,
      business: { name: "Demo" } as never,
      hasCustomers: true,
    });

    assert.equal(items.length, 7);
    assert.equal(activationProgress(items), 43);
    assert.equal(
      items.find((item) => item.id === "first_campaign")?.completed,
      true,
    );
  });

  it("respects seven-day activation window", () => {
    const activatedAt = "2026-07-01T10:00:00.000Z";
    assert.equal(
      isWithinActivationWindow(
        activatedAt,
        new Date("2026-07-05T10:00:00.000Z"),
      ),
      true,
    );
    assert.equal(
      isWithinActivationWindow(
        activatedAt,
        new Date("2026-07-15T10:00:00.000Z"),
      ),
      false,
    );
  });

  it("formats usage labels", () => {
    assert.equal(
      formatUsageLabel({
        used: 2,
        limit: 3,
        remaining: 1,
        period_key: "2026-07-06",
      }),
      "2/3",
    );
    assert.equal(
      formatUsageLabel({
        used: 0,
        limit: null,
        remaining: null,
        period_key: null,
      }),
      "Sınırsız",
    );
  });

  it("wires dashboard and ai client surfaces", () => {
    const dashboardSource = readSource("app/dashboard/page.tsx");
    const usageSource = readSource("lib/pro-funnel.ts");
    const aiClientSource = readSource("lib/ai-client.ts");

    assert.match(dashboardSource, /useAiUsage/);
    assert.match(dashboardSource, /useProActivationChecklist/);
    assert.match(dashboardSource, /ProActivationChecklist/);
    assert.match(dashboardSource, /canUseAi=\{canUseAi\}/);
    assert.match(usageSource, /FREE_AI_DAILY_LIMIT/);
    assert.match(aiClientSource, /fetchAiUsage/);
    assert.match(aiClientSource, /confirmProCheckout/);
  });
});