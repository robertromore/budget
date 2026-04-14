/**
 * Price checker: fetches product information from URLs using layered extraction.
 *
 * Extraction priority:
 * 1. JSON-LD (application/ld+json) — most reliable
 * 2. Open Graph meta tags (og:title, product:price:amount)
 * 3. DOM CSS selector fallbacks (node-html-parser)
 * 4. Manual entry (handled by UI, not this module)
 */

import { parse as parseHtml } from "node-html-parser";

export interface ProductInfo {
  name: string | null;
  price: number | null;
  currency: string | null;
  imageUrl: string | null;
  inStock: boolean;
}

// ─── User-Agent Rotation ─────────────────────────────────

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
];

export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// ─── Retailer Detection ─────────────────────────────────

/**
 * Detect retailer from URL hostname
 */
export function detectRetailer(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    const domainMap: Record<string, string> = {
      "amazon.com": "amazon",
      "amazon.co.uk": "amazon",
      "amazon.ca": "amazon",
      "amazon.de": "amazon",
      "walmart.com": "walmart",
      "target.com": "target",
      "bestbuy.com": "bestbuy",
      "ebay.com": "ebay",
      "newegg.com": "newegg",
      "costco.com": "costco",
      "homedepot.com": "homedepot",
      "lowes.com": "lowes",
    };
    return domainMap[hostname] ?? hostname.split(".").slice(-2, -1)[0] ?? "unknown";
  } catch {
    return "unknown";
  }
}

// ─── Price Parsing ─────────────────────────────────

/**
 * Parse a price value from string or number input.
 * Handles "$12.99", "12,99 EUR", "12.99", raw numbers.
 */
export function parsePrice(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") return isFinite(input) ? input : null;

  // Strip currency symbols, whitespace, and common text
  const cleaned = String(input)
    .replace(/[€$£¥₹]/g, "")
    .replace(/\s+/g, "")
    .replace(/USD|EUR|GBP|CAD|AUD/gi, "")
    .trim();

  if (!cleaned) return null;

  // Handle comma as decimal separator (European format: "12,99")
  // vs comma as thousands separator ("1,299.99")
  let normalized: string;
  if (/^\d{1,3}(,\d{3})*(\.\d+)?$/.test(cleaned)) {
    // Comma as thousands: "1,299.99" → "1299.99"
    normalized = cleaned.replace(/,/g, "");
  } else if (/^\d+(,)\d{1,2}$/.test(cleaned)) {
    // Comma as decimal: "12,99" → "12.99"
    normalized = cleaned.replace(",", ".");
  } else {
    normalized = cleaned.replace(/,/g, "");
  }

  const value = parseFloat(normalized);
  return isFinite(value) && value >= 0 ? value : null;
}

// ─── Layer 1: JSON-LD Extraction ─────────────────────────────────

function extractJsonLd(html: string): ProductInfo | null {
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        const candidates = item["@graph"] ? [...item["@graph"], item] : [item];

        for (const candidate of candidates) {
          if (
            candidate["@type"] === "Product" ||
            candidate["@type"]?.includes?.("Product")
          ) {
            const offers = candidate.offers;
            const offer = Array.isArray(offers) ? offers[0] : offers;

            return {
              name: candidate.name ?? null,
              price: parsePrice(offer?.price ?? offer?.lowPrice ?? null),
              currency: offer?.priceCurrency ?? null,
              imageUrl: Array.isArray(candidate.image)
                ? candidate.image[0]
                : candidate.image ?? null,
              inStock:
                offer?.availability !== "https://schema.org/OutOfStock" &&
                offer?.availability !== "OutOfStock",
            };
          }
        }
      }
    } catch {
      // Invalid JSON, try next script tag
    }
  }
  return null;
}

// ─── Layer 2: Open Graph / Meta Tag Extraction ─────────────────────────────────

