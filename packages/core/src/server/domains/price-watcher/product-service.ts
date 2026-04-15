import type { PriceProduct } from "$core/schema/price-products";
import type { PriceHistoryEntry } from "$core/schema/price-history";
import { ValidationError } from "$core/server/shared/types/errors";
import { slugify } from "$core/utils/string-utilities";
import { nowISOString } from "$core/utils/dates-core";
import { createId } from "@paralleldrive/cuid2";
import { ProductRepository } from "./product-repository";
import { HistoryRepository } from "./history-repository";
import { AlertService } from "./alert-service";
import { detectRetailer, fetchProductInfo, type ProductInfo } from "./price-checker";

export interface ProductPreview {
  url: string;
  retailer: string;
  name: string | null;
  price: number | null;
  currency: string | null;
  imageUrl: string | null;
  description: string | null;
  inStock: boolean;
}

export class ProductService {
  constructor(
    private productRepo: ProductRepository,
    private historyRepo: HistoryRepository,
    private alertService: AlertService
  ) {}

  static normalizeUrl(url: string): string {
    let normalized = url.trim();
    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
      normalized = `https://${normalized}`;
    }
    try {
      new URL(normalized);
    } catch {
      throw new ValidationError(`Invalid URL format: "${normalized}"`);
    }
    return normalized;
  }

  async previewUrl(url: string): Promise<ProductPreview> {
    if (!url) throw new ValidationError("A URL is required");
    const normalizedUrl = ProductService.normalizeUrl(url);
    const retailer = detectRetailer(normalizedUrl);
    const info = await fetchProductInfo(normalizedUrl);
    return {
      url: normalizedUrl,
      retailer,
      name: info.name,
      price: info.price,
      currency: info.currency,
      imageUrl: info.imageUrl,
      description: info.description,
      inStock: info.inStock,
    };
  }

  /**
   * Add a product by URL: detect retailer, fetch info, create record + initial snapshot
   */
  async addProduct(
    url: string,
    workspaceId: number,
    options?: { targetPrice?: number; checkInterval?: number }
  ): Promise<PriceProduct> {
    if (!url) {
      throw new ValidationError("A URL is required");
    }

    // Normalize URL: trim whitespace, add https:// if missing
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      throw new ValidationError(`Invalid URL format: "${normalizedUrl}"`);
    }

    const retailer = detectRetailer(normalizedUrl);
    const info = await fetchProductInfo(normalizedUrl);

    const fullName = info.name || new URL(url).hostname;
    // Truncate long product names (common with Amazon) to first ~80 chars at a word boundary
    const name = fullName.length > 80
      ? fullName.substring(0, 80).replace(/[\s,\-]+$/, "").replace(/\s\S*$/, "") + "…"
      : fullName;
    // Slug from truncated name, max ~60 chars + 8 char unique suffix
    const slugBase = slugify(name).substring(0, 60).replace(/-$/, "");
    const slug = slugBase + "-" + createId().slice(0, 8);

    const product = await this.productRepo.create({
      workspaceId,
      name,
      url: normalizedUrl,
      retailer,
      slug,
      imageUrl: info.imageUrl,
      images: info.images.length > 0 ? JSON.stringify(info.images) : null,
      description: info.description,
      currentPrice: info.price,
      lowestPrice: info.price,
      highestPrice: info.price,
      targetPrice: options?.targetPrice ?? null,
      currency: info.currency ?? "USD",
      checkInterval: options?.checkInterval ?? 6,
      status: "active",
      lastCheckedAt: nowISOString(),
    });

    // Store initial price snapshot
    if (info.price !== null) {
      await this.historyRepo.addSnapshot({
        productId: product.id,
        price: info.price,
        inStock: info.inStock,
        source: "scrape",
        checkedAt: nowISOString(),
      });
    }

    return product;
  }

  /**
   * Check the current price of a product
   * Flow: get previous → fetch → store → update stats → evaluate alerts → handle errors
   */
  async checkPrice(productId: number, workspaceId: number, options?: { useBrowser?: boolean }): Promise<PriceProduct> {
    const product = await this.productRepo.findByIdOrThrow(productId, workspaceId);

    // 1. Get previous price
    const previousSnapshot = await this.historyRepo.getLatest(productId);
    const oldPrice = previousSnapshot?.price ?? null;
    const wasInStock = previousSnapshot?.inStock ?? true;

    try {
      // 2. Fetch current price
      const info = await fetchProductInfo(product.url, { useBrowser: options?.useBrowser });

      if (info.price === null) {
        throw new Error("Could not extract price from page");
      }

      // 3. Store new snapshot
      await this.historyRepo.addSnapshot({
        productId: product.id,
        price: info.price,
        inStock: info.inStock,
        source: "scrape",
        checkedAt: nowISOString(),
      });

      // 4. Update product stats
      const updatedProduct = await this.productRepo.update(
        product.id,
        {
          currentPrice: info.price,
          lowestPrice:
            product.lowestPrice === null || info.price < product.lowestPrice
              ? info.price
              : product.lowestPrice,
          highestPrice:
            product.highestPrice === null || info.price > product.highestPrice
              ? info.price
              : product.highestPrice,
          lastCheckedAt: nowISOString(),
          status: "active",
          errorMessage: null,
          errorCount: 0,
        },
        workspaceId
      );

      // 5. Evaluate alerts
      if (oldPrice !== null) {
        await this.alertService.evaluateAlerts(
          productId,
          oldPrice,
          info.price,
          info.inStock,
          wasInStock,
          product.targetPrice,
          product.name
        );
      }

      return updatedProduct;
    } catch (error) {
      // 6. Handle errors — increment error count, pause after 3 consecutive failures
      const message = error instanceof Error ? error.message : "Unknown error";
      const newErrorCount = (product.errorCount ?? 0) + 1;
      return this.productRepo.update(
        product.id,
        {
          status: newErrorCount >= 3 ? "error" : "active",
          errorMessage: message,
          errorCount: newErrorCount,
          lastCheckedAt: nowISOString(),
        },
        workspaceId
      );
    }
  }

  async updateProduct(
    id: number,
    data: {
      targetPrice?: number | null;
      checkInterval?: number;
      status?: "active" | "paused";
      notes?: string | null;
      name?: string;
    },
    workspaceId: number
  ): Promise<PriceProduct> {
    return this.productRepo.update(id, data, workspaceId);
  }

  async deleteProduct(id: number, workspaceId: number): Promise<void> {
    await this.productRepo.softDelete(id, workspaceId);
  }

  async bulkDeleteProducts(ids: number[], workspaceId: number): Promise<{ count: number }> {
    const count = await this.productRepo.bulkSoftDelete(ids, workspaceId);
    return { count };
  }

  async bulkUpdateStatus(
    ids: number[],
    status: "active" | "paused",
    workspaceId: number
  ): Promise<{ count: number }> {
    const count = await this.productRepo.bulkUpdateStatus(ids, status, workspaceId);
    return { count };
  }

  async bulkCheckPrices(ids: number[], workspaceId: number): Promise<{ checked: number; errors: number }> {
    let checked = 0;
    let errors = 0;
    for (const id of ids) {
      try {
        await this.checkPrice(id, workspaceId);
        checked++;
      } catch {
        errors++;
      }
    }
    return { checked, errors };
  }

  /**
   * Re-fetch product page and update metadata (name, images, description) without changing price fields
   */
  async refreshMetadata(productId: number, workspaceId: number): Promise<PriceProduct> {
    const product = await this.productRepo.findByIdOrThrow(productId, workspaceId);
    const info = await fetchProductInfo(product.url);

    const updates: Record<string, unknown> = {};
    if (info.name) updates.name = info.name.length > 80
      ? info.name.substring(0, 80).replace(/[\s,\-]+$/, "").replace(/\s\S*$/, "") + "…"
      : info.name;
    if (info.imageUrl) updates.imageUrl = info.imageUrl;
    if (info.images.length > 0) updates.images = JSON.stringify(info.images);
    if (info.description) updates.description = info.description;

    if (Object.keys(updates).length === 0) {
      return product;
    }

    return this.productRepo.update(product.id, updates, workspaceId);
  }

  async getProduct(slug: string, workspaceId: number): Promise<PriceProduct | null> {
    return this.productRepo.findBySlug(slug, workspaceId);
  }

  async getProductWithHistory(
    slug: string,
    workspaceId: number,
    dateRange?: { from?: string; to?: string }
  ): Promise<{ product: PriceProduct; history: PriceHistoryEntry[] } | null> {
    const product = await this.productRepo.findBySlug(slug, workspaceId);
    if (!product) return null;

    const history = await this.historyRepo.getHistory(product.id, dateRange);
    return { product, history };
  }

  async listProducts(
    workspaceId: number,
    filters?: { status?: string; retailer?: string }
  ): Promise<PriceProduct[]> {
    return this.productRepo.findAll(workspaceId, filters);
  }

  /**
   * Log a manually entered price — always-available fallback when extraction fails
   */
  async logManualPrice(
    productId: number,
    price: number,
    workspaceId: number,
    inStock?: boolean
  ): Promise<PriceProduct> {
    const product = await this.productRepo.findByIdOrThrow(productId, workspaceId);

    await this.historyRepo.addSnapshot({
      productId: product.id,
      price,
      inStock: inStock ?? true,
      source: "manual",
      checkedAt: nowISOString(),
    });

    return this.productRepo.update(
      product.id,
      {
        currentPrice: price,
        lowestPrice:
          product.lowestPrice === null || price < product.lowestPrice
            ? price
            : product.lowestPrice,
        highestPrice:
          product.highestPrice === null || price > product.highestPrice
            ? price
            : product.highestPrice,
        lastCheckedAt: nowISOString(),
        status: "active",
        errorMessage: null,
        errorCount: 0,
      },
      workspaceId
    );
  }
}
