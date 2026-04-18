import { priceProducts } from "$core/schema/price-products";
import type { NewPriceProduct, PriceProduct } from "$core/schema/price-products";
import { db } from "$core/server/db";
import { NotFoundError } from "$core/server/shared/types/errors";
import { getCurrentTimestamp, nowISOString } from "$core/utils/dates-core";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

export class ProductRepository {
  async create(data: NewPriceProduct): Promise<PriceProduct> {
    const [product] = await db.insert(priceProducts).values(data).returning();
    if (!product) {
      throw new Error("Failed to create product");
    }
    return product;
  }

  async findById(id: number, workspaceId: number): Promise<PriceProduct | null> {
    return (
      (await db.query.priceProducts.findFirst({
        where: and(
          eq(priceProducts.id, id),
          eq(priceProducts.workspaceId, workspaceId),
          isNull(priceProducts.deletedAt)
        ),
      })) ?? null
    );
  }

  async findByIdOrThrow(id: number, workspaceId: number): Promise<PriceProduct> {
    const product = await this.findById(id, workspaceId);
    if (!product) {
      throw new NotFoundError("Product", id);
    }
    return product;
  }

  async findBySlug(slug: string, workspaceId: number): Promise<PriceProduct | null> {
    return (
      (await db.query.priceProducts.findFirst({
        where: and(
          eq(priceProducts.slug, slug),
          eq(priceProducts.workspaceId, workspaceId),
          isNull(priceProducts.deletedAt)
        ),
      })) ?? null
    );
  }

  async findAll(
    workspaceId: number,
    filters?: { status?: string; retailer?: string; retailerId?: number }
  ): Promise<PriceProduct[]> {
    const conditions = [
      eq(priceProducts.workspaceId, workspaceId),
      isNull(priceProducts.deletedAt),
    ];

    if (filters?.status) {
      conditions.push(eq(priceProducts.status, filters.status as any));
    }
    if (filters?.retailerId) {
      conditions.push(eq(priceProducts.retailerId, filters.retailerId));
    } else if (filters?.retailer) {
      conditions.push(eq(priceProducts.retailer, filters.retailer));
    }

    return db.query.priceProducts.findMany({
      where: and(...conditions),
      orderBy: (products, { desc }) => [desc(products.createdAt)],
    });
  }

  async update(
    id: number,
    data: Partial<NewPriceProduct>,
    workspaceId: number
  ): Promise<PriceProduct> {
    await this.findByIdOrThrow(id, workspaceId);

    const [updated] = await db
      .update(priceProducts)
      .set({ ...data, updatedAt: getCurrentTimestamp() })
      .where(and(eq(priceProducts.id, id), isNull(priceProducts.deletedAt)))
      .returning();

    if (!updated) {
      throw new Error("Failed to update product");
    }
    return updated;
  }

  async softDelete(id: number, workspaceId: number): Promise<void> {
    await this.findByIdOrThrow(id, workspaceId);

    await db
      .update(priceProducts)
      .set({ deletedAt: getCurrentTimestamp() })
      .where(eq(priceProducts.id, id));
  }

  async bulkSoftDelete(ids: number[], workspaceId: number): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db
      .update(priceProducts)
      .set({ deletedAt: getCurrentTimestamp() })
      .where(
        and(
          inArray(priceProducts.id, ids),
          eq(priceProducts.workspaceId, workspaceId),
          isNull(priceProducts.deletedAt)
        )
      );
    return result.rowsAffected || 0;
  }

  async bulkUpdateStatus(
    ids: number[],
    status: "active" | "paused",
    workspaceId: number
  ): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db
      .update(priceProducts)
      .set({ status, updatedAt: getCurrentTimestamp() })
      .where(
        and(
          inArray(priceProducts.id, ids),
          eq(priceProducts.workspaceId, workspaceId),
          isNull(priceProducts.deletedAt)
        )
      );
    return result.rowsAffected || 0;
  }

  async findDueForCheck(workspaceId: number): Promise<PriceProduct[]> {
    const now = nowISOString();
    return db.query.priceProducts.findMany({
      where: and(
        eq(priceProducts.workspaceId, workspaceId),
        eq(priceProducts.status, "active"),
        isNull(priceProducts.deletedAt),
        sql`datetime(${priceProducts.lastCheckedAt}, '+' || ${priceProducts.checkInterval} || ' hours') < datetime(${now})`
      ),
    });
  }
}
