# Phase 9: Headless Browser Support

## Goal

Add headless Chromium scraping for retailers that serve empty or degraded HTML to plain HTTP requests (JS-rendered SPAs). This is the last extraction layer before manual entry.

## Reality Check

This is a significant infrastructure addition — ~200MB Chromium binary, ~200MB RAM per instance, and 5-10 seconds per page load. It should only be used when HTTP + DOM selectors (Phase 8) fail for a specific retailer. Most users will only need this for a handful of stores.

Even with a headless browser, some retailers may still block scraping via CAPTCHA, IP-based rate limiting, or fingerprinting. This is not a silver bullet — manual price entry remains the reliable fallback.

## Done When

- A headless browser can fetch and render a JS-heavy page
- The price checker falls back to browser when HTTP extraction fails
- Browser launches only when needed and shuts down after use
- Graceful fallback to HTTP if Playwright/Chromium is not installed
- Works on both server and desktop deployments

## Approach

Use `playwright-core` (not `playwright`) — this installs only the API library without downloading a browser. Users install Chromium separately, or the app uses system Chromium. This keeps the package lightweight and avoids the 200MB auto-download.

## Changes

### Install: `playwright-core`

```bash
bun add playwright-core --filter @budget/core
```

Users who want browser support run:

```bash
bunx playwright install chromium
```

The app detects whether Chromium is available at runtime and falls back to HTTP if not.

### New: `packages/core/src/server/domains/price-watcher/browser-provider.ts`

Single file, not a providers directory.

- `isBrowserAvailable()` — check if Chromium is installed (try to resolve the executable path, return boolean)
- `fetchPageWithBrowser(url)` — launch browser, navigate, wait for network idle, return rendered HTML, close browser:
  - Launch with `headless: true`
  - Set User-Agent from rotation pool (from Phase 8)
  - Viewport: 1920x1080
  - Navigate with 30-second timeout
  - Wait for `networkidle`
  - Extract HTML via `page.content()`
  - Close browser (not reused — simplicity over performance for v1)
- No anti-bot measures in v1 — add them in a follow-up if specific stores require it

### Modify: `packages/core/src/server/domains/price-watcher/price-checker.ts`

Add a `useBrowser` option to `fetchProductInfo`:

```typescript
export async function fetchProductInfo(
  url: string,
  options?: { useBrowser?: boolean }
): Promise<ProductInfo>
```

When `useBrowser === true`:

1. Check `isBrowserAvailable()` — if not, fall back to HTTP
2. Call `fetchPageWithBrowser(url)` to get rendered HTML
3. Parse with `node-html-parser` (from Phase 8)
4. Apply same extraction pipeline (JSON-LD → meta tags → DOM selectors)

The caller decides when to use browser — there is no hardcoded store registry mapping retailers to crawling methods. This keeps the system flexible and avoids untested assumptions about which stores need a browser.

### New tRPC route: `checkPriceWithBrowser`

Input: `{ productId }`. Same as `checkPriceNow` but passes `useBrowser: true` to `fetchProductInfo`. Rate-limited (browser is expensive).

### Modify: Product detail page UI

When a product is in "error" status and Chromium is available, show two recovery actions:

- **"Retry with Browser"** — calls `checkPriceWithBrowser`, attempts headless Chromium fetch
- **"Log Price Manually"** — existing manual entry (from Phase 8)

When Chromium is NOT available, only show "Log Price Manually."

### Modify: `packages/core/src/server/domains/price-watcher/product-service.ts`

Add `checkPriceWithBrowser(productId, workspaceId)` — same as `checkPrice` but passes `useBrowser: true`.

### Scheduler behavior

The background scheduler (Phase 7) always uses HTTP. Browser-based checking is user-initiated only (via the "Retry with Browser" button). This avoids:

- Launching Chromium unattended in the background
- Unexpected resource consumption
- Silent failures from browser crashes

If a product consistently fails with HTTP, the user can manually retry with browser and decide whether to keep tracking it or switch to manual entry.

## Graceful Degradation

If Playwright/Chromium is not installed:

- `isBrowserAvailable()` returns false
- Products from "browser" stores fall back to HTTP extraction
- HTTP extraction likely returns null for JS-heavy stores
- Product gets `errorMessage: "Could not extract price (browser not available)"`
- User can still use manual price entry

No crash, no unhandled error, no dependency on Chromium being present.

## Desktop Considerations

- **Electrobun desktop app**: Could potentially use the embedded browser engine. Deferred — for now, desktop users install Chromium via `bunx playwright install chromium` or use manual entry.
- **Server deployment**: Docker image should include Chromium. Add to Dockerfile: `RUN bunx playwright install chromium --with-deps`

## Dependencies

Phase 8 (DOM selectors + node-html-parser) must be complete.

## Verification

1. `bun run check` — type check
2. Without Chromium installed: verify "browser" store products fall back to HTTP gracefully
3. With Chromium installed: add a Walmart product URL, verify price extracts
4. Verify browser process shuts down after each check (no orphan processes)
5. Verify HTTP-only stores are unaffected (no browser launched)
