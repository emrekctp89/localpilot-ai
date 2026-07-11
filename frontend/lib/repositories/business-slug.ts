import { supabase } from "@/lib/supabase";
import type { Business } from "@/lib/domain-types";
import {
  isValidSiteSlug,
  suggestSiteSlugFromName,
} from "@/lib/mini-site-domain";

/**
 * If the business has no site_slug, allocate a unique one from its name
 * and persist. Safe no-op when column missing or not owner.
 */
export async function ensureBusinessSiteSlug(
  business: Business | null | undefined,
): Promise<Business | null> {
  if (!business?.id) return business ?? null;
  if (business.site_slug?.trim()) return business;

  const base = suggestSiteSlugFromName(business.name);
  if (!base) return business;

  const candidates = [base];
  for (let i = 2; i <= 12; i += 1) {
    const suffix = `-${i}`;
    const trimmed = base.slice(0, Math.max(2, 48 - suffix.length)).replace(/-+$/, "");
    candidates.push(`${trimmed}${suffix}`);
  }

  for (const candidate of candidates) {
    if (!isValidSiteSlug(candidate)) continue;

    const { data: existing, error: lookupError } = await supabase
      .from("businesses")
      .select("id")
      .eq("site_slug", candidate)
      .neq("id", business.id)
      .limit(1);

    if (lookupError) {
      // Column missing or RLS — stop quietly
      return business;
    }
    if (existing && existing.length > 0) continue;

    const { data: updated, error: updateError } = await supabase
      .from("businesses")
      .update({ site_slug: candidate })
      .eq("id", business.id)
      .select("*")
      .maybeSingle();

    if (updateError || !updated) {
      return business;
    }

    return updated as Business;
  }

  return business;
}
