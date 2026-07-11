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
