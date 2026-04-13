import { priceHistory } from "$core/schema/price-history";
import type { NewPriceHistoryEntry, PriceHistoryEntry } from "$core/schema/price-history";
import { db } from "$core/server/db";
import { and, desc, eq, gte, lte } from "drizzle-orm";

export class HistoryRepository {
  async addSnapshot(data: NewPriceHistoryEntry): Promise<PriceHistoryEntry> {
    const [entry] = await db.insert(priceHistory).values(data).returning();
    if (!entry) {
      throw new Error("Failed to create price snapshot");
    }
    return entry;
  }

  async getHistory(
    productId: number,
    dateRange?: { from?: string; to?: string }
  ): Promise<PriceHistoryEntry[]> {
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
