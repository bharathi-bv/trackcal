import { expect, test } from "@playwright/test";
import { requireEnvPath } from "./helpers";

test.describe("public booking smoke", () => {
  test("public booking page renders", async ({ page }) => {
    const publicPath = requireEnvPath("PLAYWRIGHT_PUBLIC_BOOKING_PATH");
    await page.goto(publicPath!);

    await expect(page.locator("body")).toContainText("Time shown in");
    await expect(page.locator("body")).toContainText("Confirm Time");
  });
});
