import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("UI/UX design system", () => {
  it("defines LocalPilot design tokens and component classes", () => {
    const css = readSource("app/globals.css");
    assert.match(css, /--lp-brand/);
    assert.match(css, /\.lp-btn-primary/);
    assert.match(css, /\.lp-input/);
    assert.match(css, /\.lp-card/);
    assert.match(css, /animate-fade-in-up/);
    assert.match(css, /\.lp-container/);
    assert.match(css, /max\(3rem/);
  });

  it("uses brand auth shell with accessible messages", () => {
    const auth = readSource("app/auth/page.tsx");
    assert.match(auth, /lp-btn-primary/);
    assert.match(auth, /lp-input/);
    assert.match(auth, /role=\"alert\"/);
    assert.match(auth, /setErrorMessage/);
    assert.doesNotMatch(auth, /alert\(/);
  });

  it("wires marketing and dashboard to design system classes", () => {
    const home = readSource("app/page.tsx");
    const ozet = readSource("app/components/dashboard/OzetTab.tsx");
    const nav = readSource("app/components/marketing/MarketingNav.tsx");
    const pricing = readSource("app/fiyatlandirma/page.tsx");
    const randevu = readSource("app/components/dashboard/RandevuTab.tsx");
    const crm = readSource("app/components/dashboard/CrmTab.tsx");
    const empty = readSource("app/components/dashboard/EmptyState.tsx");

    assert.match(home, /lp-page/);
    assert.match(home, /lp-btn-primary/);
    assert.match(home, /bg-clip-text/);
    assert.match(ozet, /Karar Merkezi/);
    assert.match(ozet, /rounded-full/);
    assert.doesNotMatch(ozet, /transparenttextures\.com/);
    assert.match(nav, /lp-btn-primary/);
    assert.match(pricing, /lp-page/);
    assert.match(pricing, /lp-eyebrow/);
    assert.match(randevu, /lp-input/);
    assert.match(randevu, /EmptyState/);
    assert.match(randevu, /ModuleLoading/);
    assert.match(crm, /lp-card/);
    assert.match(crm, /EmptyState/);
    assert.match(empty, /lp-btn-primary/);
  });

  it("ships offline banner, skip link and slug suggestion", () => {
    const layout = readSource("app/layout.tsx");
    const offline = readSource("app/components/OfflineBanner.tsx");
    const domain = readSource("lib/mini-site-domain.ts");
    const ayarlar = readSource("app/components/dashboard/AyarlarTab.tsx");
    const loading = readSource("app/components/dashboard/ModuleLoading.tsx");

    assert.match(layout, /İçeriğe atla/);
    assert.match(layout, /OfflineBanner/);
    assert.match(layout, /main-content/);
    assert.match(offline, /navigator\.onLine/);
    assert.match(domain, /suggestSiteSlugFromName/);
    assert.match(ayarlar, /suggestSiteSlugFromName/);
    assert.match(ayarlar, /İsimden öner/);
    assert.match(loading, /aria-busy/);
  });
});
