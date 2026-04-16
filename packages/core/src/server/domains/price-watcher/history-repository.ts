import { priceHistory } from "$core/schema/price-history";
import type { NewPriceHistoryEntry, PriceHistoryEntry } from "$core/schema/price-history";
import { priceProducts } from "$core/schema/price-products";
import { db } from "$core/server/db";
import { NotFoundError } from "$core/server/shared/types/errors";
import { and, desc, eq, gte, lte } from "drizzle-orm";

export class HistoryRepository {
  async addSnapshot(data: NewPriceHistoryEntry): Promise<PriceHistoryEntry> {
    const [entry] = await db.insert(priceHistory).values(data).returning();
    if (!entry) {
      throw new Error("Failed to create price snapshot");
    }
    return entry;
  }

  /**
   * Verify a product belongs to the given workspace. Used by read paths
   * (price history has no workspaceId column; tenancy flows through the
   * product record).
   */
  private async assertProductInWorkspace(
    productId: number,
    workspaceId: number
  ): Promise<void> {
    const [row] = await db
      .select({ id: priceProducts.id })
      .from(priceProducts)
      .where(
        and(
          eq(priceProducts.id, productId),
          eq(priceProducts.workspaceId, workspaceId)
        )
      )
      .limit(1);
    if (!row) throw new NotFoundError("Product", productId);
  }

  async getHistory(
    productId: number,
    workspaceId: number,
    dateRange?: { from?: string; to?: string }
  ): Promise<PriceHistoryEntry[]> {
    await this.assertProductInWorkspace(productId, workspaceId);
    const conditions = [eq(priceHistory.productId, productId)];

    if (dateRange?.from) {
      conditions.push(gte(priceHistory.checkedAt, dateRange.from));
    }
    if (dateRange?.to) {
      conditions.push(lte(priceHistory.checkedAt, dateRange.to));
    }

    return db.query.priceHistory.findMany({
      where: and(...conditions),
      orderBy: (history, { asc }) => [asc(history.checkedAt)],
    });
  }

  async getLatest(productId: number): Promise<PriceHistoryEntry | null> {
    return (
      (await db.query.priceHistory.findFirst({
        where: eq(priceHistory.productId, productId),
        orderBy: (history, { desc }) => [desc(history.checkedAt)],
      })) ?? null
    );
  }

  async getPreviousPrice(productId: number): Promise<PriceHistoryEntry | null> {
    const results = await db.query.priceHistory.findMany({
      where: eq(priceHistory.productId, productId),
      orderBy: (history, { desc }) => [desc(history.checkedAt)],
      limit: 2,
    });
    return results[1] ?? null;
  }
}
