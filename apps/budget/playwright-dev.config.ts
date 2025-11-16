import type {PlaywrightTestConfig} from "@playwright/test";
import {devices} from "@playwright/test";

const config: PlaywrightTestConfig = {
  // No webServer - we'll use the existing dev server
  testDir: "tests",
  testMatch: /(.+\.)?(test|spec)\.[jt]s/,

  // Performance optimizations
  timeout: 30000, // 30 seconds per test
  expect: {
    timeout: 10000, // 10 seconds for expect assertions
  },

  // Parallel execution for speed
  workers: 1, // Use single worker to avoid conflicts
  fullyParallel: false,

  // No retries for dev testing
  retries: 0,

  // Simple reporter
  reporter: [["list"]],

  use: {
    // Performance settings
    actionTimeout: 15000, // 15 seconds for actions
    navigationTimeout: 30000, // 30 seconds for page navigation

    // Browser optimizations - run headless by default, headed when explicitly requested
    headless: false,
    viewport: {width: 1280, height: 720},
    ignoreHTTPSErrors: true,

    // Base URL for the dev server
    baseURL: "http://localhost:5173",

    // Media settings
    screenshot: "on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },

  // Single project for Chromium
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],

  // Output settings
  outputDir: "test-results/",
};

export default config;
