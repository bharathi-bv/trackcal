import { expect, test } from "@playwright/test";
import { requireEnvPath } from "./helpers";

test.describe("booking creation smoke", () => {
  test("public booking can be completed end to end", async ({ page }) => {
    const bookingPath = requireEnvPath("PLAYWRIGHT_BOOKING_CREATE_PATH");
    const attendeeName = process.env.PLAYWRIGHT_ATTENDEE_NAME?.trim() || "Playwright Test";
    const attendeeEmail =
      process.env.PLAYWRIGHT_ATTENDEE_EMAIL?.trim() || `playwright+${Date.now()}@example.com`;

    await page.goto(bookingPath!);

    const availableSlot = page.locator('[data-slot-available="true"]').first();
    await expect(availableSlot).toBeVisible();
    await availableSlot.click();

    await page.getByRole("button", { name: /Confirm Time/i }).click();
    await page.getByPlaceholder("Your full name").fill(attendeeName);
    await page.getByPlaceholder("you@company.com").fill(attendeeEmail);
    await page.getByRole("button", { name: /Book now/i }).click();

    await expect(page.locator("body")).toContainText("You're booked!");
    await expect(page.locator("body")).toContainText(attendeeEmail);
  });
});
