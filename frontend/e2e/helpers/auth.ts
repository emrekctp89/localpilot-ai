import type { Page } from "@playwright/test";

export async function loginWithPassword(
  page: Page,
  email: string,
  password: string,
) {
  await page.goto("/auth");
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Şifre").fill(password);
  await page.getByRole("button", { name: "Giriş Yap", exact: true }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
}

export async function openDashboardTab(page: Page, tabLabel: string | RegExp) {
  await page.getByRole("button", { name: tabLabel }).click();
}