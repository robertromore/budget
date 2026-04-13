import { describe, test, expect } from "vitest";
import {
  extractProductInfoFromHtml,
  parsePrice,
  detectRetailer,
} from "$core/server/domains/price-watcher/price-checker";

describe("Price Checker", () => {
  describe("parsePrice", () => {
    test("parses dollar amount", () => {
      expect(parsePrice("$12.99")).toBe(12.99);
    });

    test("parses euro amount with comma decimal", () => {
      expect(parsePrice("12,99")).toBe(12.99);
    });

    test("parses amount with thousands separator", () => {
      expect(parsePrice("1,299.99")).toBe(1299.99);
    });

    test("parses raw number", () => {
      expect(parsePrice(29.99)).toBe(29.99);
    });

    test("parses string number without symbol", () => {
      expect(parsePrice("29.99")).toBe(29.99);
    });

    test("strips currency code", () => {
      expect(parsePrice("12.99 USD")).toBe(12.99);
    });

    test("returns null for empty string", () => {
      expect(parsePrice("")).toBeNull();
    });

    test("returns null for null", () => {
      expect(parsePrice(null)).toBeNull();
    });

    test("returns null for undefined", () => {
      expect(parsePrice(undefined)).toBeNull();
    });

    test("returns null for non-numeric string", () => {
      expect(parsePrice("not a price")).toBeNull();
    });

    test("returns null for NaN", () => {
      expect(parsePrice(NaN)).toBeNull();
    });

    test("returns null for Infinity", () => {
      expect(parsePrice(Infinity)).toBeNull();
    });
  });

  describe("detectRetailer", () => {
    test("detects amazon.com", () => {
      expect(detectRetailer("https://www.amazon.com/dp/B09V3KXJPB")).toBe("amazon");
    });

    test("detects amazon.co.uk", () => {
      expect(detectRetailer("https://www.amazon.co.uk/dp/B09V3KXJPB")).toBe("amazon");
    });

    test("detects walmart.com", () => {
      expect(detectRetailer("https://www.walmart.com/ip/12345")).toBe("walmart");
    });

    test("detects target.com", () => {
      expect(detectRetailer("https://www.target.com/p/something/-/A-12345")).toBe("target");
    });

    test("extracts domain name for unknown retailers", () => {
      expect(detectRetailer("https://www.somestore.com/product/123")).toBe("somestore");
    });

    test("returns unknown for invalid URL", () => {
      expect(detectRetailer("not a url")).toBe("unknown");
    });
  });

  describe("extractProductInfoFromHtml", () => {
    test("extracts from JSON-LD", () => {
      const html = `
        <html>
        <head>
          <script type="application/ld+json">
          {
            "@type": "Product",
            "name": "Test Widget",
            "image": "https://example.com/image.jpg",
            "offers": {
              "price": 29.99,
              "priceCurrency": "USD",
              "availability": "https://schema.org/InStock"
            }
          }
          </script>
        </head>
        <body></body>
        </html>
      `;

      const info = extractProductInfoFromHtml(html);
      expect(info.name).toBe("Test Widget");
      expect(info.price).toBe(29.99);
      expect(info.currency).toBe("USD");
      expect(info.imageUrl).toBe("https://example.com/image.jpg");
      expect(info.inStock).toBe(true);
    });

    test("extracts from JSON-LD with string price", () => {
      const html = `
        <html><head>
          <script type="application/ld+json">
          {"@type": "Product", "name": "Gadget", "offers": {"price": "$49.99", "priceCurrency": "USD"}}
          </script>
        </head><body></body></html>
      `;

      const info = extractProductInfoFromHtml(html);
      expect(info.name).toBe("Gadget");
      expect(info.price).toBe(49.99);
    });

    test("detects out of stock from JSON-LD", () => {
      const html = `
        <html><head>
          <script type="application/ld+json">
          {"@type": "Product", "name": "Sold Out Item", "offers": {"price": 10, "availability": "https://schema.org/OutOfStock"}}
          </script>
        </head><body></body></html>
      `;

      const info = extractProductInfoFromHtml(html);
      expect(info.inStock).toBe(false);
    });

    test("extracts from JSON-LD @graph array", () => {
      const html = `
        <html><head>
          <script type="application/ld+json">
          {"@graph": [{"@type": "WebPage"}, {"@type": "Product", "name": "Graph Item", "offers": {"price": 15.00}}]}
          </script>
        </head><body></body></html>
      `;

      const info = extractProductInfoFromHtml(html);
      expect(info.name).toBe("Graph Item");
      expect(info.price).toBe(15.0);
    });

    test("extracts from Open Graph meta tags", () => {
      const html = `
        <html><head>
          <meta property="og:title" content="OG Product" />
          <meta property="og:image" content="https://example.com/og.jpg" />
          <meta property="product:price:amount" content="39.99" />
          <meta property="product:price:currency" content="USD" />
        </head><body></body></html>
      `;

      const info = extractProductInfoFromHtml(html);
      expect(info.name).toBe("OG Product");
      expect(info.price).toBe(39.99);
      expect(info.imageUrl).toBe("https://example.com/og.jpg");
      expect(info.currency).toBe("USD");
    });

    test("falls back to title tag", () => {
      const html = `
        <html><head>
          <title>Simple Page Title</title>
        </head><body></body></html>
      `;

      const info = extractProductInfoFromHtml(html);
      expect(info.name).toBe("Simple Page Title");
      expect(info.price).toBeNull();
    });

    test("JSON-LD takes priority over meta tags", () => {
      const html = `
        <html><head>
          <meta property="og:title" content="Meta Title" />
          <meta property="product:price:amount" content="10.00" />
          <script type="application/ld+json">
          {"@type": "Product", "name": "JSON-LD Title", "offers": {"price": 20.00}}
          </script>
        </head><body></body></html>
      `;

      const info = extractProductInfoFromHtml(html);
      expect(info.name).toBe("JSON-LD Title");
      expect(info.price).toBe(20.0);
    });
  });
});
