import { supabase } from "@/lib/supabase";
import type { Campaign } from "@/lib/domain-types";
import { isMissingTableError } from "./errors";
import { getCampaignsFromPlan } from "@/lib/plan-utils";
import { stripLegacyMiniSiteField } from "./plan-legacy";

interface CampaignRow {
  id: string;
  business_id: string;
  campaign_name: string;
  strategy: string;
  sms_whatsapp_template: string;
  sort_order: number;
  created_at: string;
  updated_at: string | null;
}

function rowToCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    campaign_name: row.campaign_name,
    strategy: row.strategy,
    sms_whatsapp_template: row.sms_whatsapp_template,
  };
}

function campaignToRow(
  businessId: string,
  campaign: Campaign,
  sortOrder: number,
): Omit<CampaignRow, "created_at" | "updated_at"> & {
  created_at?: string;
  updated_at?: string;
} {
  return {
    id: campaign.id || crypto.randomUUID(),
    business_id: businessId,
    campaign_name: campaign.campaign_name,
    strategy: campaign.strategy,
    sms_whatsapp_template: campaign.sms_whatsapp_template,
    sort_order: sortOrder,
    updated_at: new Date().toISOString(),
  };
}

async function loadLegacyCampaigns(businessId: string): Promise<Campaign[]> {
  const { data } = await supabase
    .from("generated_plans")
    .select("campaigns, mini_site_data")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return getCampaignsFromPlan(data ?? undefined);
}

async function replaceAllInTable(
  businessId: string,
  campaigns: Campaign[],
): Promise<boolean> {
  const { error: deleteError } = await supabase
    .from("campaigns")
    .delete()
    .eq("business_id", businessId);

  if (deleteError) return false;
  if (campaigns.length === 0) return true;

  const rows = campaigns.map((campaign, index) =>
    campaignToRow(businessId, campaign, index),
  );
  const { error: insertError } = await supabase.from("campaigns").insert(rows);
  return !insertError;
}

async function persistLegacyCampaigns(
  businessId: string,
  campaigns: Campaign[],
): Promise<boolean> {
  const { data: existingPlan } = await supabase
    .from("generated_plans")
    .select("id, mini_site_data")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingPlan?.id) {
    const miniSiteData = {
      ...((existingPlan.mini_site_data as Record<string, unknown> | null) || {}),
      campaigns,
    };
    const { error } = await supabase
      .from("generated_plans")
      .update({ campaigns, mini_site_data: miniSiteData })
      .eq("id", existingPlan.id);
    return !error;
  }

  const { error } = await supabase.from("generated_plans").insert([
    {
      business_id: businessId,
      campaigns,
      mini_site_data: { campaigns },
      social_media_calendar: [],
      whatsapp_templates: [],
    },
  ]);
  return !error;
}

export async function listCampaigns(businessId: string): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("business_id", businessId)
    .order("sort_order", { ascending: true });

  if (!isMissingTableError(error) && !error) {
    if (data && data.length > 0) {
      return (data as CampaignRow[]).map(rowToCampaign);
    }

    const legacy = await loadLegacyCampaigns(businessId);
    if (legacy.length > 0) {
      await replaceAllInTable(businessId, legacy);
      await stripLegacyMiniSiteField(businessId, "campaigns");
      return legacy;
    }
    return [];
  }

  return loadLegacyCampaigns(businessId);
}

export async function saveCampaigns(
  businessId: string,
  campaigns: Campaign[],
): Promise<boolean> {
  const savedToTable = await replaceAllInTable(businessId, campaigns);
  if (savedToTable) {
    await stripLegacyMiniSiteField(businessId, "campaigns");
    return true;
  }
  return persistLegacyCampaigns(businessId, campaigns);
}