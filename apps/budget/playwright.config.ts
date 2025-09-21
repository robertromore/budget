import type { PlaywrightTestConfig } from "@playwright/test";
import { devices } from "@playwright/test";

const config: PlaywrightTestConfig = {
  webServer: {
    command: "bun run dev",
    port: 5173,
    reuseExistingServer: !process.env.CI, // Reuse server in dev, fresh in CI
    timeout: 120000, // 2 minutes timeout for server startup
  },
  testDir: "tests",
  testMatch: /(.+\.)?(test|spec)\.[jt]s/,
  
  // Performance optimizations
  timeout: 30000, // 30 seconds per test (reduced from default 30s)
  expect: {
    timeout: 10000, // 10 seconds for expect assertions
  },
  
  // Parallel execution for speed
  workers: process.env.CI ? 2 : undefined, // Use 2 workers in CI, max available locally
  fullyParallel: true, // Run tests in parallel within files
  
  // Retry configuration
  retries: process.env.CI ? 2 : 0, // Retry failed tests in CI only
  
  // Reporter optimizations
  reporter: process.env.CI ? [['github'], ['html']] : [['list'], ['html']],
  
  use: {
    // Performance settings
    actionTimeout: 15000, // 15 seconds for actions (click, fill, etc.)
    navigationTimeout: 30000, // 30 seconds for page navigation
    
    // Browser optimizations
    headless: true, // Always run headless for speed
    viewport: { width: 1280, height: 720 }, // Standard viewport
    ignoreHTTPSErrors: true, // Skip HTTPS validation for speed
    
    // Reduce resource loading
    permissions: [], // Don't grant unnecessary permissions
    colorScheme: 'light', // Consistent theme
    
    // Media settings (disabled for speed)
    screenshot: 'only-on-failure', // Only capture on failure
    video: 'retain-on-failure', // Only keep video on failure
    trace: 'retain-on-failure', // Only keep trace on failure
    
    // Fast browser context
    launchOptions: {
      // Disable unnecessary browser features for speed
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-extensions',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
      ],
    },
  },
  
  // Test isolation and cleanup
  globalSetup: undefined, // No global setup needed
  globalTeardown: undefined, // No global teardown needed
  
  // Project configuration for different browsers (only Chromium for speed)
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
      },
    },
    
    // Uncomment for cross-browser testing (will slow down tests)
    // {
    //   name: 'firefox',
    //   use: { ...require('@playwright/test').devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...require('@playwright/test').devices['Desktop Safari'] },
    // },
  ],
  
  // Output settings
  outputDir: 'test-results/', // Store test artifacts
};

export default config;
