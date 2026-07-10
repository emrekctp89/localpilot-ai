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

    assert.match(home, /lp-page/);
    assert.match(home, /lp-btn-primary/);
    assert.match(home, /bg-clip-text/);
    assert.match(ozet, /Karar Merkezi/);
    assert.match(ozet, /rounded-full/);
    assert.doesNotMatch(ozet, /transparenttextures\.com/);
    assert.match(nav, /lp-btn-primary/);
    assert.match(pricing, /lp-page/);
    assert.match(pricing, /lp-eyebrow/);
  });
});
