import { supabase } from "@/lib/supabase";
import type { ActivationMetricSignals } from "@/lib/activation-metrics";
import { getCampaignsFromPlan } from "@/lib/plan-utils";
import type { GeneratedPlan } from "@/lib/domain-types";

async function fetchEarliestTimestamp(
  table: string,
  businessId: string,
  column = "created_at",
): Promise<string | null> {
  const { data, error } = await supabase
    .from(table)
    .select(column)
    .eq("business_id", businessId)
    .order(column, { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const value = data[column as keyof typeof data];
  return typeof value === "string" ? value : null;
}

export async function loadActivationMetricSignals(
  businessId: string,
  ownerId?: string,
): Promise<ActivationMetricSignals> {
  const [
    businessResult,
    profileResult,
    firstCustomerAt,
    firstAppointmentAt,
    storedCampaignAt,
    setupCampaignAt,
    firstDecisionApprovalAt,
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("created_at")
      .eq("id", businessId)
      .maybeSingle(),
    ownerId
      ? supabase
          .from("profiles")
          .select("created_at")
          .eq("id", ownerId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    fetchEarliestTimestamp("customers", businessId),
    fetchEarliestTimestamp("appointments", businessId),
    fetchEarliestTimestamp("campaigns", businessId),
    fetchSetupCampaignTimestamp(businessId),
    fetchEarliestApproval(businessId),
  ]);

  const firstCampaignAt = pickEarliestTimestamp(storedCampaignAt, setupCampaignAt);

  return {
    businessCreatedAt:
      (businessResult.data?.created_at as string | undefined) ?? null,
    profileCreatedAt:
      (profileResult.data?.created_at as string | undefined) ?? null,
    firstCustomerAt,
    firstAppointmentAt,
    firstCampaignAt,
    firstDecisionApprovalAt,
  };
}

function pickEarliestTimestamp(
  first: string | null,
  second: string | null,
): string | null {
  if (!first) return second;
  if (!second) return first;
  return new Date(first).getTime() <= new Date(second).getTime()
    ? first
    : second;
}

async function fetchSetupCampaignTimestamp(
  businessId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("generated_plans")
    .select("created_at, campaigns, mini_site_data")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const campaigns = getCampaignsFromPlan(data as GeneratedPlan);
  if (campaigns.length === 0) return null;
  return (data.created_at as string | undefined) ?? null;
}

async function fetchEarliestApproval(
  businessId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("decision_cycles")
    .select("approved_at, created_at")
    .eq("business_id", businessId)
    .eq("status", "onaylandi")
    .order("approved_at", { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return (data.approved_at as string | null) ?? (data.created_at as string | null);
}