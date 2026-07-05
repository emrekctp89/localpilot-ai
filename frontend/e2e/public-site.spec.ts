import { expect, test } from "@playwright/test";
import { getPublicBusinessId } from "./helpers/env";

const businessId = getPublicBusinessId();

test.describe("Public mini site", () => {
  test.skip(!businessId, "E2E_PUBLIC_BUSINESS_ID gerekli");

  test("submits lead form", async ({ page }) => {
    await page.goto(`/site/${businessId}`);
    await expect(
      page.getByRole("heading", { name: "Bize Ulaşın / Randevu Alın" }),
    ).toBeVisible({ timeout: 15_000 });

    const leadName = `E2E Lead ${Date.now()}`;
    await page.getByLabel("Adınız Soyadınız").fill(leadName);
    await page.getByLabel("Telefon Numaranız").fill("05559876543");
    await page.getByLabel("Talebiniz / İlgilendiğiniz Ürün").fill(
      "Playwright E2E test mesajı",
    );
    await page.getByRole("button", { name: "Gönder" }).click();

    await expect(page.getByText(/Talebiniz Alındı/i)).toBeVisible({
      timeout: 15_000,
    });
  });
});