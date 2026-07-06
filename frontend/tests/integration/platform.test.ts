import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { resolveBusinessAccess, roleLabel } from "../../lib/platform/access";

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

  it("wires dashboard platform surfaces", () => {
    const dashboardSource = readSource("app/dashboard/page.tsx");
    const sessionSource = readSource("hooks/useDashboardSession.ts");
    const leadSource = readSource("app/site/[id]/LeadForm.tsx");

    assert.match(dashboardSource, /PlatformTab/);
    assert.match(dashboardSource, /BusinessSwitcher/);
    assert.match(dashboardSource, /platformAccess/);
    assert.match(sessionSource, /switchBusiness/);
    assert.match(sessionSource, /fetchDashboardContext/);
    assert.match(leadSource, /triggerBusinessWebhooks/);
    assert.match(leadSource, /logAuditEvent/);
  });
});