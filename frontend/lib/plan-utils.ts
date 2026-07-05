import type { Campaign, GeneratedPlan } from "./domain-types";

export function getCampaignsFromPlan(
  planData: GeneratedPlan | null | undefined,
): Campaign[] {
  if (Array.isArray(planData?.campaigns)) return planData.campaigns;
  if (Array.isArray(planData?.mini_site_data?.campaigns)) {
    return planData.mini_site_data.campaigns;
  }
  return [];
}