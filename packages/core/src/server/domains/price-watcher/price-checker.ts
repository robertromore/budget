/**
 * Price checker: fetches product information from URLs using structured data extraction.
 *
 * Extraction priority:
 * 1. JSON-LD (application/ld+json) — most reliable
 * 2. Open Graph meta tags (og:title, product:price:amount)
 * 3. Standard meta tags and title element
 */

export interface ProductInfo {
  name: string | null;
  price: number | null;
  currency: string | null;
  imageUrl: string | null;
  inStock: boolean;
}

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

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

/**
 * Extract JSON-LD structured data from HTML
 */
function extractJsonLd(html: string): ProductInfo | null {
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        // Handle @graph arrays
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

/**
 * Extract Open Graph and meta tag data from HTML
 */
function extractMetaTags(html: string): ProductInfo {
  const getMeta = (property: string): string | null => {
    const regex = new RegExp(
      `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`,
      "i"
    );
    const match = regex.exec(html);
    return match?.[1] ?? null;
  };

  // Also check reverse attribute order: content before property
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
    inStock: true, // Can't reliably determine from meta tags alone
  };
}

/**
 * Fetch a URL and extract product information
 */
export async function fetchProductInfo(url: string): Promise<ProductInfo> {
  const response = await fetch(url, {
    headers: BROWSER_HEADERS,
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  // Try JSON-LD first (most reliable)
  const jsonLd = extractJsonLd(html);
  if (jsonLd && (jsonLd.name || jsonLd.price !== null)) {
    // Fill in gaps from meta tags if JSON-LD is partial
    const meta = extractMetaTags(html);
    return {
      name: jsonLd.name ?? meta.name,
      price: jsonLd.price ?? meta.price,
      currency: jsonLd.currency ?? meta.currency ?? "USD",
      imageUrl: jsonLd.imageUrl ?? meta.imageUrl,
      inStock: jsonLd.inStock,
    };
  }

  // Fall back to meta tags
  const meta = extractMetaTags(html);
  return {
    ...meta,
    currency: meta.currency ?? "USD",
  };
}

/**
 * Extract product info from raw HTML (for testing without network)
 */
export function extractProductInfoFromHtml(html: string): ProductInfo {
  const jsonLd = extractJsonLd(html);
  if (jsonLd && (jsonLd.name || jsonLd.price !== null)) {
    const meta = extractMetaTags(html);
    return {
      name: jsonLd.name ?? meta.name,
      price: jsonLd.price ?? meta.price,
      currency: jsonLd.currency ?? meta.currency ?? "USD",
      imageUrl: jsonLd.imageUrl ?? meta.imageUrl,
      inStock: jsonLd.inStock,
    };
  }

  const meta = extractMetaTags(html);
  return { ...meta, currency: meta.currency ?? "USD" };
}
