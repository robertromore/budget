import { priceProductLists, priceProductListItems } from "$core/schema/price-product-lists";
import type { PriceProductList } from "$core/schema/price-product-lists";
import type { PriceProduct } from "$core/schema/price-products";
import { priceProducts } from "$core/schema/price-products";
import { db } from "$core/server/db";
import { NotFoundError } from "$core/server/shared/types/errors";
import { getCurrentTimestamp } from "$core/utils/dates-core";
import { slugify } from "$core/utils/string-utilities";
import { createId } from "@paralleldrive/cuid2";
import { and, eq, isNull, sql } from "drizzle-orm";

export class ListService {
  async createList(
    name: string,
    workspaceId: number,
    description?: string | null
  ): Promise<PriceProductList> {
    const slug = slugify(name) + "-" + createId().slice(0, 8);
    const [list] = await db
      .insert(priceProductLists)
      .values({ workspaceId, name, slug, description: description ?? null })
      .returning();
    if (!list) throw new Error("Failed to create list");
    return list;
  }

  async updateList(
    id: number,
    data: { name?: string; description?: string | null },
    workspaceId: number
  ): Promise<PriceProductList> {
    const [updated] = await db
      .update(priceProductLists)
      .set({ ...data, updatedAt: getCurrentTimestamp() })
      .where(and(eq(priceProductLists.id, id), eq(priceProductLists.workspaceId, workspaceId)))
      .returning();
    if (!updated) throw new NotFoundError("List", id);
    return updated;
  }

  async deleteList(id: number, workspaceId: number): Promise<void> {
    await db
      .delete(priceProductLists)
      .where(and(eq(priceProductLists.id, id), eq(priceProductLists.workspaceId, workspaceId)));
  }

  async addToList(listId: number, productId: number): Promise<void> {
    await db
      .insert(priceProductListItems)
      .values({ listId, productId })
      .onConflictDoNothing();
  }

  async removeFromList(listId: number, productId: number): Promise<void> {
    await db
      .delete(priceProductListItems)
      .where(
        and(
          eq(priceProductListItems.listId, listId),
          eq(priceProductListItems.productId, productId)
        )
      );
  }

  async getListProducts(listId: number): Promise<PriceProduct[]> {
    const items = await db.query.priceProductListItems.findMany({
      where: eq(priceProductListItems.listId, listId),
      with: { product: true },
    });
    return items
      .map((item) => item.product)
      .filter((p): p is PriceProduct => p !== null && p !== undefined);
  }

  async getProductLists(productId: number): Promise<PriceProductList[]> {
    const items = await db.query.priceProductListItems.findMany({
      where: eq(priceProductListItems.productId, productId),
      with: { list: true },
    });
    return items
      .map((item) => item.list)
      .filter((l): l is PriceProductList => l !== null && l !== undefined);
  }

  async getAllLists(
    workspaceId: number
  ): Promise<Array<PriceProductList & { itemCount: number }>> {
    const lists = await db.query.priceProductLists.findMany({
      where: eq(priceProductLists.workspaceId, workspaceId),
      with: { items: true },
    });
    return lists.map((list) => ({
      ...list,
      itemCount: list.items?.length ?? 0,
    }));
  }
}
