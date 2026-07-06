import type { MiniSiteData } from "@/lib/domain-types";
import { stripLegacyMiniSiteField } from "./plan-legacy";

/** Persist only to relational tables; clears migrated JSON after success. */
export async function commitTableWrite(
  businessId: string,
  saved: boolean,
  legacyField?: keyof MiniSiteData,
): Promise<boolean> {
  if (!saved) return false;
  if (legacyField) {
    await stripLegacyMiniSiteField(businessId, legacyField);
  }
  return true;
}