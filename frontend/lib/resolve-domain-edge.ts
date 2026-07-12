import { normalizeCustomDomain } from "@/lib/mini-site-domain";
import { getSanitizedSupabaseConfig } from "@/lib/supabase-env";

/**
 * Resolve active custom domain → business id via Supabase RPC (edge-safe fetch).
 */
export async function resolveBusinessIdByCustomDomain(
  host: string,
): Promise<string | null> {
  const domain = normalizeCustomDomain(host);
  if (!domain) return null;

  const { url: supabaseUrl, anonKey } = getSanitizedSupabaseConfig();
  if (!supabaseUrl || !anonKey) return null;

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/rpc/resolve_mini_site_by_domain`,
      {
        method: "POST",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_domain: domain }),
        // Avoid caching stale domain mappings at the edge
        cache: "no-store",
      },
    );

    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data === "string" && data.length > 0) return data;
    return null;
  } catch {
    return null;
  }
}
