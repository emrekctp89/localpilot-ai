import { expect, test } from "@playwright/test";

/**
 * Production-safe public E2E — no auth secrets.
 * Run: PLAYWRIGHT_BASE_URL=https://… PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test e2e/live-public.spec.ts
 */
test.describe("Live public surfaces", () => {
  test("marketing home loads brand and CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/LocalPilot/i).first()).toBeVisible({
      timeout: 20_000,
    });
    // Pricing or auth entry should be reachable
    const pricing = page.getByRole("link", { name: /fiyat|plan/i }).first();
    const auth = page.getByRole("link", { name: /giriş|başla|ücretsiz/i }).first();
    await expect(pricing.or(auth).first()).toBeVisible();
  });

  test("pricing page loads", async ({ page }) => {
    await page.goto("/fiyatlandirma");
    await expect(page.locator("body")).toContainText(/Pro|₺|ücretsiz|plan/i, {
      timeout: 20_000,
    });
  });

  test("auth page has login form", async ({ page }) => {
    await page.goto("/auth");
    await expect(
      page.getByRole("heading", { name: /Panele giriş yap|Ücretsiz başla/i }),
    ).toBeVisible();
    await expect(page.getByLabel("E-posta")).toBeVisible();
    await expect(page.getByLabel("Şifre")).toBeVisible();
  });

  test("missing mini-site slug does not 5xx", async ({ page }) => {
    const response = await page.goto("/site/does-not-exist-e2e-xyz");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
  });
});
