import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildPartnerDashboardStats,
  buildReferralLink,
  calculateCommissionAmount,
  generateReferralCode,
  normalizeReferralCode,
  PARTNER_COMMISSION_RATES,
} from "../../lib/partner-program";
import { captureReferralFromSearch } from "../../lib/referral-storage";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("partner program integration", () => {
  it("defines referral and agency commission rates", () => {
    assert.equal(PARTNER_COMMISSION_RATES.referral, 1000);
    assert.equal(PARTNER_COMMISSION_RATES.agency, 2000);
  });

  it("normalizes referral codes and builds auth links", () => {
    assert.equal(normalizeReferralCode(" lp-abc123 "), "LP-ABC123");
    assert.match(buildReferralLink("LP-ABC123", "https://app.test"), /ref=LP-ABC123/);
  });

  it("calculates commission payouts", () => {
    assert.equal(calculateCommissionAmount(299, 1000), 29.9);
    assert.equal(calculateCommissionAmount(2990, 2000), 598);
  });

  it("aggregates partner dashboard stats", () => {
    const stats = buildPartnerDashboardStats(
      [
        {
          id: "a1",
          partner_user_id: "p1",
          referred_user_id: "u1",
          referral_code: "LP-AAA",
          status: "converted",
        },
        {
          id: "a2",
          partner_user_id: "p1",
          referred_user_id: "u2",
          referral_code: "LP-AAA",
          status: "pending",
        },
      ],
      [
        {
          id: "c1",
          partner_user_id: "p1",
          attribution_id: "a1",
          event_type: "pro_activation",
          gross_amount_try: 299,
          commission_rate_bps: 1000,
          commission_amount_try: 29.9,
          status: "pending",
        },
        {
          id: "c2",
          partner_user_id: "p1",
          attribution_id: "a1",
          event_type: "pro_activation",
          gross_amount_try: 2990,
          commission_rate_bps: 2000,
          commission_amount_try: 598,
          status: "paid",
        },
      ],
    );

    assert.equal(stats.totalReferrals, 2);
    assert.equal(stats.convertedReferrals, 1);
    assert.equal(stats.pendingCommissionTry, 29.9);
    assert.equal(stats.paidCommissionTry, 598);
  });

  it("captures referral query params into storage shape", () => {
    const code = captureReferralFromSearch("?ref=lp-test01");
    assert.equal(code, "LP-TEST01");
  });

  it("wires platform and dashboard partner surfaces", () => {
    const platformSource = readSource("app/components/dashboard/PlatformTab.tsx");
    const dashboardSource = readSource("app/dashboard/page.tsx");
    const migrationSource = readFileSync(
      join(root, "../supabase/migrations/010_partner_program.sql"),
      "utf8",
    );

    assert.match(platformSource, /PartnerProgramPanel/);
    assert.match(dashboardSource, /useReferralAttribution/);
    assert.match(migrationSource, /partner_profiles/);
    assert.match(migrationSource, /attribute_referral/);
    assert.equal(generateReferralCode().startsWith("LP-"), true);
  });
});