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
