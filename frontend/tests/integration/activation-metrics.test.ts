import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildActivationMetrics,
  buildDraftOnboardingRate,
  formatDurationHours,
  hoursBetween,
} from "../../lib/activation-metrics";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("activation metrics integration", () => {
  it("computes milestone durations from business creation", () => {
    const metrics = buildActivationMetrics({
      businessCreatedAt: "2026-07-01T10:00:00.000Z",
      profileCreatedAt: "2026-07-01T08:00:00.000Z",
      firstCustomerAt: "2026-07-02T10:00:00.000Z",
      firstAppointmentAt: null,
      firstCampaignAt: "2026-07-03T10:00:00.000Z",
      firstDecisionApprovalAt: "2026-07-04T12:00:00.000Z",
    });

    assert.equal(metrics.onboardingCompletionRate, 80);
    assert.equal(metrics.onboardingDurationLabel, "2 saat");
    assert.equal(
      metrics.milestones.find((item) => item.id === "first_customer")
        ?.durationLabel,
      "1 gün",
    );
    assert.equal(
      metrics.milestones.find((item) => item.id === "first_decision_approval")
        ?.completed,
      true,
    );
  });

  it("formats short and long durations", () => {
    assert.equal(formatDurationHours(0.5), "1 saatten kısa");
    assert.equal(formatDurationHours(26), "1 gün");
    assert.equal(formatDurationHours(50), "2 gün");
  });

  it("tracks draft onboarding completion by step", () => {
    assert.equal(buildDraftOnboardingRate(1), 20);
    assert.equal(buildDraftOnboardingRate(5), 100);
  });

  it("calculates hour deltas safely", () => {
    assert.equal(
      hoursBetween("2026-07-01T10:00:00.000Z", "2026-07-01T12:00:00.000Z"),
      2,
    );
    assert.equal(
      hoursBetween("2026-07-02T10:00:00.000Z", "2026-07-01T10:00:00.000Z"),
      null,
    );
  });

  it("wires summary tab and onboarding wizard surfaces", () => {
    const ozetSource = readSource("app/components/dashboard/OzetTab.tsx");
    const wizardSource = readSource(
      "app/components/dashboard/OnboardingWizard.tsx",
    );
    const repoSource = readSource("lib/repositories/activation-metrics.ts");

    assert.match(ozetSource, /AktivasyonMetrikleri/);
    assert.match(ozetSource, /useActivationMetrics/);
    assert.match(wizardSource, /buildDraftOnboardingRate/);
    assert.match(repoSource, /decision_cycles/);
    assert.match(repoSource, /firstCampaignAt/);
  });
});