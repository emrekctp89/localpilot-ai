import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { isLegacyDualReadEnabled } from "../../lib/repositories/legacy-config";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("legacy dual-read (Faz C)", () => {
  it("defaults to enabled when env flag is unset", () => {
    const previous = process.env.NEXT_PUBLIC_DISABLE_LEGACY_DUAL_READ;
    delete process.env.NEXT_PUBLIC_DISABLE_LEGACY_DUAL_READ;
    assert.equal(isLegacyDualReadEnabled(), true);
    if (previous === undefined) {
      delete process.env.NEXT_PUBLIC_DISABLE_LEGACY_DUAL_READ;
    } else {
      process.env.NEXT_PUBLIC_DISABLE_LEGACY_DUAL_READ = previous;
    }
  });

  it("disables legacy reads when env flag is true", () => {
    const previous = process.env.NEXT_PUBLIC_DISABLE_LEGACY_DUAL_READ;
    process.env.NEXT_PUBLIC_DISABLE_LEGACY_DUAL_READ = "true";
    assert.equal(isLegacyDualReadEnabled(), false);
    if (previous === undefined) {
      delete process.env.NEXT_PUBLIC_DISABLE_LEGACY_DUAL_READ;
    } else {
      process.env.NEXT_PUBLIC_DISABLE_LEGACY_DUAL_READ = previous;
    }
  });

  it("gates plan-legacy loader behind legacy config", () => {
    const source = readSource("lib/repositories/plan-legacy.ts");
    assert.match(source, /isLegacyDualReadEnabled/);
    assert.match(source, /legacy-config/);
  });

  it("gates direct legacy loaders behind legacy config", () => {
    for (const relativePath of [
      "lib/repositories/campaigns.ts",
      "lib/repositories/content-items.ts",
    ]) {
      const source = readSource(relativePath);
      assert.match(source, /isLegacyDualReadEnabled/);
      assert.match(source, /legacy-config/);
    }
  });

  it("documents disable flag in env template", () => {
    const template = readFileSync(
      join(root, "../deploy/production.env.template"),
      "utf8",
    );
    assert.match(template, /DISABLE_LEGACY_DUAL_READ/);
  });
});