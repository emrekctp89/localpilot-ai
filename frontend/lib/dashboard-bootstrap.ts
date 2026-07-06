import { supabase } from "./supabase";
import { getCampaignsFromPlan } from "./plan-utils";
import type { Business, Campaign, GeneratedPlan } from "./domain-types";
import { listCampaigns } from "./repositories/campaigns";
import {
  fetchUserProfile,
  getBusinessMemberRecord,
  listAccessibleBusinesses,
  type UserProfileSnapshot,
} from "./repositories/business-access";
import {
  resolveBusinessAccess,
  type BusinessAccess,
} from "./platform/access";

export interface DashboardBootstrapResult {
  plan: GeneratedPlan | null;
  campaigns: Campaign[];
}

export interface DashboardContextResult extends UserProfileSnapshot {
  businesses: Business[];
  business: Business | null;
  platformAccess: BusinessAccess;
}

export async function fetchProfileAndBusiness(userId: string) {
  const context = await fetchDashboardContext(userId);
  return {
    isPro: context.isPro,
    proActivatedAt: context.proActivatedAt,
    business: context.business,
    profileRole: context.profileRole,
    businesses: context.businesses,
    platformAccess: context.platformAccess,
    profileError: null,
    businessError: null,
  };
}

export async function fetchDashboardContext(
  userId: string,
  preferredBusinessId?: string | null,
): Promise<DashboardContextResult> {
  const [profile, businesses] = await Promise.all([
    fetchUserProfile(userId),
    listAccessibleBusinesses(userId),
  ]);

  const business =
    businesses.find((item) => item.id === preferredBusinessId) ??
    businesses[0] ??
    null;

  const memberRecord = business?.id
    ? await getBusinessMemberRecord(business.id, userId)
    : null;

  const platformAccess = resolveBusinessAccess(
    userId,
    business,
    memberRecord,
    profile.profileRole,
  );

  return {
    ...profile,
    businesses,
    business,
    platformAccess,
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