import type {
  Business,
  MiniSiteData,
  MiniSitePublishStatus,
  Product,
} from "./domain-types";

export interface LeadCapturePayload {
  businessId: string;
  fullName: string;
  phone: string;
  notes: string;
  capturedAt: string;
}

export const LEAD_CAPTURE_STORAGE_KEY = "localpilot:last-lead";
export const LEAD_CAPTURE_EVENT = "localpilot:lead-captured";

export function getSiteBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

/** @deprecated Prefer getMiniSitePublicPath(business) — uses site_slug when set. */
export function getMiniSitePath(businessId: string) {
  return `/site/${businessId}`;
}

/** @deprecated Prefer getMiniSitePublicUrl(business) for slug/custom domain. */
export function getMiniSiteUrl(businessId: string) {
  return `${getSiteBaseUrl()}${getMiniSitePath(businessId)}`;
}

export function resolveMiniSitePublishStatus(
  siteData?: MiniSiteData | null,
): MiniSitePublishStatus {
  return siteData?.publish_status === "draft" ? "draft" : "published";
}

export function isMiniSitePublished(siteData?: MiniSiteData | null) {
  return resolveMiniSitePublishStatus(siteData) === "published";
}

export function normalizeWhatsAppNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("90")) return digits;
  if (digits.startsWith("0")) return `90${digits.slice(1)}`;
  return digits;
}

/** Accepts common TR mobile formats: 05xx, 5xx, +905xx (10–11 national digits). */
export function isValidLeadPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return false;
  if (digits.startsWith("90") && digits.length === 12) {
    return /^905[0-9]{9}$/.test(digits);
  }
  if (digits.startsWith("0") && digits.length === 11) {
    return /^05[0-9]{9}$/.test(digits);
  }
  if (digits.length === 10) {
    return /^5[0-9]{9}$/.test(digits);
  }
  return false;
}

export function buildWhatsAppDeepLink(
  phone: string,
  message?: string,
) {
  const normalized = normalizeWhatsAppNumber(phone);
  if (!normalized) return "";

  const base = `https://wa.me/${normalized}`;
  if (!message?.trim()) return base;

  return `${base}?text=${encodeURIComponent(message.trim())}`;
}

export function buildDefaultWhatsAppMessage(
  business: Pick<Business, "name" | "city">,
  siteData?: MiniSiteData | null,
) {
  if (siteData?.whatsapp_prefill_message?.trim()) {
    return siteData.whatsapp_prefill_message.trim();
  }

  const location = business.city ? ` (${business.city})` : "";
  return `Merhaba ${business.name || "işletme"}${location}, bilgi almak istiyorum.`;
}

/**
 * True when CTA label clearly targets WhatsApp (avoid duplicate WA buttons).
 * Matches common TR labels: WhatsApp, WA, Tıkla-Yaz, Mesaj at, …
 */
export function isWhatsAppCtaLabel(label?: string | null): boolean {
  const raw = (label || "").trim().toLowerCase();
  if (!raw) return false;

  if (raw.includes("whatsapp") || raw.includes("whats app")) return true;
  if (raw === "wa" || raw.startsWith("wa ") || raw.endsWith(" wa")) return true;
  if (/\bwp\b/.test(raw)) return true;
  if (raw.includes("tıkla-yaz") || raw.includes("tikla-yaz")) return true;
  if (raw.includes("tıkla yaz") || raw.includes("tikla yaz")) return true;
  if (raw.includes("mesaj at") || raw.includes("mesaj yaz")) return true;
  if (raw.includes("yazın") && raw.includes("whats")) return true;
  return false;
}

export interface MiniSiteCtaActions {
  primary: {
    href: string;
    label: string;
    external: boolean;
    isWhatsApp: boolean;
  };
  /** Secondary WhatsApp chip/button — null when primary already is WhatsApp. */
  secondaryWhatsAppHref: string | null;
  formHref: string;
}

/** Resolve hero/top/sticky CTAs so WhatsApp CTA does not double up. */
export function resolveMiniSiteCtaActions(options: {
  ctaText?: string | null;
  whatsappHref?: string | null;
  formHref?: string;
}): MiniSiteCtaActions {
  const label = options.ctaText?.trim() || "Bize Ulaşın";
  const formHref = options.formHref || "#iletisim";
  const whatsappHref = options.whatsappHref?.trim() || "";
  const ctaIsWhatsApp = Boolean(whatsappHref && isWhatsAppCtaLabel(label));

  if (ctaIsWhatsApp) {
    return {
      primary: {
        href: whatsappHref,
        label,
        external: true,
        isWhatsApp: true,
      },
      secondaryWhatsAppHref: null,
      formHref,
    };
  }

  return {
    primary: {
      href: formHref,
      label,
      external: false,
      isWhatsApp: false,
    },
    secondaryWhatsAppHref: whatsappHref || null,
    formHref,
  };
}

