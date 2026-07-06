import { supabase } from "./supabase";
import { getCampaignsFromPlan } from "./plan-utils";
import type { Business, Campaign, GeneratedPlan } from "./domain-types";
import { listCampaigns } from "./repositories/campaigns";

export interface DashboardBootstrapResult {
  plan: GeneratedPlan | null;
  campaigns: Campaign[];
}

export async function fetchProfileAndBusiness(userId: string) {
  const [profileResult, businessResult] = await Promise.all([
    supabase.from("profiles").select("is_pro").eq("id", userId).single(),
    supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    isPro: Boolean(profileResult.data?.is_pro),
    business: (businessResult.data as Business | null) ?? null,
    profileError: profileResult.error,
    businessError: businessResult.error,
  };
}

export async function loadDashboardBootstrap(
  businessId: string,
): Promise<DashboardBootstrapResult> {
  const [planResult, storedCampaigns] = await Promise.all([
    supabase
      .from("generated_plans")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    listCampaigns(businessId),
  ]);

  const plan = (planResult.data as GeneratedPlan | null) ?? null;

  return {
    plan,
    campaigns:
      storedCampaigns.length > 0
        ? storedCampaigns
        : getCampaignsFromPlan(plan ?? undefined),
  };
}