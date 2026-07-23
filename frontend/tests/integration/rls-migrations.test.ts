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
  it("ships migrations 001 through 018 in order", () => {
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
      "010_partner_program.sql",
      "011_commission_admin.sql",
      "012_mini_site_domains.sql",
      "013_resolve_mini_site_domain.sql",
      "014_manual_pro_commission.sql",
      "015_backfill_site_slugs.sql",
      "016_public_mini_site_read.sql",
      "017_business_notifications.sql",
      "018_notifications_realtime.sql",
    ]);
  });

  it("defines business notifications table and public lead RPC", () => {
    const sql = readMigration("017_business_notifications.sql");
    assert.match(sql, /business_notifications/);
    assert.match(sql, /notify_business_lead/);
    assert.match(sql, /lead\.created/);
    assert.match(sql, /SECURITY DEFINER/);
  });

  it("enables realtime publication for business_notifications", () => {
    const sql = readMigration("018_notifications_realtime.sql");
    assert.match(sql, /supabase_realtime/);
    assert.match(sql, /business_notifications/);
    assert.match(sql, /REPLICA IDENTITY FULL/);
  });

  it("defines public mini-site resolve RPC for anonymous visitors", () => {
    const sql = readMigration("016_public_mini_site_read.sql");
    assert.match(sql, /resolve_public_mini_site/);
    assert.match(sql, /business_exists/);
    assert.match(sql, /SECURITY DEFINER/);
    assert.match(sql, /customers_public_insert/);
  });

  it("backfills site_slug with TR-aware normalizer", () => {
    const sql = readMigration("015_backfill_site_slugs.sql");
    assert.match(sql, /lp_normalize_site_slug/);
    assert.match(sql, /lp_backfill_business_site_slugs/);
    assert.match(sql, /SELECT public\.lp_backfill_business_site_slugs/);
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
    assert.match(verify, /businesses_site_slug/);
    assert.match(verify, /fn_resolve_mini_site_by_domain/);
    assert.match(verify, /fn_record_manual_pro_commission/);
    assert.match(verify, /fn_lp_normalize_site_slug/);
    assert.match(verify, /fn_lp_backfill_business_site_slugs/);
    assert.match(verify, /fn_resolve_public_mini_site/);
    assert.match(verify, /fn_business_exists/);
  });
});