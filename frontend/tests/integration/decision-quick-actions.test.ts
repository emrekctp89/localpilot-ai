import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { getDecisionQuickActions } from "../../lib/decision-quick-actions";
import type { Business, DecisionCycle } from "../../lib/domain-types";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const business: Business = {
  id: "biz-1",
  name: "Yıldız Kuaför",
  industry: "Kuaför & Güzellik Salonu",
  city: "Düzce",
  whatsapp_number: "0555 111 22 33",
};

const approvedCycle = (
  recommendationKey: DecisionCycle["recommendationKey"],
): DecisionCycle => ({
  id: "c1",
  recommendationKey,
  signal: "test",
  analysis: "test",
  recommendation: "test öneri",
  expectedResult: "test sonuç",
  metric: "test",
  status: "onaylandi",
  createdAt: "2026-07-01T10:00:00.000Z",
});

describe("decision quick actions (Faz D)", () => {
  it("offers WhatsApp actions for message-type recommendations", () => {
    const actions = getDecisionQuickActions(
      approvedCycle("pending_payment"),
      business,
      { completedItemIds: [] },
    );

    assert.ok(actions.some((item) => item.kind === "whatsapp"));
    assert.ok(actions.some((item) => item.kind === "copy_text"));
  });

  it("offers Google actions for google_profile recommendation", () => {
    const actions = getDecisionQuickActions(
      approvedCycle("google_profile"),
      business,
      { completedItemIds: ["profile-claimed"] },
    );

    assert.ok(actions.some((item) => item.kind === "google_open"));
    assert.ok(actions.some((item) => item.tab === "google"));
  });

  it("returns no actions before approval", () => {
    const actions = getDecisionQuickActions(
      { ...approvedCycle("pending_payment"), status: "oneri" },
      business,
      { completedItemIds: [] },
    );
    assert.equal(actions.length, 0);
  });

  it("wires Karar Merkezi tab to quick actions", () => {
    const source = readFileSync(
      join(root, "app/components/dashboard/KararMerkeziTab.tsx"),
      "utf8",
    );
    assert.match(source, /getDecisionQuickActions/);
    assert.match(source, /Tek Tık Aksiyon/);
    assert.match(source, /triggerBusinessWebhooks/);
  });
});