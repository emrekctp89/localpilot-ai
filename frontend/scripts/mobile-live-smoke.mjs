/**
 * Live mobile smoke against production Vercel domain.
 * Usage: node scripts/mobile-live-smoke.mjs
 */
import { chromium, devices } from "@playwright/test";

const base =
  process.env.PLAYWRIGHT_BASE_URL ||
  "https://localpilot-ai-1b2h-phi.vercel.app";

const results = [];

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log("PASS", name);
  } catch (e) {
    results.push({ name, ok: false, err: String(e.message || e) });
    console.log("FAIL", name, e.message || e);
  }
}

async function runDevice(deviceName, device) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...device });
  const page = await context.newPage();
  const prefix = deviceName;

  await check(`${prefix}:home`, async () => {
    const r = await page.goto(`${base}/`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    if (!r || r.status() >= 500) throw new Error(`status ${r && r.status()}`);
    await page.getByText(/LocalPilot/i).first().waitFor({ timeout: 15_000 });
    const vp = page.viewportSize();
    if (!vp || vp.width > 500) throw new Error(`not mobile vp ${JSON.stringify(vp)}`);
  });

  await check(`${prefix}:home-cta`, async () => {
    const pricing = page.getByRole("link", { name: /fiyat|plan/i }).first();
    const auth = page
      .getByRole("link", { name: /giri[sş]|ba[sş]la|ücretsiz/i })
      .first();
    await pricing.or(auth).first().waitFor({ timeout: 10_000 });
  });

  await check(`${prefix}:pricing`, async () => {
    const r = await page.goto(`${base}/fiyatlandirma`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    if (!r || r.status() >= 500) throw new Error("status");
    const t = await page.locator("body").innerText();
    if (!/Pro|₺|ücretsiz|plan/i.test(t)) throw new Error("pricing copy missing");
  });

  await check(`${prefix}:auth-form`, async () => {
    await page.goto(`${base}/auth`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.getByLabel("E-posta").waitFor({ timeout: 10_000 });
    await page.getByLabel("Şifre").waitFor({ timeout: 5_000 });
    const box = await page.getByLabel("E-posta").boundingBox();
    if (!box) throw new Error("no email box");
    if (box.width < 100) throw new Error(`email too narrow ${box.width}`);
    const vp = page.viewportSize();
    if (box.x + box.width > vp.width + 4) {
      throw new Error("email overflows viewport");
    }
  });

  await check(`${prefix}:dashboard-guard`, async () => {
    const r = await page.goto(`${base}/dashboard`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    if (!r || r.status() >= 500) throw new Error(`status ${r && r.status()}`);
    await page.waitForTimeout(1200);
    const url = page.url();
    const body = await page.locator("body").innerText();
    const blob = `${url} ${body}`;
    if (!/auth|giriş|e-posta|şifre|panel|localpilot/i.test(blob)) {
      throw new Error(`unexpected dashboard state ${url}`);
    }
  });

  await check(`${prefix}:missing-site`, async () => {
    const r = await page.goto(`${base}/site/does-not-exist-e2e-xyz`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    if (!r || r.status() >= 500) throw new Error("5xx");
  });

  await check(`${prefix}:offline`, async () => {
    const r = await page.goto(`${base}/offline`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    if (!r || r.status() >= 500) throw new Error("5xx");
  });

  await check(`${prefix}:sw`, async () => {
    const r = await page.goto(`${base}/sw.js`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    });
    if (!r || r.status() >= 400) throw new Error(`sw ${r && r.status()}`);
  });

  await browser.close();
}

console.log("Mobile live smoke →", base);
await runDevice("iPhone13", devices["iPhone 13"]);
await runDevice("Pixel7", devices["Pixel 7"]);

const failed = results.filter((r) => !r.ok);
console.log(
  JSON.stringify(
    {
      total: results.length,
      passed: results.length - failed.length,
      failed,
    },
    null,
    2,
  ),
);
process.exit(failed.length ? 1 : 0);
