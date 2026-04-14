# Phase 8: DOM Selector Fallbacks + Manual Entry

## Goal

Improve price extraction reliability by adding DOM-based CSS selector fallbacks after JSON-LD/Open Graph fails. Add User-Agent rotation to reduce blocking. Add manual price entry as a last resort.

## Reality Check

Most major US retailers (Amazon, Walmart, Target) block or serve degraded HTML to server-side HTTP requests. This phase does NOT solve that — Phase 9 (headless browser) addresses JS-heavy sites. This phase improves extraction for:

- Smaller retailers that serve full HTML but lack JSON-LD
- Sites with microdata (`itemprop="price"`) instead of JSON-LD
- Sites where JSON-LD parsing fails but price is in predictable HTML patterns

## Done When

- `node-html-parser` installed and used for DOM-based extraction
- Generic CSS selector fallbacks try common price patterns after JSON-LD/OG fail
- User-Agent rotation from a pool of modern browser strings
- Manual price entry available as last resort when all extraction fails
- Tests pass with mocked HTML for each extraction layer

## Changes

### Install: `node-html-parser`

Zero-dependency, 46KB, 6x faster than cheerio, DOM-like API (`querySelector`/`querySelectorAll`). Sufficient for simple selector queries — we don't need jQuery traversal.

```bash
bun add node-html-parser --filter @budget/core
```

### Modify: `packages/core/src/server/domains/price-watcher/price-checker.ts`

Update extraction pipeline to 4 layers:

1. JSON-LD structured data (existing, regex-based — keep as-is, fast)
2. Open Graph / meta tags (existing, regex-based — keep as-is)
3. **New**: DOM selector fallbacks — parse HTML with `node-html-parser`, try generic selectors in order:
   - `[itemprop="price"]` content or text
   - `meta[itemprop="price"]` content attribute
   - `.price`, `#price`, `.product-price`, `.current-price`
   - `[data-price]` attribute value
4. Return null if all layers fail (UI shows error, user can enter manually)

New function:

```typescript
import { parse } from "node-html-parser";

function extractWithSelectors(html: string): ProductInfo | null {
  const root = parse(html);

  // Try price selectors in order
  const priceSelectors = [
    '[itemprop="price"]',
    'meta[itemprop="price"]',
    '.price', '#price', '.product-price', '.current-price',
    '[data-price]',
  ];

  let price: number | null = null;
  for (const selector of priceSelectors) {
    const el = root.querySelector(selector);
    if (!el) continue;
    price = parsePrice(el.getAttribute("content") ?? el.textContent);
    if (price !== null) break;
  }

  // ... similar for name and image
}
```

Also extracts name and image if not already found:

- Name: `h1`, `[itemprop="name"]`, `#productTitle`
- Image: `[itemprop="image"]` src, `meta[property="og:image"]` content

### Modify: User-Agent rotation

Replace the single hardcoded User-Agent with a pool. `getRandomUserAgent()` picks one per request:

```typescript
const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ... Chrome/120...",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ... Chrome/121...",
  "Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 ... Safari/17.2",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
];
```

### New: Manual price entry

Add a "Log Price Manually" button/dialog on the product detail page. User enters current price, creates a snapshot with `source: "manual"`. Always-available fallback when extraction fails.

- Small dialog: price input + optional "in stock" toggle
- New tRPC route: `logManualPrice` — input: `{ productId, price, inStock? }`
- Updates product's `currentPrice`, `lowestPrice`, `highestPrice`, resets error status

### Tests

Add to `price-checker.test.ts`:

- Extract price from HTML with `[itemprop="price"]` microdata
- Extract price from HTML with `.price` class
- Extract price from `[data-price]` attribute
- Generic selectors don't override valid JSON-LD results
- `getRandomUserAgent()` returns values from the pool

## Dependencies

Phase 4 (Services) must be complete.

## Verification

1. `bun run check` — type check
2. `bun test tests/integration/price-watcher/` — all tests pass
3. Manual: add a product from a site with microdata pricing — verify extraction
4. Manual: use "Log Price Manually" on a product where auto-extraction fails
