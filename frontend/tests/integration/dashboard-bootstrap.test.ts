import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(testDirectory, "../..");

describe("dashboard bootstrap", () => {
  it("loads profile, business, plan and campaigns in parallel helpers", async () => {
    const [bootstrapSource, sessionSource] = await Promise.all([
      readFile(path.join(frontendRoot, "lib/dashboard-bootstrap.ts"), "utf8"),
      readFile(path.join(frontendRoot, "hooks/useDashboardSession.ts"), "utf8"),
    ]);

    assert.match(bootstrapSource, /fetchProfileAndBusiness/);
    assert.match(bootstrapSource, /loadDashboardBootstrap/);
    assert.match(bootstrapSource, /Promise\.all/);
    assert.match(sessionSource, /fetchProfileAndBusiness/);
    assert.match(sessionSource, /loadDashboardBootstrap/);
  });
});