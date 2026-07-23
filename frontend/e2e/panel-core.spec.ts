import { expect, test } from "@playwright/test";
import { loginWithPassword, openDashboardTab } from "./helpers/auth";
import { getE2ECredentials, hasConfiguredBusiness } from "./helpers/env";

/**
 * Universal panel tabs (always-on): Finans, CRM, Ayarlar + notification shell.
 * Requires E2E_TEST_EMAIL / PASSWORD and E2E_TEST_HAS_BUSINESS=true.
 */
const credentials = getE2ECredentials();

test.describe("Panel core (universal tabs)", () => {
  test.skip(
    !credentials || !hasConfiguredBusiness(),
    "E2E kimlik bilgileri ve E2E_TEST_HAS_BUSINESS=true gerekli",
  );

  test.beforeEach(async ({ page }) => {
    await loginWithPassword(page, credentials!.email, credentials!.password);
    await expect(page.getByRole("button", { name: /Çıkış Yap/ })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("shows notification bell and sign out", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /Bildirimler/i }),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /Bildirimler/i }).click();
    await expect(page.getByText("Bildirimler").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Tümünü okundu|okundu/i }),
    ).toBeVisible();
  });

  test("opens Finans (Kasa) tab", async ({ page }) => {
    await openDashboardTab(page, /Finans/);
    await expect(
      page
        .getByText(/bakiye|gelir|gider|işlem|finans|projeksiyon/i)
        .first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("opens CRM (Müşteri) tab", async ({ page }) => {
    await openDashboardTab(page, /Müşteri|CRM/);
    await expect(
      page
        .getByText(/Müşteri Rehberi|Toplam Müşteri|Yeni Potansiyel|müşteri/i)
        .first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("opens Ayarlar with notification preferences", async ({ page }) => {
    await openDashboardTab(page, /Ayarlar/);
    await expect(
      page.getByRole("heading", { name: /Vitrin Ayarları/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText(/Panel bildirim tercihleri|Bildirimler/i).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/Yeni mini site lead|Kanal bildirimleri/i).first(),
    ).toBeVisible();
  });
});
