import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { isValidLeadPhone, normalizeWhatsAppNumber } from "../../lib/mini-site";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("business slug ensure + lead phone (v2.5)", () => {
  it("sanitizes supabase env values (newlines / multi-paste)", async () => {
    const { sanitizeEnvValue, sanitizeSupabaseUrl } = await import(
      "../../lib/supabase-env"
    );
    const key =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.sig";
    assert.equal(sanitizeEnvValue(`  ${key}\n${key}\n${key}  `), key);
    assert.equal(
      sanitizeSupabaseUrl("https://abc.supabase.co/"),
      "https://abc.supabase.co",
    );
    assert.equal(sanitizeSupabaseUrl("not a url"), "");
  });

  it("validates common TR mobile formats", () => {
    assert.equal(isValidLeadPhone("0532 123 45 67"), true);
    assert.equal(isValidLeadPhone("5321234567"), true);
    assert.equal(isValidLeadPhone("+90 532 123 45 67"), true);
    assert.equal(isValidLeadPhone("0212 123 45 67"), false);
    assert.equal(isValidLeadPhone("123"), false);
    assert.equal(normalizeWhatsAppNumber("05321234567"), "905321234567");
  });

  it("builds product inquiry WhatsApp and interest notes", async () => {
    const {
      buildProductInquiryWhatsAppMessage,
      buildProductInterestNote,
      buildWhatsAppDeepLink,
    } = await import("../../lib/mini-site");

    const message = buildProductInquiryWhatsAppMessage(
      { name: "Demo Kuaför", city: "İstanbul" },
      { name: "Saç Kesimi", price: 350, category: "Hizmet" },
    );
    assert.match(message, /Saç Kesimi/);
    assert.match(message, /bilgi almak/i);

    const withPrefill = buildProductInquiryWhatsAppMessage(
      { name: "Demo" },
      { name: "Manikür" },
      { whatsapp_prefill_message: "Merhaba, randevu istiyorum." },
    );
    assert.match(withPrefill, /Merhaba, randevu istiyorum/);
    assert.match(withPrefill, /Manikür/);

    assert.equal(
      buildProductInterestNote({ name: "Boya", category: "Hizmet" }),
      "İlgilendiğim: Boya (Hizmet)",
    );

    const link = buildWhatsAppDeepLink("05321234567", message);
    assert.match(link, /^https:\/\/wa\.me\/905321234567\?text=/);
  });

  it("resolves WhatsApp CTA without duplicate buttons", async () => {
    const {
      isWhatsAppCtaLabel,
      resolveMiniSiteCtaActions,
      splitAboutParagraphs,
    } = await import("../../lib/mini-site");

    assert.equal(isWhatsAppCtaLabel("WhatsApp Yaz"), true);
    assert.equal(isWhatsAppCtaLabel("Tıkla-Yaz"), true);
    assert.equal(isWhatsAppCtaLabel("Bize Ulaşın"), false);
    assert.equal(isWhatsAppCtaLabel("Randevu Al"), false);

    const waPrimary = resolveMiniSiteCtaActions({
      ctaText: "WhatsApp",
      whatsappHref: "https://wa.me/905321234567",
    });
    assert.equal(waPrimary.primary.isWhatsApp, true);
    assert.equal(waPrimary.primary.href, "https://wa.me/905321234567");
    assert.equal(waPrimary.secondaryWhatsAppHref, null);

    const formPrimary = resolveMiniSiteCtaActions({
      ctaText: "Randevu Al",
      whatsappHref: "https://wa.me/905321234567",
    });
    assert.equal(formPrimary.primary.href, "#iletisim");
    assert.equal(
      formPrimary.secondaryWhatsAppHref,
      "https://wa.me/905321234567",
    );

    assert.deepEqual(splitAboutParagraphs("Birinci.\n\nİkinci."), [
      "Birinci.",
      "İkinci.",
    ]);
  });

  it("wires ensureBusinessSiteSlug into dashboard session", () => {
    const session = readSource("hooks/useDashboardSession.ts");
    const repo = readSource("lib/repositories/business-slug.ts");
    const lead = readSource("app/site/[id]/LeadForm.tsx");

    assert.match(session, /ensureBusinessSiteSlug/);
    assert.match(repo, /ensureBusinessSiteSlug/);
    assert.match(repo, /site_slug/);
    assert.match(lead, /isValidLeadPhone/);
    assert.match(lead, /normalizeWhatsAppNumber/);
  });

  it("ships SEO robots/sitemap and security headers", () => {
    const robots = readSource("app/robots.ts");
    const sitemap = readSource("app/sitemap.ts");
    const nextConfig = readSource("next.config.ts");

    assert.match(robots, /sitemap/);
    assert.match(robots, /disallow.*dashboard/i);
    assert.match(sitemap, /fiyatlandirma/);
    assert.match(nextConfig, /X-Content-Type-Options/);
    assert.match(nextConfig, /X-Frame-Options/);
    assert.match(nextConfig, /Referrer-Policy/);
  });
});