function extractMetaTags(html: string): ProductInfo {
  const getMeta = (property: string): string | null => {
    const regex = new RegExp(
      `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`,
      "i"
    );
    const match = regex.exec(html);
    return match?.[1] ?? null;
  };

  const getMetaReverse = (property: string): string | null => {
    const regex = new RegExp(
      `<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
      "i"
    );
    const match = regex.exec(html);
    return match?.[1] ?? null;
  };

  const getAnyMeta = (property: string): string | null =>
    getMeta(property) ?? getMetaReverse(property);

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);

  return {
    name: getAnyMeta("og:title") ?? titleMatch?.[1]?.trim() ?? null,
    price: parsePrice(
      getAnyMeta("product:price:amount") ?? getAnyMeta("og:price:amount") ?? null
    ),
    currency:
      getAnyMeta("product:price:currency") ?? getAnyMeta("og:price:currency") ?? null,
    imageUrl: getAnyMeta("og:image") ?? null,
    inStock: true,
  };
}

// ─── Layer 3: DOM CSS Selector Fallbacks ─────────────────────────────────

const PRICE_SELECTORS = [
  '[itemprop="price"]',
  'meta[itemprop="price"]',
  // Amazon-specific
  "#corePrice_feature_div .a-price-whole",
  "#corePriceDisplay_desktop_feature_div .a-price-whole",
  "#apex_offerDisplay_desktop .a-price-whole",
  ".a-price-whole",
  // Generic
  ".price",
  "#price",
  ".product-price",
  ".current-price",
  "[data-price]",
  ".offer-price",
  ".sale-price",
];

const NAME_SELECTORS = [
  '[itemprop="name"]',
  "#productTitle",
  "h1",
];

const IMAGE_SELECTORS = [
  '[itemprop="image"]',
  "#landingImage",
  "#main-image",
  'img.product-image',
];

function extractWithSelectors(html: string): ProductInfo | null {
  const root = parseHtml(html);

  // Extract price
  let price: number | null = null;
  for (const selector of PRICE_SELECTORS) {
    const el = root.querySelector(selector);
    if (!el) continue;
    const raw = el.getAttribute("content") ?? el.getAttribute("data-price") ?? el.textContent;
    price = parsePrice(raw);
    if (price !== null) {
      // Amazon-specific: combine whole + fraction (e.g., "649." + "99" → 649.99)
      if (selector.includes("a-price-whole")) {
        const fractionEl = el.parentNode?.querySelector(".a-price-fraction");
        if (fractionEl) {
          const fraction = fractionEl.textContent.trim();
          if (fraction) {
            const wholeClean = raw.trim().replace(/\.$/, "");
            price = parsePrice(`${wholeClean}.${fraction}`);
          }
        }
      }
      break;
    }
  }

  // Extract name
  let name: string | null = null;
  for (const selector of NAME_SELECTORS) {
    const el = root.querySelector(selector);
    if (!el) continue;
    const text = (el.getAttribute("content") ?? el.textContent).trim();
    if (text) {
      name = text;
      break;
    }
  }

  // Extract image
  let imageUrl: string | null = null;
  for (const selector of IMAGE_SELECTORS) {
    const el = root.querySelector(selector);
    if (!el) continue;
    const src = el.getAttribute("src") ?? el.getAttribute("content") ?? el.getAttribute("href");
    if (src) {
      imageUrl = src;
      break;
    }
  }

  if (!price && !name) return null;

  return {
    name,
    price,
    currency: null,
    imageUrl,
    inStock: true,
  };
}

// ─── Public API ─────────────────────────────────

/**
 * Combine results from multiple extraction layers, filling gaps from lower layers
 */
function mergeResults(primary: ProductInfo, ...fallbacks: (ProductInfo | null)[]): ProductInfo {
  const result = { ...primary };
  for (const fb of fallbacks) {
    if (!fb) continue;
    if (!result.name && fb.name) result.name = fb.name;
    if (result.price === null && fb.price !== null) result.price = fb.price;
    if (!result.currency && fb.currency) result.currency = fb.currency;
    if (!result.imageUrl && fb.imageUrl) result.imageUrl = fb.imageUrl;
  }
  result.currency = result.currency ?? "USD";
  return result;
}

/**
 * Fetch a URL and extract product information using layered extraction.
 * When useBrowser is true, uses headless Chromium for JS-rendered pages.
 */
export async function fetchProductInfo(
  url: string,
  options?: { useBrowser?: boolean }
): Promise<ProductInfo> {
  let html: string;

  if (options?.useBrowser) {
    const { isBrowserAvailable, fetchPageWithBrowser } = await import("./browser-provider");
    const available = await isBrowserAvailable();
    if (!available) {
      throw new Error("Headless browser not available. Install Chromium: bunx playwright install chromium");
    }
    html = await fetchPageWithBrowser(url);
  } else {
    const response = await fetch(url, {
      headers: {
        "User-Agent": getRandomUserAgent(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    html = await response.text();
  }

  return extractProductInfoFromHtml(html);
}

/**
 * Extract product info from raw HTML (for testing without network)
 */
export function extractProductInfoFromHtml(html: string): ProductInfo {
  // Layer 1: JSON-LD
  const jsonLd = extractJsonLd(html);

  // Layer 2: Meta tags
  const meta = extractMetaTags(html);

  // If JSON-LD found complete data, no need for DOM parsing
  if (jsonLd && jsonLd.name && jsonLd.price !== null) {
    return mergeResults(jsonLd, meta);
  }

  // Layer 3: DOM selectors (only if earlier layers have gaps)
  const selectors = extractWithSelectors(html);

  // If JSON-LD found partial data, fill gaps from meta + selectors
  if (jsonLd && (jsonLd.name || jsonLd.price !== null)) {
    return mergeResults(jsonLd, meta, selectors);
  }

  // If meta tags found price, fill gaps from selectors
  if (meta.price !== null) {
    return mergeResults(meta, selectors);
  }

  // If selectors found anything, fill gaps from meta
  if (selectors) {
    return mergeResults(selectors, meta);
  }

  // Nothing found — return meta (at least has name from title tag)
  return { ...meta, currency: meta.currency ?? "USD" };
}
