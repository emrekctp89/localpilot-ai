import { supabase } from "./supabase";
import { getCampaignsFromPlan } from "./plan-utils";
import { readCachedBusiness } from "./dashboard-session-storage";
import type { Business, Campaign, GeneratedPlan } from "./domain-types";
import { listCampaigns } from "./repositories/campaigns";
import {
  fetchBusinessById,
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
  loadError: string | null;
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
    profileError: context.loadError,
    businessError: context.loadError,
  };
}

async function resolveActiveBusiness(
  userId: string,
  businesses: Business[],
  preferredBusinessId?: string | null,
): Promise<{ business: Business | null; businesses: Business[]; error: string | null }> {
  let resolved =
    businesses.find((item) => item.id === preferredBusinessId) ??
    businesses[0] ??
    null;
  let error: string | null = null;

  if (!resolved?.id && preferredBusinessId) {
    const direct = await fetchBusinessById(preferredBusinessId);
    error = direct.error;
    if (direct.business?.id) {
      resolved = direct.business;
      if (!businesses.some((item) => item.id === direct.business?.id)) {
        businesses = [direct.business, ...businesses];
      }
    }
  }

  if (!resolved?.id) {
    const cached = readCachedBusiness<Business>(userId);
    if (cached?.id) {
      resolved = cached;
      if (!businesses.some((item) => item.id === cached.id)) {
        businesses = [cached, ...businesses];
      }
    }
  }

  return { business: resolved, businesses, error };
}

export async function fetchDashboardContext(
  userId: string,
  preferredBusinessId?: string | null,
): Promise<DashboardContextResult> {
  const [profile, businessList] = await Promise.all([
    fetchUserProfile(userId),
    listAccessibleBusinesses(userId),
  ]);

  const resolved = await resolveActiveBusiness(
    userId,
    businessList.businesses,
    preferredBusinessId,
  );

  const business = resolved.business;
  const businesses = resolved.businesses;

  const memberRecord = business?.id
    ? await getBusinessMemberRecord(business.id, userId)
    : null;

  const platformAccess = resolveBusinessAccess(
    userId,
    business,
    memberRecord,
    profile.profileRole,
  );

  const loadError = [businessList.error, resolved.error]
    .filter(Boolean)
    .join(" | ") || null;

  return {
    ...profile,
    businesses,
    business,
    platformAccess,
    loadError,
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