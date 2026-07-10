import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  CUSTOM_DOMAIN_CNAME_TARGET,
  customDomainStatusLabel,
  getCustomDomainDnsInstructions,
  getMiniSitePathKey,
  getMiniSitePublicPath,
  getMiniSitePublicUrl,
  isValidCustomDomain,
  isValidSiteSlug,
  looksLikeUuid,
  normalizeCustomDomain,
  normalizeSiteSlug,
  resolveCustomDomainSaveState,
  validateCustomDomainInput,
  validateSiteSlugInput,
} from "../../lib/mini-site-domain";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("mini site domain (Faz G white-label)", () => {
  it("normalizes Turkish characters into kebab slug", () => {
    assert.equal(normalizeSiteSlug("Güzel Kuaför!"), "guzel-kuafor");
    assert.equal(normalizeSiteSlug("  Şişli--Salon  "), "sisli-salon");
    assert.equal(isValidSiteSlug("guzel-kuafor"), true);
    assert.equal(isValidSiteSlug("a"), false);
    assert.equal(isValidSiteSlug(""), false);
  });

  it("rejects empty-invalid and UUID-as-slug", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    assert.equal(looksLikeUuid(uuid), true);
    assert.equal(isValidSiteSlug(uuid), false);
    assert.equal(validateSiteSlugInput("").ok, true);
    assert.equal(validateSiteSlugInput("x").ok, false);
    assert.equal(validateSiteSlugInput("Güzel Kuaför").slug, "guzel-kuafor");
  });

  it("prefers slug in public path and custom domain when active", () => {
    assert.equal(
      getMiniSitePathKey({ id: "biz-1", site_slug: "guzel-kuafor" }),
      "guzel-kuafor",
    );
    assert.equal(
      getMiniSitePublicPath({ id: "biz-1", site_slug: null }),
      "/site/biz-1",
    );
    assert.equal(
      getMiniSitePublicUrl({
        id: "biz-1",
        site_slug: "guzel",
        custom_domain: "www.ornek.com",
        custom_domain_status: "active",
      }),
      "https://www.ornek.com",
    );
    assert.equal(normalizeCustomDomain("https://WWW.Ornek.com/path"), "www.ornek.com");
    assert.equal(isValidCustomDomain("www.ornek.com"), true);
    assert.equal(isValidCustomDomain("not a domain"), false);
  });

  it("resolves custom domain save state and DNS instructions", () => {
    assert.equal(validateCustomDomainInput("").ok, true);
    assert.equal(validateCustomDomainInput("not-a-domain").ok, false);

    const cleared = resolveCustomDomainSaveState({
      rawInput: "",
      currentDomain: "www.ornek.com",
      currentStatus: "pending_dns",
    });
    assert.equal(cleared.custom_domain, null);
    assert.equal(cleared.custom_domain_status, "none");

    const pending = resolveCustomDomainSaveState({
      rawInput: "www.Yeni.com",
      currentDomain: null,
      currentStatus: "none",
    });
    assert.equal(pending.custom_domain, "www.yeni.com");
    assert.equal(pending.custom_domain_status, "pending_dns");

    const keepActive = resolveCustomDomainSaveState({
      rawInput: "www.ornek.com",
      currentDomain: "www.ornek.com",
      currentStatus: "active",
    });
    assert.equal(keepActive.custom_domain_status, "active");

    const dns = getCustomDomainDnsInstructions("www.ornek.com");
    assert.equal(dns.type, "CNAME");
    assert.equal(dns.host, "www");
    assert.equal(dns.target, CUSTOM_DOMAIN_CNAME_TARGET);
    assert.equal(customDomainStatusLabel("pending_dns"), "DNS bekleniyor");
  });

  it("wires site page resolve and Ayarlar slug/domain fields", () => {
    const pageSource = readSource("app/site/[id]/page.tsx");
    const settingsSource = readSource("app/components/dashboard/AyarlarTab.tsx");
    const migration = readFileSync(
      join(root, "../supabase/migrations/012_mini_site_domains.sql"),
      "utf8",
    );

    assert.match(pageSource, /loadBusinessByIdOrSlug/);
    assert.match(pageSource, /looksLikeUuid/);
    assert.match(pageSource, /site_slug/);
    assert.match(settingsSource, /siteSlugInput/);
    assert.match(settingsSource, /customDomainInput/);
    assert.match(settingsSource, /validateSiteSlugInput/);
    assert.match(settingsSource, /resolveCustomDomainSaveState/);
    assert.match(settingsSource, /DNS kaydı/);
    assert.match(settingsSource, /site_slug/);
    assert.match(migration, /site_slug/);
    assert.match(migration, /custom_domain_status/);
  });
});
