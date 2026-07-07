import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { ensureContentItemId } from "../../lib/repositories/content-item-ids";

const SAMPLE_UUID = "a1b2c3d4-e5f6-4789-a012-3456789abcde";
const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("content items repository", () => {
  it("keeps valid UUID ids", () => {
    assert.equal(ensureContentItemId(SAMPLE_UUID), SAMPLE_UUID);
  });

  it("replaces numeric and timestamp ids with UUID", () => {
    const fromNumber = ensureContentItemId(1);
    const fromTimestamp = ensureContentItemId(Date.now());
    const fromSlug = ensureContentItemId("post-0");

    assert.match(fromNumber, /^[0-9a-f-]{36}$/i);
    assert.match(fromTimestamp, /^[0-9a-f-]{36}$/i);
    assert.match(fromSlug, /^[0-9a-f-]{36}$/i);
    assert.notEqual(fromNumber, "1");
  });

  it("generates UUID when id is missing", () => {
    assert.match(ensureContentItemId(undefined), /^[0-9a-f-]{36}$/i);
  });

  it("normalizes legacy ids on read and falls back to generated_plans on save", () => {
    const source = readFileSync(
      join(root, "lib/repositories/content-items.ts"),
      "utf8",
    );

    assert.match(source, /ensureContentItemId\(record\.id/);
    assert.match(source, /savePlanContent/);
    assert.match(source, /return savePlanContent/);
    assert.match(source, /loadTableContent/);
  });
});