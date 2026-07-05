import { supabase } from "@/lib/supabase";
import type { MiniSiteData } from "@/lib/domain-types";

export async function loadLegacyMiniSiteData(
  businessId: string,
): Promise<MiniSiteData> {
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