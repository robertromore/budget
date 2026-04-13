/**
 * Headless browser provider for fetching JS-rendered pages.
 *
 * Uses playwright-core (API only — no bundled browser).
 * Chromium must be installed separately: `bunx playwright install chromium`
 *
 * Gracefully falls back if Chromium is not available.
 */

import type { Browser } from "playwright-core";
import { getRandomUserAgent } from "./price-checker";

let _browserAvailable: boolean | null = null;

/**
 * Check if Chromium is installed and available.
 * Caches the result after the first check.
 */
export async function isBrowserAvailable(): Promise<boolean> {
  if (_browserAvailable !== null) return _browserAvailable;

  try {
    const { chromium } = await import("playwright-core");
    const execPath = chromium.executablePath();
    // Check if the executable actually exists
    const fs = await import("fs");
    _browserAvailable = fs.existsSync(execPath);
  } catch {
    _browserAvailable = false;
  }

  return _browserAvailable;
}

/**
 * Reset the browser availability cache (useful for testing).
 */
export function resetBrowserAvailabilityCache(): void {
  _browserAvailable = null;
}

/**
 * Fetch a URL using a headless Chromium browser.
 * Launches browser, navigates to URL, waits for network idle, returns rendered HTML.
 * Browser is closed after each call (no reuse in v1).
 *
 * @throws Error if Chromium is not available or page fails to load
 */
export async function fetchPageWithBrowser(url: string): Promise<string> {
  const { chromium } = await import("playwright-core");

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--disable-dev-shm-usage",
        "--no-sandbox",
      ],
    });

    const context = await browser.newContext({
      userAgent: getRandomUserAgent(),
      viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();

    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 30_000,
    });

    const html = await page.content();

    await context.close();
    return html;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
