import type { Business } from "@/lib/domain-types";
import { getSiteBaseUrl } from "@/lib/mini-site";

/** UUID v1–v5 style (businesses.id). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Public path segment: lowercase kebab, 2–48 chars. */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type CustomDomainStatus =
  | "none"
  | "pending_dns"
  | "active"
  | "error";

export function looksLikeUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/**
 * Normalize user input into a URL-safe site slug.
 * Turkish characters are mapped to ASCII equivalents.
 */
export function normalizeSiteSlug(raw: string): string {
  const mapped = raw
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/i̇/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, 48)
    .replace(/-+$/g, "");

  return mapped;
}

export function isValidSiteSlug(slug: string): boolean {
  if (!slug || slug.length < 2 || slug.length > 48) return false;
  if (looksLikeUuid(slug)) return false;
  return SLUG_RE.test(slug);
}

export function validateSiteSlugInput(raw: string): {
  ok: boolean;
  slug: string;
  error?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: true, slug: "" };
  }

  const slug = normalizeSiteSlug(trimmed);
  if (!isValidSiteSlug(slug)) {
    return {
      ok: false,
      slug,
      error:
        "Slug 2–48 karakter olmalı; sadece harf, rakam ve tire. UUID kullanılamaz.",
    };
  }

  return { ok: true, slug };
}

/** Default CNAME target for Vercel project domains (user DNS panel). */
export const CUSTOM_DOMAIN_CNAME_TARGET = "cname.vercel-dns.com";

export function normalizeCustomDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

export function isValidCustomDomain(domain: string): boolean {
  if (!domain || domain.length > 253) return false;
  if (domain.includes("://") || domain.includes("/")) return false;
  // hostname labels
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(
    domain,
  );
}

export function validateCustomDomainInput(raw: string): {
  ok: boolean;
  domain: string;
  error?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: true, domain: "" };
  }

  const domain = normalizeCustomDomain(trimmed);
  if (!isValidCustomDomain(domain)) {
    return {
      ok: false,
      domain,
      error:
        "Geçerli bir alan adı girin (örn. www.ornek.com). http:// veya yol eklemeyin.",
    };
  }

  return { ok: true, domain };
}

/**
 * Compute domain fields to persist when the user saves settings.
 * Empty input clears domain. New/changed domain → pending_dns.
 * Unchanged domain keeps existing status (active stays active).
 */
export function resolveCustomDomainSaveState(input: {
  rawInput: string;
  currentDomain?: string | null;
  currentStatus?: string | null;
}): {
  ok: boolean;
  custom_domain: string | null;
  custom_domain_status: CustomDomainStatus;
  custom_domain_error: string | null;
  error?: string;
} {
  const check = validateCustomDomainInput(input.rawInput);
  if (!check.ok) {
    return {
      ok: false,
      custom_domain: null,
      custom_domain_status: "none",
      custom_domain_error: check.error || null,
      error: check.error,
    };
  }

  if (!check.domain) {
    return {
      ok: true,
      custom_domain: null,
      custom_domain_status: "none",
      custom_domain_error: null,
    };
  }

  const previous = normalizeCustomDomain(input.currentDomain || "");
  const previousStatus = resolveCustomDomainStatus(input.currentStatus);

  if (previous === check.domain && previousStatus === "active") {
    return {
      ok: true,
      custom_domain: check.domain,
      custom_domain_status: "active",
      custom_domain_error: null,
    };
  }

  if (previous === check.domain && previousStatus === "error") {
    return {
      ok: true,
      custom_domain: check.domain,
      custom_domain_status: "pending_dns",
      custom_domain_error: null,
    };
  }

  if (previous === check.domain && previousStatus === "pending_dns") {
    return {
      ok: true,
      custom_domain: check.domain,
      custom_domain_status: "pending_dns",
      custom_domain_error: null,
    };
  }

  return {
    ok: true,
    custom_domain: check.domain,
    custom_domain_status: "pending_dns",
    custom_domain_error: null,
  };
}

export function customDomainStatusLabel(
  status?: string | null,
): string {
  switch (resolveCustomDomainStatus(status)) {
    case "active":
      return "Aktif";
    case "pending_dns":
      return "DNS bekleniyor";
    case "error":
      return "Hata";
    default:
      return "Yok";
  }
}

export function getCustomDomainDnsInstructions(domain: string): {
  host: string;
  type: string;
  target: string;
  note: string;
} {
  const normalized = normalizeCustomDomain(domain);
  const labels = normalized.split(".");
  // www.ornek.com → host www; apex ornek.com → @
  const isApex = labels.length === 2;
  return {
    host: isApex ? "@" : labels[0] || "www",
    type: "CNAME",
    target: CUSTOM_DOMAIN_CNAME_TARGET,
    note: isApex
      ? "Kök (apex) domain için sağlayıcınız A/ALIAS kaydı veya www yönlendirmesi destekliyorsa onu kullanın; aksi halde www alt alan adı önerilir."
      : "DNS yayılımı 5 dk – 48 saat sürebilir. Otomatik doğrulama (Vercel) sonraki adımda eklenecek.",
  };
}

/** Path key for public mini site links (prefer slug). */
export function getMiniSitePathKey(
  business: Pick<Business, "id" | "site_slug"> | null | undefined,
): string {
  const slug = business?.site_slug?.trim();
  if (slug) return slug;
  return business?.id || "";
}

export function getMiniSitePublicPath(
  business: Pick<Business, "id" | "site_slug"> | null | undefined,
): string {
  const key = getMiniSitePathKey(business);
  return key ? `/site/${key}` : "";
}

export function getMiniSitePublicUrl(
  business: Pick<
    Business,
    "id" | "site_slug" | "custom_domain" | "custom_domain_status"
  > | null | undefined,
): string {
  if (
    business?.custom_domain_status === "active" &&
    business.custom_domain &&
    isValidCustomDomain(normalizeCustomDomain(business.custom_domain))
  ) {
    return `https://${normalizeCustomDomain(business.custom_domain)}`;
  }

  const path = getMiniSitePublicPath(business);
  if (!path) return "";
  return `${getSiteBaseUrl()}${path}`;
}

export function resolveCustomDomainStatus(
  status?: string | null,
): CustomDomainStatus {
  if (
    status === "pending_dns" ||
    status === "active" ||
    status === "error" ||
    status === "none"
  ) {
    return status;
  }
  return "none";
}
