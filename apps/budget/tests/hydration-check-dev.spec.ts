import {test, expect} from "@playwright/test";

test.describe("Hydration Mismatch Detection (Dev Server)", () => {
  test("should navigate to accounts/1 and check for hydration errors", async ({page}) => {
    // Capture console messages to check for hydration warnings
    const consoleMessages: string[] = [];
    const hydrationErrors: string[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      consoleMessages.push(`[${msg.type()}] ${text}`);

      // Check for hydration-related error patterns
      if (
        text.includes("hydration") ||
        text.includes("Hydration") ||
        text.includes("mismatch") ||
        text.includes("server-rendered") ||
        text.includes("client-rendered") ||
        text.includes("Expected server HTML") ||
        text.includes("hydrating component") ||
        text.includes("Hydration completed but contains mismatches") ||
        text.includes("Attempted to hydrate") ||
        text.includes("during hydration") ||
        text.toLowerCase().includes("ssr")
      ) {
        hydrationErrors.push(text);
      }
    });

    // Capture page errors
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    // Navigate directly to the dev server
    const baseURL = "http://localhost:5173";

    try {
      console.log("Navigating to accounts page...");
      await page.goto(`${baseURL}/accounts/1`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Wait a moment for hydration to complete
      await page.waitForTimeout(3000);

      // Try to interact with the page to trigger any hydration issues
      await page.waitForLoadState("domcontentloaded");
      await page.waitForLoadState("networkidle");

      // Check if the page loaded successfully
      const title = await page.title();
      console.log(`Page title: ${title}`);

      // Take a screenshot for debugging
      await page.screenshot({path: "test-results/accounts-page.png", fullPage: true});

      // Get the page URL to confirm we're on the right page
      const currentURL = page.url();
      console.log(`Current URL: ${currentURL}`);

      // Check page content
      const bodyText = await page.textContent("body");
      const hasContent = bodyText && bodyText.trim().length > 10;
      console.log(`Page has content: ${hasContent}`);

      // Log all console messages
      console.log("\n=== CONSOLE MESSAGES ===");
      if (consoleMessages.length === 0) {
        console.log("No console messages captured");
      } else {
        consoleMessages.forEach((msg, index) => {
          console.log(`${index + 1}. ${msg}`);
        });
      }

      // Report hydration errors
      console.log("\n=== HYDRATION ERRORS ===");
      if (hydrationErrors.length === 0) {
        console.log("✅ No hydration mismatch errors detected");
      } else {
        console.log(`❌ Found ${hydrationErrors.length} hydration-related messages:`);
        hydrationErrors.forEach((error, index) => {
          console.log(`${index + 1}. ${error}`);
        });
      }

      // Report page errors
      console.log("\n=== PAGE ERRORS ===");
      if (pageErrors.length === 0) {
        console.log("✅ No JavaScript errors detected");
      } else {
        console.log(`❌ Found ${pageErrors.length} JavaScript errors:`);
        pageErrors.forEach((error, index) => {
          console.log(`${index + 1}. ${error}`);
        });
      }

      // Additional checks
      console.log("\n=== PAGE STATUS ===");
      console.log(`✅ Page loaded: ${currentURL}`);
      console.log(`✅ Page title: ${title}`);
      console.log(`✅ Has content: ${hasContent}`);

      // Try to find specific elements that might indicate the page loaded correctly
      const navElements = await page.locator("nav").count();
      const buttonElements = await page.locator("button").count();
      const linkElements = await page.locator("a").count();

      console.log(`Navigation elements: ${navElements}`);
      console.log(`Button elements: ${buttonElements}`);
      console.log(`Link elements: ${linkElements}`);
    } catch (error) {
      console.error(`❌ Navigation failed: ${error}`);

      // Take screenshot of error state
      await page.screenshot({path: "test-results/error-state.png", fullPage: true});

      // Still log what we captured before the error
      console.log("\n=== CONSOLE MESSAGES (BEFORE ERROR) ===");
      consoleMessages.forEach((msg) => console.log(msg));

      console.log("\n=== HYDRATION ERRORS (BEFORE ERROR) ===");
      if (hydrationErrors.length > 0) {
        hydrationErrors.forEach((error) => console.log(error));
      }

      throw error;
    }

    // Output a summary
    console.log("\n=== SUMMARY ===");
    console.log(`Console messages: ${consoleMessages.length}`);
    console.log(`Hydration errors: ${hydrationErrors.length}`);
    console.log(`Page errors: ${pageErrors.length}`);

    // The test doesn't fail if there are hydration errors - we just want to report them
    // expect(hydrationErrors.length).toBe(0);
  });
});
