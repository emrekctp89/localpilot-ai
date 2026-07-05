import { expect, test } from "@playwright/test";
import { loginWithPassword } from "./helpers/auth";
import { getE2ECredentials, hasConfiguredBusiness } from "./helpers/env";

const credentials = getE2ECredentials();

test.describe("Authenticated dashboard", () => {
  test.skip(!credentials, "E2E_TEST_EMAIL ve E2E_TEST_PASSWORD gerekli");

  test.beforeEach(async ({ page }) => {
    await loginWithPassword(page, credentials!.email, credentials!.password);
  });

  test("loads dashboard shell after login", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "LocalPilot" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Çıkış Yap/ })).toBeVisible();
  });

  test("shows onboarding or tab menu depending on business setup", async ({
    page,
  }) => {
    const tabMenu = page.getByRole("button", { name: /Vitrin|📊 Vitrin/ });
    const onboardingHeading = page.getByText(
      /yapay zeka beynini beslemek/i,
    );

    if (hasConfiguredBusiness()) {
      await expect(tabMenu).toBeVisible({ timeout: 15_000 });
    } else {
      await expect(
        tabMenu.or(onboardingHeading).first(),
      ).toBeVisible({ timeout: 15_000 });
    }
  });
});