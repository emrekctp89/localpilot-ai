import { expect, test } from "@playwright/test";
import { loginWithPassword, openDashboardTab } from "./helpers/auth";
import { getE2ECredentials, hasConfiguredBusiness } from "./helpers/env";

const credentials = getE2ECredentials();

test.describe("Appointment CRUD", () => {
  test.skip(
    !credentials || !hasConfiguredBusiness(),
    "E2E kimlik bilgileri ve E2E_TEST_HAS_BUSINESS=true gerekli",
  );

  test.beforeEach(async ({ page }) => {
    await loginWithPassword(page, credentials!.email, credentials!.password);
    await openDashboardTab(page, /Randevu/);
    await expect(
      page.getByRole("heading", { name: "Randevu Yönetimi" }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("creates a new appointment", async ({ page }) => {
    const customerName = `E2E Müşteri ${Date.now()}`;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateValue = tomorrow.toISOString().slice(0, 10);

    await page.getByPlaceholder("Müşteri adı").fill(customerName);
    await page.getByPlaceholder("Telefon").fill("05551234567");
    await page.getByPlaceholder("Hizmet / görüşme konusu").fill("E2E test randevusu");
    await page.locator('input[type="date"]').fill(dateValue);
    await page.locator('input[type="time"]').fill("10:30");
    await page.getByRole("button", { name: "Randevuyu Kaydet" }).click();

    await expect(page.getByText(customerName)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Kaydedildi")).toBeVisible({ timeout: 10_000 });
  });
});