/**
 * Günlük sektör otomasyon taraması (Faz D).
 * GitHub Actions cron veya yerel: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY gerekir.
 */
import { createClient } from "@supabase/supabase-js";
import { dispatchBusinessWebhook } from "../lib/platform/webhooks";
import { getActiveSectorAutomations, resolveSectorPack } from "../lib/sector-packs";
import type { Business, SectorWorkflowItem } from "../lib/domain-types";

const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY ortam değişkenleri gerekli.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface BusinessRow {
  id: string;
  name: string;
  industry: string | null;
  sector: string | null;
  city: string | null;
  whatsapp_number: string | null;
}

interface WebhookRow {
  business_id: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
}

interface SectorItemRow {
  business_id: string;
  id: string;
  pack_id: string;
  title: string;
  customer: string;
  detail: string | null;
  value: number | null;
  stage: string;
  created_at: string;
}

function rowToWorkflowItem(row: SectorItemRow): SectorWorkflowItem {
  return {
    id: row.id,
    packId: row.pack_id,
    title: row.title,
    customer: row.customer,
    detail: row.detail ?? undefined,
    value: row.value ?? undefined,
    stage: row.stage,
    createdAt: row.created_at,
  };
}

async function main() {
  const { data: businesses, error: businessError } = await supabase
    .from("businesses")
    .select("id, name, industry, sector, city, whatsapp_number");

  if (businessError) {
    console.error("businesses_query_failed", businessError.message);
    process.exit(1);
  }

  const { data: webhooks, error: webhookError } = await supabase
    .from("business_webhooks")
    .select("business_id, url, secret, events, active")
    .eq("active", true);

  if (webhookError) {
    console.error("webhooks_query_failed", webhookError.message);
    process.exit(1);
  }

  const hooksByBusiness = new Map<string, WebhookRow[]>();
  for (const hook of (webhooks as WebhookRow[]) || []) {
    if (!hook.events.includes("sector.automation.triggered")) continue;
    const current = hooksByBusiness.get(hook.business_id) || [];
    current.push(hook);
    hooksByBusiness.set(hook.business_id, current);
  }

  let scanned = 0;
  let triggered = 0;

  for (const business of (businesses as BusinessRow[]) || []) {
    const businessHooks = hooksByBusiness.get(business.id);
    if (!businessHooks?.length) continue;

    const { data: itemRows, error: itemsError } = await supabase
      .from("sector_workflow_items")
      .select(
        "business_id, id, pack_id, title, customer, detail, value, stage, created_at",
      )
      .eq("business_id", business.id);

    if (itemsError) {
      console.warn(`items_skip business=${business.id} err=${itemsError.message}`);
      continue;
    }

    scanned += 1;
    const items = ((itemRows as SectorItemRow[]) || []).map(rowToWorkflowItem);
    const pack = resolveSectorPack(business as Business);
    const automations = getActiveSectorAutomations(pack, items);

    if (automations.length === 0) continue;

    const payload = {
      event: "sector.automation.triggered" as const,
      business_id: business.id,
      occurred_at: new Date().toISOString(),
      data: {
        source: "cron",
        pack_id: pack.id,
        automations: automations.map((automation) => ({
          id: automation.id,
          title: automation.title,
          affected_count: automation.affectedCount,
          suggested_action: automation.suggestedAction,
        })),
      },
    };

    for (const hook of businessHooks) {
      const ok = await dispatchBusinessWebhook({
        url: hook.url,
        secret: hook.secret,
        payload,
      });
      if (ok) triggered += 1;
    }
  }

  console.log(
    JSON.stringify({
      ok: true,
      businesses_scanned: scanned,
      webhook_deliveries: triggered,
    }),
  );
}

main().catch((error) => {
  console.error("sector_automation_cron_failed", error);
  process.exit(1);
});