/** Split about text into paragraphs (blank-line or single newline). */
export function splitAboutParagraphs(about?: string | null): string[] {
  const text = about?.trim() || "";
  if (!text) return [];
  const byBlank = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (byBlank.length > 1) return byBlank;
  return text
    .split(/\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Prefill WhatsApp when visitor inquires about a specific product/service. */
export function buildProductInquiryWhatsAppMessage(
  business: Pick<Business, "name" | "city">,
  product: Pick<Product, "name" | "price" | "category">,
  siteData?: MiniSiteData | null,
) {
  const productName = product.name?.trim() || "ürün/hizmet";
  const priceNote =
    typeof product.price === "number"
      ? ` (${new Intl.NumberFormat("tr-TR", {
          style: "currency",
          currency: "TRY",
          maximumFractionDigits: 0,
        }).format(product.price)})`
      : "";
  const interest = `"${productName}"${priceNote}`;

  const base = siteData?.whatsapp_prefill_message?.trim();
  if (base) {
    return `${base}\n\nİlgilendiğim: ${interest}`;
  }

  const location = business.city ? ` (${business.city})` : "";
  return `Merhaba ${business.name || "işletme"}${location}, ${interest} hakkında bilgi almak istiyorum.`;
}

/** Contact form note when arriving from a product CTA. */
export function buildProductInterestNote(
  product: Pick<Product, "name" | "category">,
) {
  const name = product.name?.trim();
  if (!name) return "";
  const category = product.category?.trim();
  return category
    ? `İlgilendiğim: ${name} (${category})`
    : `İlgilendiğim: ${name}`;
}

export function buildMiniSiteSeo(
  business: Business,
  siteData?: MiniSiteData | null,
) {
  const title =
    siteData?.seo_title?.trim() ||
    `${business.name || "İşletme"} | ${business.city || "Türkiye"}`;
  const description =
    siteData?.seo_description?.trim() ||
    siteData?.hero_slogan?.trim() ||
    `${business.city || "Türkiye"} bölgesinde hizmet veren ${business.name || "işletme"}. İletişim ve teklif için mini siteyi ziyaret edin.`;

  return { title, description };
}

export function buildLocalBusinessJsonLd(
  business: Business,
  siteData: MiniSiteData,
  products: Product[],
  canonicalUrl: string,
) {
  const priceOffers = products
    .filter((product) => typeof product.price === "number")
    .slice(0, 8)
    .map((product) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: product.name,
        description: product.description || undefined,
      },
      price: product.price,
      priceCurrency: "TRY",
    }));

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    description: siteData.about_us || siteData.hero_slogan,
    url: canonicalUrl,
    telephone: business.whatsapp_number || undefined,
    address: business.address
      ? {
          "@type": "PostalAddress",
          streetAddress: business.address,
          addressLocality: business.city,
          addressCountry: "TR",
        }
      : undefined,
    areaServed: business.city || undefined,
    openingHours: business.working_hours || undefined,
    makesOffer: priceOffers.length > 0 ? priceOffers : undefined,
  };
}

export function recordLeadCapture(payload: LeadCapturePayload) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(LEAD_CAPTURE_STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(
    new CustomEvent<LeadCapturePayload>(LEAD_CAPTURE_EVENT, {
      detail: payload,
    }),
  );
}

export function readStoredLeadCapture(): LeadCapturePayload | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(LEAD_CAPTURE_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as LeadCapturePayload;
  } catch {
    return null;
  }
}

export function buildLeadEmailDraft(
  payload: LeadCapturePayload,
  businessName?: string,
) {
  const businessLabel = businessName || "işletmeniz";
  return [
    `Konu: ${businessLabel} — Yeni mini site lead`,
    "",
    `Ad Soyad: ${payload.fullName}`,
    `Telefon: ${payload.phone}`,
    `Talep: ${payload.notes}`,
    `Kaynak: Mini site lead formu`,
    `Zaman: ${new Date(payload.capturedAt).toLocaleString("tr-TR")}`,
    "",
    "Bu taslak e-posta bildirimi Faz 3.3 ile hazırlandı; gönderim entegrasyonu sonraki fazda bağlanacak.",
  ].join("\n");
}