import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(testDirectory, "../..");

describe("dashboard session payment return", () => {
  it("skips onboarding draft restore after stripe return", async () => {
    const [sessionSource, pageSource, storageSource] = await Promise.all([
      readFile(path.join(frontendRoot, "hooks/useDashboardSession.ts"), "utf8"),
      readFile(path.join(frontendRoot, "app/dashboard/page.tsx"), "utf8"),
      readFile(
        path.join(frontendRoot, "lib/dashboard-session-storage.ts"),
        "utf8",
      ),
    ]);

    assert.match(sessionSource, /readPaymentReturn/);
    assert.match(sessionSource, /shouldSkipDraft/);
    assert.match(sessionSource, /loadDashboardContextWithRetry/);
    assert.match(sessionSource, /businessRestorePending/);
    assert.match(sessionSource, /ensureSupabaseSession/);
    assert.match(pageSource, /shouldShowOnboarding/);
    assert.match(pageSource, /markEstablishedBusiness/);
    assert.match(storageSource, /hasEstablishedBusiness/);
    assert.match(storageSource, /cacheBusinessSnapshot/);
    assert.match(storageSource, /clearPaymentReturnFromUrl/);
    assert.match(sessionSource, /waitForSupabaseSession/);
    assert.match(sessionSource, /ensureSupabaseSession/);
  });
});