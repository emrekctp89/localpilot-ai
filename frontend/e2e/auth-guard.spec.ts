import { expect, test } from "@playwright/test";

test.describe("Auth guard", () => {
  test("redirects unauthenticated users from dashboard to auth", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByRole("heading", { name: "LocalPilot Giriş" })).toBeVisible();
  });

  test("auth page exposes email/password login", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByLabel("E-posta")).toBeVisible();
    await expect(page.getByLabel("Şifre")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Giriş Yap", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Google ile Devam Et" }),
    ).toBeVisible();
  });
});