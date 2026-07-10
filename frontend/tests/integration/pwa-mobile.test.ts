import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("PWA and mobile shell", () => {
  it("ships manifest, service worker and icons", () => {
    const manifest = readSource("app/manifest.ts");
    assert.match(manifest, /LocalPilot/);
    assert.match(manifest, /standalone/);
    assert.match(manifest, /icon-192/);
    assert.match(manifest, /start_url/);

    assert.equal(existsSync(join(root, "public/sw.js")), true);
    assert.equal(existsSync(join(root, "public/icons/icon-192.png")), true);
    assert.equal(existsSync(join(root, "public/icons/icon-512.png")), true);
    assert.equal(
      existsSync(join(root, "public/icons/apple-touch-icon.png")),
      true,
    );

    const sw = readSource("public/sw.js");
    assert.match(sw, /skipWaiting/);
    assert.match(sw, /\/offline/);
  });

  it("registers PWA and exposes mobile-safe layout metadata", () => {
    const layout = readSource("app/layout.tsx");
    assert.match(layout, /PwaRegister/);
    assert.match(layout, /viewportFit:\s*["']cover["']/);
    assert.match(layout, /appleWebApp/);
    assert.match(layout, /manifest/);

    const pwa = readSource("app/components/PwaRegister.tsx");
    assert.match(pwa, /serviceWorker\.register/);
    assert.match(pwa, /beforeinstallprompt/);

    const nextConfig = readSource("next.config.ts");
    assert.match(nextConfig, /Service-Worker-Allowed/);
    assert.match(nextConfig, /sw\.js/);
  });

  it("uses mobile bottom nav and safe area padding on dashboard", () => {
    const tabMenu = readSource("app/components/dashboard/TabMenu.tsx");
    assert.match(tabMenu, /fixed inset-x-0 bottom-0/);
    assert.match(tabMenu, /safe-area-inset-bottom/);
    assert.match(tabMenu, /md:hidden/);

    const dashboard = readSource("app/dashboard/page.tsx");
    assert.match(dashboard, /safe-pb-nav/);

    const css = readSource("app/globals.css");
    assert.match(css, /safe-pb-nav/);
    assert.match(css, /scrollbar-hide/);
    assert.match(css, /font-size:\s*16px/);
  });
});
