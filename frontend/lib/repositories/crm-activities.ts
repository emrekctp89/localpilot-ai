import { supabase } from "@/lib/supabase";
import type { CrmStatusHistoryItem, CustomerFollowUp } from "@/lib/domain-types";
import { isMissingTableError } from "./errors";
import { isLegacyDualReadEnabled } from "./legacy-config";
import { loadLegacyMiniSiteData } from "./plan-legacy";
import { commitTableWrite } from "./table-store";

interface CrmActivityRow {
  id: string;
  business_id: string;
  customer_id: string;
  follow_up_date: string | null;
  status_history: CrmStatusHistoryItem[];
  updated_at: string;
}

function rowToFollowUp(row: CrmActivityRow): CustomerFollowUp {
  return {
    followUpDate: row.follow_up_date || undefined,
    statusHistory: Array.isArray(row.status_history) ? row.status_history : [],
  };
}

function followUpToRow(
  businessId: string,
  customerId: string,
  followUp: CustomerFollowUp,
): Omit<CrmActivityRow, "id" | "updated_at"> & {
  id?: string;
  updated_at?: string;
} {
  return {
    business_id: businessId,
    customer_id: customerId,
    follow_up_date: followUp.followUpDate || null,
    status_history: followUp.statusHistory || [],
    updated_at: new Date().toISOString(),
  };
}

function rowsToRecord(rows: CrmActivityRow[]): Record<string, CustomerFollowUp> {
  return rows.reduce<Record<string, CustomerFollowUp>>((acc, row) => {
    acc[row.customer_id] = rowToFollowUp(row);
    return acc;
  }, {});
}

async function loadLegacyFollowUps(
  businessId: string,
): Promise<Record<string, CustomerFollowUp>> {
  if (!isLegacyDualReadEnabled()) {
    return {};
  }

  const legacy = await loadLegacyMiniSiteData(businessId);
  return legacy.crm_follow_ups || {};
}

async function replaceAllInTable(
  businessId: string,
  followUps: Record<string, CustomerFollowUp>,
): Promise<boolean> {
  const { error: deleteError } = await supabase
    .from("crm_activities")
    .delete()
    .eq("business_id", businessId);

  if (deleteError) return false;

  const entries = Object.entries(followUps);
  if (entries.length === 0) return true;

  const rows = entries.map(([customerId, followUp]) =>
    followUpToRow(businessId, customerId, followUp),
  );
  const { error: insertError } = await supabase.from("crm_activities").insert(rows);
  return !insertError;
}

export async function listCustomerFollowUps(
  businessId: string,
): Promise<Record<string, CustomerFollowUp>> {
  const { data, error } = await supabase
    .from("crm_activities")
    .select("*")
    .eq("business_id", businessId);

  if (!isMissingTableError(error) && !error) {
    if (data && data.length > 0) {
      return rowsToRecord(data as CrmActivityRow[]);
    }

    const legacy = await loadLegacyFollowUps(businessId);
    if (Object.keys(legacy).length > 0) {
      await replaceAllInTable(businessId, legacy);
      await commitTableWrite(businessId, true, "crm_follow_ups");
      return legacy;
    }
    return {};
  }

  if (!isLegacyDualReadEnabled()) {
    return {};
  }

  return loadLegacyFollowUps(businessId);
}

export async function saveCustomerFollowUps(
  businessId: string,
  followUps: Record<string, CustomerFollowUp>,
): Promise<boolean> {
  return commitTableWrite(
    businessId,
    await replaceAllInTable(businessId, followUps),
    "crm_follow_ups",
  );
}