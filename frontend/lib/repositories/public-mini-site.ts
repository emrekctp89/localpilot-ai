import { supabase } from "@/lib/supabase";
import type { Business, MiniSiteData, Product } from "@/lib/domain-types";

export interface PublicMiniSiteContext {
  business: Business | null;
  siteData: MiniSiteData;
  products: Product[];
  error?: string;
}

/**
 * Load public mini site via SECURITY DEFINER RPC (works for anonymous visitors).
 * Requires migration 016_public_mini_site_read.sql.
 */
export async function loadPublicMiniSite(
  idOrSlug: string,
): Promise<PublicMiniSiteContext> {
  const key = idOrSlug.trim();
  if (!key) {
    return { business: null, siteData: {}, products: [] };
  }

  const { data, error } = await supabase.rpc("resolve_public_mini_site", {
    p_key: key,
  });

  if (error) {
    return {
      business: null,
      siteData: {},
      products: [],
      error: error.message,
    };
  }

  if (!data || typeof data !== "object") {
    return { business: null, siteData: {}, products: [] };
  }

  const payload = data as {
    business?: Business | null;
    siteData?: MiniSiteData | null;
    products?: Product[] | null;
  };

  return {
    business: payload.business ?? null,
    siteData: (payload.siteData || {}) as MiniSiteData,
    products: Array.isArray(payload.products)
      ? (payload.products as Product[])
      : [],
  };
}
