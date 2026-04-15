import { priceProductTags } from "$core/schema/price-product-tags";
import { db } from "$core/server/db";
import { and, eq, inArray, sql } from "drizzle-orm";

export class TagService {
  async addTag(productId: number, tag: string, workspaceId: number): Promise<void> {
    const normalized = tag.toLowerCase().trim();
    if (!normalized) return;

    await db
      .insert(priceProductTags)
      .values({ productId, tag: normalized, workspaceId })
      .onConflictDoNothing();
  }

  async removeTag(productId: number, tag: string, workspaceId: number): Promise<void> {
    const normalized = tag.toLowerCase().trim();
    await db
      .delete(priceProductTags)
      .where(
        and(
          eq(priceProductTags.productId, productId),
          eq(priceProductTags.tag, normalized),
          eq(priceProductTags.workspaceId, workspaceId)
        )
      );
  }

  async getProductTags(productId: number): Promise<string[]> {
    const rows = await db.query.priceProductTags.findMany({
      where: eq(priceProductTags.productId, productId),
    });
    return rows.map((r) => r.tag);
  }

  async getProductIdsByTags(tags: string[], workspaceId: number): Promise<number[]> {
    if (tags.length === 0) return [];
    const normalized = tags.map((t) => t.toLowerCase().trim());
    const rows = await db
      .selectDistinct({ productId: priceProductTags.productId })
      .from(priceProductTags)
      .where(
        and(
          eq(priceProductTags.workspaceId, workspaceId),
          inArray(priceProductTags.tag, normalized)
        )
      );
    return rows.map((r) => r.productId);
  }

  async getAllTags(workspaceId: number): Promise<Array<{ tag: string; count: number }>> {
    const rows = await db
      .select({
        tag: priceProductTags.tag,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(priceProductTags)
      .where(eq(priceProductTags.workspaceId, workspaceId))
      .groupBy(priceProductTags.tag)
      .orderBy(priceProductTags.tag);

    return rows;
  }
}
