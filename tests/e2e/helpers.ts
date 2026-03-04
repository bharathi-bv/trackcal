import { Page, expect, test } from "@playwright/test";

export function envPath(name: string) {
  const value = process.env[name]?.trim();
  return value && value.startsWith("/") ? value : null;
}

export async function expectCoreShell(page: Page) {
  await expect(page.locator("body")).toContainText("CitaCal");
}

export function requireEnvPath(name: string) {
  const path = envPath(name);
  test.skip(!path, `${name} is not configured for this smoke test.`);
  return path;
}
