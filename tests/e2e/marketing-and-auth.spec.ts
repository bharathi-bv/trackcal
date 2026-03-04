import { expect, test } from "@playwright/test";
import { expectCoreShell } from "./helpers";

test.describe("marketing and auth smoke", () => {
  test("landing page loads and links to docs", async ({ page }) => {
    await page.goto("/");
    await expectCoreShell(page);
    await expect(page.getByRole("link", { name: "Docs", exact: true })).toBeVisible();
    await expect(
      page.getByRole("navigation").getByRole("link", { name: /Start free/i })
    ).toBeVisible();
  });

  test("docs page loads", async ({ page }) => {
    await page.goto("/docs");
    await expect(page.locator("body")).toContainText("Documentation");
    await expect(page.locator("body")).toContainText("Set up CitaCal in 10 minutes");
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "CitaCal" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    await expect(page.getByPlaceholder("you@company.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
  });

  test("signup page loads", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: "CitaCal" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    await expect(page.getByPlaceholder("you@company.com")).toBeVisible();
    await expect(page.getByPlaceholder("Min. 6 characters")).toBeVisible();
  });

  test("dashboard redirects to login when signed out", async ({ page }) => {
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });
});
