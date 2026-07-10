import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { resolveBusinessAccess, roleLabel } from "../../lib/platform/access";
import { buildMultiBusinessBillingSummary } from "../../lib/platform/billing";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("platform integration", () => {
  it("resolves owner, staff and read-only access", () => {
    const ownerAccess = resolveBusinessAccess(
      "user-1",
      { id: "biz-1", owner_id: "user-1" },
      null,
      "agency",
    );
    assert.equal(ownerAccess.canWrite, true);
    assert.equal(ownerAccess.canManageTeam, true);
    assert.equal(ownerAccess.isAgencyAccount, true);

    const staffAccess = resolveBusinessAccess(
      "user-2",
      { id: "biz-1", owner_id: "user-1" },
      {
        id: "m1",
        business_id: "biz-1",
        user_id: "user-2",
        role: "staff",
        invited_email: null,
      },
      "owner",
    );
    assert.equal(staffAccess.canWrite, true);
    assert.equal(staffAccess.canManageTeam, false);

    const readOnlyAccess = resolveBusinessAccess(
      "user-3",
      { id: "biz-1", owner_id: "user-1" },
      {
        id: "m2",
        business_id: "biz-1",
        user_id: "user-3",
        role: "read_only",
        invited_email: null,
      },
      "owner",
    );
    assert.equal(readOnlyAccess.canWrite, false);
  });

  it("localizes role labels", () => {
    assert.equal(roleLabel("staff", "tr"), "Personel");
    assert.equal(roleLabel("read_only", "en"), "Read-only");
  });

  it("builds multi-business billing summaries for Faz G", () => {
    const access = resolveBusinessAccess(
      "agency-1",
      { id: "biz-1", owner_id: "agency-1" },
      null,
      "agency",
    );
    const summary = buildMultiBusinessBillingSummary(
      [
        { id: "biz-1", owner_id: "agency-1", name: "Kuaför" },
        { id: "biz-2", owner_id: "agency-1", name: "Galeri" },
        { id: "biz-3", owner_id: "agency-1", name: "Tesisat" },
      ],
      access,
    );

    assert.equal(summary.mode, "agency_portfolio");
    assert.equal(summary.businessCount, 3);
    assert.equal(summary.additionalBusinessCount, 2);
    assert.equal(summary.monthlyTotalTry, 897);
    assert.equal(summary.yearlyTotalTry, 8970);
    assert.equal(summary.recommendedInterval, "yearly");
  });

  it("wires dashboard platform surfaces", () => {
    const dashboardSource = readSource("app/dashboard/page.tsx");
    const sessionSource = readSource("hooks/useDashboardSession.ts");
    const leadSource = readSource("app/site/[id]/LeadForm.tsx");
    const platformSource = readSource("app/components/dashboard/PlatformTab.tsx");

    assert.match(dashboardSource, /PlatformTab/);
    assert.match(dashboardSource, /BusinessSwitcher/);
    assert.match(dashboardSource, /platformAccess/);
    assert.match(platformSource, /billingSummary/);
    assert.match(platformSource, /checkout onayı olmadan yapılmaz/);
    assert.match(sessionSource, /switchBusiness/);
    assert.match(sessionSource, /fetchDashboardContext/);
    assert.match(leadSource, /triggerBusinessWebhooks/);
    assert.match(leadSource, /logAuditEvent/);
  });
});
