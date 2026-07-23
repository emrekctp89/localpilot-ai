import type { OwnerNotifyConfig, ThemeConfig } from "./domain-types";

/** Local copy of AI URL resolve — avoids pulling supabase into unit tests. */
function resolveAiServiceUrl(): string | undefined {
  const raw = (process.env.NEXT_PUBLIC_AI_SERVICE_URL || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\/+$/, "");
  if (!raw) return undefined;
  if (
    typeof window !== "undefined" &&
    /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i.test(raw)
  ) {
    return undefined;
  }
  try {
    const parsed = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return undefined;
    }
    return parsed.origin;
  } catch {
    return undefined;
  }
}

export function normalizeOwnerNotifyConfig(
  input?: OwnerNotifyConfig | null,
): Required<OwnerNotifyConfig> {
  const email = (input?.email || "").trim();
  return {
    email_enabled: Boolean(input?.email_enabled) && Boolean(email),
    email,
    whatsapp_enabled: Boolean(input?.whatsapp_enabled),
  };
}

export function ownerNotifyFromTheme(
  theme?: ThemeConfig | null,
): Required<OwnerNotifyConfig> {
  return normalizeOwnerNotifyConfig(theme?.owner_notify);
}

export function mergeOwnerNotifyIntoTheme(
  theme: ThemeConfig | null | undefined,
  ownerNotify: OwnerNotifyConfig,
): ThemeConfig {
  const normalized = normalizeOwnerNotifyConfig(ownerNotify);
  return {
    ...(theme || {}),
    owner_notify: {
      email_enabled: normalized.email_enabled,
      email: normalized.email,
      whatsapp_enabled: normalized.whatsapp_enabled,
    },
  };
}

export function isValidOwnerNotifyEmail(email: string): boolean {
  const value = email.trim();
  if (value.length < 5 || value.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Public lead form → AI service owner channels (soft-fail). */
export async function notifyOwnerLeadChannels(input: {
  businessId: string;
  fullName: string;
  phone?: string;
  notes?: string;
}): Promise<{ status: string; reason?: string | null } | null> {
  const base = resolveAiServiceUrl();
  if (!base || !input.businessId) return null;

  try {
    const response = await fetch(`${base}/public/owner-lead-notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_id: input.businessId,
        full_name: input.fullName,
        phone: input.phone || "",
        notes: input.notes || "",
      }),
    });
    if (!response.ok) return null;
    return (await response.json()) as {
      status: string;
      reason?: string | null;
    };
  } catch {
    return null;
  }
}
