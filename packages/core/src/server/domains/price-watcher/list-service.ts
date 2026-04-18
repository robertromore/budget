import { priceProductLists, priceProductListItems } from "$core/schema/price-product-lists";
import type {
  PriceProductList,
  PriceProductListItem,
  PriceProductListKind,
} from "$core/schema/price-product-lists";
import type { PriceProduct } from "$core/schema/price-products";
import { priceProducts } from "$core/schema/price-products";
import { db } from "$core/server/db";
import { NotFoundError } from "$core/server/shared/types/errors";
import { getCurrentTimestamp } from "$core/utils/dates-core";
import { slugify } from "$core/utils/string-utilities";
import { createId } from "@paralleldrive/cuid2";
import { and, eq, inArray } from "drizzle-orm";

export type ListProductWithNotes = PriceProduct & { listNotes: string | null };

export class ListService {
  /**
   * Create a list. `kind` defaults to `"collection"` so existing callers
   * (wishlists UI) keep working unchanged. Comparison-kind lists get a
   * dedicated UX surface at `/price-watcher/compare?list=<slug>`.
   */
  async createList(
    name: string,
    workspaceId: number,
    options?: { description?: string | null; kind?: PriceProductListKind }
  ): Promise<PriceProductList> {
    const slug = slugify(name) + "-" + createId().slice(0, 8);
    const [list] = await db
      .insert(priceProductLists)
      .values({
        workspaceId,
        name,
        slug,
        description: options?.description ?? null,
        kind: options?.kind ?? "collection",
      })
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

  /**
   * Verify both the list and the product belong to the caller's workspace
   * before allowing membership changes. The junction table itself has no
   * workspaceId column, so tenancy is enforced via the owning rows.
   */
  private async assertListAndProductInWorkspace(
    listId: number,
    productId: number,
    workspaceId: number
  ): Promise<void> {
    const [list] = await db
      .select({ id: priceProductLists.id })
      .from(priceProductLists)
      .where(
        and(
          eq(priceProductLists.id, listId),
          eq(priceProductLists.workspaceId, workspaceId)
        )
      )
      .limit(1);
    if (!list) throw new NotFoundError("List", listId);

    const [product] = await db
      .select({ id: priceProducts.id })
      .from(priceProducts)
      .where(
        and(
          eq(priceProducts.id, productId),
          eq(priceProducts.workspaceId, workspaceId)
        )
      )
      .limit(1);
    if (!product) throw new NotFoundError("Product", productId);
  }

  private async assertListInWorkspace(
    listId: number,
    workspaceId: number
  ): Promise<void> {
    const [list] = await db
      .select({ id: priceProductLists.id })
      .from(priceProductLists)
      .where(
        and(
          eq(priceProductLists.id, listId),
          eq(priceProductLists.workspaceId, workspaceId)
        )
      )
      .limit(1);
    if (!list) throw new NotFoundError("List", listId);
  }

  private async assertProductInWorkspace(
    productId: number,
    workspaceId: number
  ): Promise<void> {
    const [product] = await db
      .select({ id: priceProducts.id })
      .from(priceProducts)
      .where(
        and(
          eq(priceProducts.id, productId),
          eq(priceProducts.workspaceId, workspaceId)
        )
      )
      .limit(1);
    if (!product) throw new NotFoundError("Product", productId);
  }

  async addToList(
    listId: number,
    productId: number,
    workspaceId: number
  ): Promise<void> {
    await this.assertListAndProductInWorkspace(listId, productId, workspaceId);
    await db
      .insert(priceProductListItems)
      .values({ listId, productId })
      .onConflictDoNothing();
  }

  /**
   * Bulk-add multiple products to a list in one transaction. Used by the
   * "Save as comparison" flow on the compare page, which needs to
   * associate 2-6 selected products with a newly-created list.
   *
   * Pre-flight is two queries regardless of input size:
   *   1. Verify the list belongs to the workspace.
   *   2. Filter the supplied productIds down to those that also live in
   *      the workspace — an attacker supplying a cross-tenant productId
   *      has that id silently dropped rather than poisoning the junction.
   * Then a single multi-row INSERT with ON CONFLICT DO NOTHING makes
   * repeated calls idempotent.
   *
   * Returns the number of rows actually inserted (duplicates skipped).
   */
  async addManyToList(
    listId: number,
    productIds: number[],
    workspaceId: number
  ): Promise<{ added: number }> {
    if (productIds.length === 0) return { added: 0 };
    await this.assertListInWorkspace(listId, workspaceId);

    // Deduplicate + validate ownership in one round-trip.
    const uniqueIds = Array.from(new Set(productIds));
    const validRows = await db
      .select({ id: priceProducts.id })
      .from(priceProducts)
      .where(
        and(
          inArray(priceProducts.id, uniqueIds),
          eq(priceProducts.workspaceId, workspaceId)
        )
      );
    const validIds = validRows.map((row) => row.id);
    if (validIds.length === 0) return { added: 0 };

    const rows = validIds.map((productId) => ({ listId, productId }));
    const inserted = await db
      .insert(priceProductListItems)
      .values(rows)
      .onConflictDoNothing()
      .returning({ id: priceProductListItems.id });

    return { added: inserted.length };
  }

  async removeFromList(
    listId: number,
    productId: number,
    workspaceId: number
  ): Promise<void> {
    await this.assertListAndProductInWorkspace(listId, productId, workspaceId);
    await db
      .delete(priceProductListItems)
      .where(
        and(
          eq(priceProductListItems.listId, listId),
          eq(priceProductListItems.productId, productId)
        )
      );
  }

  async getListProducts(
    listId: number,
    workspaceId: number
  ): Promise<ListProductWithNotes[]> {
    await this.assertListInWorkspace(listId, workspaceId);
    const items = await db.query.priceProductListItems.findMany({
      where: eq(priceProductListItems.listId, listId),
      with: { product: true },
    });
    // Return the product joined with per-item `notes` so the comparison
    // view gets everything it needs in one round-trip. Items whose
    // product was soft-deleted are filtered out — they'd render as
    // blank columns otherwise.
    return items
      .filter((item) => item.product !== null && item.product !== undefined)
      .map((item) => ({
        ...(item.product as PriceProduct),
        listNotes: item.notes ?? null,
      }));
  }

  /**
   * Set per-item notes on a list membership. Used by comparison-kind
   * lists to capture decision context ("noisy per reviews"). Workspace
   * scope is enforced via `assertListAndProductInWorkspace`.
   */
  async setListItemNotes(
    listId: number,
    productId: number,
    notes: string | null,
    workspaceId: number
  ): Promise<PriceProductListItem> {
    await this.assertListAndProductInWorkspace(listId, productId, workspaceId);
    const [updated] = await db
      .update(priceProductListItems)
      .set({ notes })
      .where(
        and(
          eq(priceProductListItems.listId, listId),
          eq(priceProductListItems.productId, productId)
        )
      )
      .returning();
    if (!updated) {
      throw new NotFoundError(
        "ListItem",
        `${listId}:${productId}` as unknown as number
      );
    }
    return updated;
  }

  async getProductLists(
    productId: number,
    workspaceId: number
  ): Promise<PriceProductList[]> {
    await this.assertProductInWorkspace(productId, workspaceId);
    const items = await db.query.priceProductListItems.findMany({
      where: eq(priceProductListItems.productId, productId),
      with: { list: true },
    });
    return items
      .map((item) => item.list)
      .filter((l): l is PriceProductList => l !== null && l !== undefined);
  }

  /**
   * Return every list in the workspace, optionally filtered by kind.
   * No kind filter = both collection and comparison lists, preserving
   * behaviour for existing wishlist UI.
   */
  async getAllLists(
    workspaceId: number,
    options?: { kind?: PriceProductListKind }
  ): Promise<Array<PriceProductList & { itemCount: number }>> {
    const filters = [eq(priceProductLists.workspaceId, workspaceId)];
    if (options?.kind) filters.push(eq(priceProductLists.kind, options.kind));
    const lists = await db.query.priceProductLists.findMany({
      where: and(...filters),
      with: { items: true },
    });
    return lists.map((list) => ({
      ...list,
      itemCount: list.items?.length ?? 0,
    }));
  }
}
