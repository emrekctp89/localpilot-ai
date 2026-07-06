import { supabase } from "@/lib/supabase";
import type { GoogleBusinessChecklist } from "@/lib/domain-types";
import { isMissingTableError } from "./errors";
import { loadLegacyMiniSiteData } from "./plan-legacy";
import { commitTableWrite } from "./table-store";

interface GoogleChecklistRow {
  business_id: string;
  completed_item_ids: string[];
  updated_at: string | null;
}

const EMPTY_CHECKLIST: GoogleBusinessChecklist = {
  completedItemIds: [],
};

function rowToChecklist(row: GoogleChecklistRow): GoogleBusinessChecklist {
  return {
    completedItemIds: Array.isArray(row.completed_item_ids)
      ? row.completed_item_ids
      : [],
    updatedAt: row.updated_at ?? undefined,
  };
}

async function upsertInTable(
  businessId: string,
  checklist: GoogleBusinessChecklist,
): Promise<boolean> {
  const { error } = await supabase.from("google_checklists").upsert({
    business_id: businessId,
    completed_item_ids: checklist.completedItemIds,
    updated_at: checklist.updatedAt ?? new Date().toISOString(),
  });

  return !error;
}

export async function loadGoogleChecklist(
  businessId: string,
): Promise<GoogleBusinessChecklist> {
  const { data, error } = await supabase
    .from("google_checklists")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (!isMissingTableError(error) && !error) {
    if (data) {
      return rowToChecklist(data as GoogleChecklistRow);
    }

    const legacy = await loadLegacyMiniSiteData(businessId);
    const legacyChecklist = legacy.google_business_checklist;
    if (
      legacyChecklist &&
      Array.isArray(legacyChecklist.completedItemIds) &&
      legacyChecklist.completedItemIds.length > 0
    ) {
      await upsertInTable(businessId, legacyChecklist);
      await commitTableWrite(businessId, true, "google_business_checklist");
      return legacyChecklist;
    }
    return EMPTY_CHECKLIST;
  }

  const legacy = await loadLegacyMiniSiteData(businessId);
  return legacy.google_business_checklist ?? EMPTY_CHECKLIST;
}

export async function saveGoogleChecklist(
  businessId: string,
  checklist: GoogleBusinessChecklist,
): Promise<boolean> {
  return commitTableWrite(
    businessId,
    await upsertInTable(businessId, checklist),
    "google_business_checklist",
  );
}