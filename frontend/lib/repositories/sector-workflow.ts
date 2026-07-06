import { supabase } from "@/lib/supabase";
import type { SectorWorkflowItem } from "@/lib/domain-types";
import { isMissingTableError } from "./errors";
import { loadLegacyMiniSiteData } from "./plan-legacy";
import { commitTableWrite } from "./table-store";

interface SectorWorkflowRow {
  id: string;
  business_id: string;
  pack_id: string;
  title: string;
  customer: string;
  detail: string | null;
  value: number | null;
  stage: string;
  created_at: string;
}

function rowToItem(row: SectorWorkflowRow): SectorWorkflowItem {
  return {
    id: row.id,
    packId: row.pack_id,
    title: row.title,
    customer: row.customer,
    detail: row.detail ?? undefined,
    value: row.value ?? undefined,
    stage: row.stage,
    createdAt: row.created_at,
  };
}

function itemToRow(
  businessId: string,
  item: SectorWorkflowItem,
): SectorWorkflowRow {
  return {
    id: item.id,
    business_id: businessId,
    pack_id: item.packId,
    title: item.title,
    customer: item.customer,
    detail: item.detail ?? null,
    value: item.value ?? null,
    stage: item.stage,
    created_at: item.createdAt,
  };
}

async function replacePackItemsInTable(
  businessId: string,
  packId: string,
  packItems: SectorWorkflowItem[],
  otherPackItems: SectorWorkflowItem[],
): Promise<boolean> {
  const { error: deleteError } = await supabase
    .from("sector_workflow_items")
    .delete()
    .eq("business_id", businessId)
    .eq("pack_id", packId);

  if (deleteError) return false;

  const allItems = [...packItems, ...otherPackItems];
  if (allItems.length === 0) return true;

  const { error: insertError } = await supabase
    .from("sector_workflow_items")
    .insert(allItems.map((item) => itemToRow(businessId, item)));

  return !insertError;
}

async function listAllFromTable(
  businessId: string,
): Promise<SectorWorkflowItem[] | null> {
  const { data, error } = await supabase
    .from("sector_workflow_items")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (isMissingTableError(error) || error) return null;
  return (data as SectorWorkflowRow[]).map(rowToItem);
}

export async function listSectorWorkflowItems(
  businessId: string,
  packId: string,
): Promise<SectorWorkflowItem[]> {
  const tableItems = await listAllFromTable(businessId);

  if (tableItems !== null) {
    const packItems = tableItems.filter((item) => item.packId === packId);
    if (packItems.length > 0 || tableItems.length > 0) {
      return packItems;
    }

    const legacy = await loadLegacyMiniSiteData(businessId);
    const legacyItems = Array.isArray(legacy.sector_workflow_items)
      ? legacy.sector_workflow_items
      : [];
    if (legacyItems.length > 0) {
      const legacyPackItems = legacyItems.filter(
        (item) => item.packId === packId,
      );
      const otherPackItems = legacyItems.filter(
        (item) => item.packId !== packId,
      );
      await replacePackItemsInTable(
        businessId,
        packId,
        legacyPackItems,
        otherPackItems,
      );
      await commitTableWrite(businessId, true, "sector_workflow_items");
      return legacyPackItems;
    }
    return [];
  }

  const legacy = await loadLegacyMiniSiteData(businessId);
  return Array.isArray(legacy.sector_workflow_items)
    ? legacy.sector_workflow_items.filter((item) => item.packId === packId)
    : [];
}

export async function saveSectorWorkflowItems(
  businessId: string,
  packId: string,
  packItems: SectorWorkflowItem[],
): Promise<boolean> {
  const tableItems = await listAllFromTable(businessId);
  if (tableItems === null) return false;

  const otherPackItems = tableItems.filter((item) => item.packId !== packId);
  return commitTableWrite(
    businessId,
    await replacePackItemsInTable(
      businessId,
      packId,
      packItems,
      otherPackItems,
    ),
    "sector_workflow_items",
  );
}