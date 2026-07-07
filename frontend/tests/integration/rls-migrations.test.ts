import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const migrationsDir = join(repoRoot, "supabase/migrations");

function readMigration(name: string) {
  return readFileSync(join(migrationsDir, name), "utf8");
}

describe("RLS and migration integrity (Faz B)", () => {
  it("ships migrations 001 through 009 in order", () => {
    const files = readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();
    assert.deepEqual(files, [
      "001_operational_tables.sql",
      "002_core_rls.sql",
      "003_campaigns_content.sql",
      "004_crm_activities.sql",
      "005_ai_usage.sql",
      "006_platform.sql",
      "007_fix_rls_recursion.sql",
      "008_schema_migrations.sql",
      "009_business_integrations.sql",
    ]);
  });

  it("defines security definer helpers to avoid RLS recursion", () => {
    const sql = readMigration("007_fix_rls_recursion.sql");
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.user_owns_business/);
    assert.match(sql, /SECURITY DEFINER/);
    assert.match(sql, /user_is_business_member/);
    assert.match(sql, /user_can_access_business/);
    assert.match(sql, /user_can_write_business/);
    assert.match(sql, /businesses_member_select/);
  });

  it("includes schema verification script for production", () => {
    const verify = readFileSync(
      join(repoRoot, "supabase/scripts/verify_schema.sql"),
      "utf8",
    );
    assert.match(verify, /ai_usage_counters/);
    assert.match(verify, /user_owns_business/);
    assert.match(verify, /business_members/);
  });
});