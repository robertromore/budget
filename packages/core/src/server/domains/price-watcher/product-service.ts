import type { PriceProduct } from "$core/schema/price-products";
import type { PriceHistoryEntry } from "$core/schema/price-history";
import { ValidationError } from "$core/server/shared/types/errors";
import { slugify } from "$core/utils/string-utilities";
import { nowISOString } from "$core/utils/dates-core";
import { createId } from "@paralleldrive/cuid2";
import { ProductRepository } from "./product-repository";
import { HistoryRepository } from "./history-repository";
import { AlertService } from "./alert-service";
import { detectRetailer, fetchProductInfo } from "./price-checker";

export class ProductService {
  constructor(
    private productRepo: ProductRepository,
    private historyRepo: HistoryRepository,
    private alertService: AlertService
  ) {}

  /**
   * Add a product by URL: detect retailer, fetch info, create record + initial snapshot
   */
  async addProduct(
    url: string,
    workspaceId: number,
    options?: { targetPrice?: number; checkInterval?: number }
  ): Promise<PriceProduct> {
    if (!url || !url.startsWith("http")) {
      throw new ValidationError("A valid URL is required");
    }

    const retailer = detectRetailer(url);
    const info = await fetchProductInfo(url);

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
      url,
      retailer,
      slug,
      imageUrl: info.imageUrl,
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
