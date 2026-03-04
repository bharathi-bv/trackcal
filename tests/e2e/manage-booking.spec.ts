import { expect, test } from "@playwright/test";
import { requireEnvPath } from "./helpers";

test.describe("manage booking smoke", () => {
  test("manage page renders", async ({ page }) => {
    const managePath = requireEnvPath("PLAYWRIGHT_MANAGE_BOOKING_PATH");
    await page.goto(managePath!);

    await expect(page.locator("body")).toContainText("Booking details");
    await expect(page.getByRole("button", { name: "Cancel booking" })).toBeVisible();
  });

  test("reschedule page renders", async ({ page }) => {
    const reschedulePath = requireEnvPath("PLAYWRIGHT_RESCHEDULE_BOOKING_PATH");
    await page.goto(reschedulePath!);

    await expect(page.locator("body")).toContainText("Pick a new time");
    await expect(page.locator("body")).toContainText("Time shown in");
  });
});
