import { expect, test } from "@playwright/test";
import { loginWithPassword, openDashboardTab } from "./helpers/auth";
import { getE2ECredentials, hasConfiguredBusiness } from "./helpers/env";

const credentials = getE2ECredentials();

test.describe("Decision center", () => {
  test.skip(
    !credentials || !hasConfiguredBusiness(),
    "E2E kimlik bilgileri ve E2E_TEST_HAS_BUSINESS=true gerekli",
  );

  test.beforeEach(async ({ page }) => {
    await loginWithPassword(page, credentials!.email, credentials!.password);
    await openDashboardTab(page, /Karar Merkezi/);
    await expect(
      page.getByRole("heading", { name: "Karar Merkezi" }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("generates a recommendation cycle", async ({ page }) => {
    await page.getByRole("button", { name: "Verileri Analiz Et" }).click();

    await expect(
      page
        .getByText(/karar döngüsü/i)
        .or(page.getByRole("button", { name: "Onayla" }))
        .first(),
    ).toBeVisible({ timeout: 20_000 });
  });
});