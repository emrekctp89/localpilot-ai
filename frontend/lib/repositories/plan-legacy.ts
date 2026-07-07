import { supabase } from "@/lib/supabase";
import type { MiniSiteData } from "@/lib/domain-types";
import { isLegacyDualReadEnabled } from "./legacy-config";

const MIGRATED_MINI_SITE_FIELDS: (keyof MiniSiteData)[] = [
  "appointments",
  "orders",
  "tasks",
  "decision_cycles",
  "google_business_checklist",
  "sector_workflow_items",
  "crm_follow_ups",
  "campaigns",
];

export async function loadLegacyMiniSiteData(
  businessId: string,
): Promise<MiniSiteData> {
  if (!isLegacyDualReadEnabled()) {
    return {};
  }

  const { data } = await supabase
    .from("generated_plans")
    .select("mini_site_data")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.mini_site_data as MiniSiteData | null) || {};
}

export async function updateLegacyMiniSiteData(
  businessId: string,
  updater: (current: MiniSiteData) => MiniSiteData,
): Promise<boolean> {
  const { data: planData, error: findError } = await supabase
    .from("generated_plans")
    .select("id, mini_site_data")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) return false;

  const currentData =
    (planData?.mini_site_data as MiniSiteData | null) || {};
  const nextData = updater(currentData);

  const { error } = planData?.id
    ? await supabase
        .from("generated_plans")
        .update({ mini_site_data: nextData })
        .eq("id", planData.id)
    : await supabase.from("generated_plans").insert([
        {
          business_id: businessId,
          mini_site_data: nextData,
          social_media_calendar: [],
          whatsapp_templates: [],
        },
      ]);

  return !error;
}

export async function stripLegacyMiniSiteField(
  businessId: string,
  field: keyof MiniSiteData,
): Promise<void> {
  await updateLegacyMiniSiteData(businessId, (current) => {
    if (!(field in current)) return current;
    const next = { ...current };
    delete next[field];
    return next;
  });
}

export async function stripMigratedOperationalFields(
  businessId: string,
): Promise<boolean> {
  return updateLegacyMiniSiteData(businessId, (current) => {
    const next = { ...current };
    let changed = false;

    for (const field of MIGRATED_MINI_SITE_FIELDS) {
      if (field in next) {
        delete next[field];
        changed = true;
      }
    }

    return changed ? next : current;
  });
}