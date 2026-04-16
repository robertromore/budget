import { homeItems, type HomeItem, type NewHomeItem } from "$core/schema/home/home-items";
import { homeItemLabels } from "$core/schema/home/home-item-labels";
import { homeLabels, type HomeLabel } from "$core/schema/home/home-labels";
import { homeLocations } from "$core/schema/home/home-locations";
import { db } from "$core/server/db";
import { BaseRepository } from "$core/server/shared/database/base-repository";
import { getCurrentTimestamp } from "$core/utils/dates-core";
import { and, asc, count, desc, eq, inArray, isNull, like, sql } from "drizzle-orm";

export interface UpdateItemData {
  name?: string;
  description?: string | null;
  notes?: string | null;
  locationId?: number | null;
  parentItemId?: number | null;
  serialNumber?: string | null;
  modelNumber?: string | null;
  manufacturer?: string | null;
  quantity?: number;
  isArchived?: boolean;
  isInsured?: boolean;
  purchaseDate?: string | null;
  purchaseVendor?: string | null;
  purchasePrice?: number | null;
  warrantyExpires?: string | null;
  warrantyNotes?: string | null;
  lifetimeWarranty?: boolean;
  currentValue?: number | null;
  customFields?: string | null;
}

export interface ItemWithDetails extends HomeItem {
  location?: { id: number; name: string } | null;
  labels?: HomeLabel[];
}

export class HomeItemRepository extends BaseRepository<
  typeof homeItems,
  HomeItem,
  NewHomeItem,
  UpdateItemData
> {
  constructor() {
    super(db, homeItems, "HomeItem");
  }

  override async create(data: NewHomeItem, workspaceId: number): Promise<HomeItem> {
    const [item] = await db
      .insert(homeItems)
      .values({ ...data, workspaceId })
      .returning();

    if (!item) {
      throw new Error("Failed to create item");
    }

    return item;
  }

  override async findById(id: number, workspaceId: number): Promise<HomeItem | null> {
    const result = await db
      .select()
      .from(homeItems)
      .where(
        and(
          eq(homeItems.id, id),
          eq(homeItems.workspaceId, workspaceId),
          isNull(homeItems.deletedAt)
        )
      )
      .limit(1);

    return result[0] || null;
  }

  async findByCuid(cuid: string, workspaceId: number): Promise<HomeItem | null> {
    const result = await db
      .select()
      .from(homeItems)
      .where(
        and(
          eq(homeItems.cuid, cuid),
          eq(homeItems.workspaceId, workspaceId),
          isNull(homeItems.deletedAt)
        )
      )
      .limit(1);

    return result[0] || null;
  }

  async findAllByHome(
    homeId: number,
    workspaceId: number,
    options?: { includeArchived?: boolean; locationId?: number; search?: string }
  ): Promise<HomeItem[]> {
    const conditions = [
      eq(homeItems.homeId, homeId),
      eq(homeItems.workspaceId, workspaceId),
      isNull(homeItems.deletedAt),
    ];

    if (!options?.includeArchived) {
      conditions.push(eq(homeItems.isArchived, false));
    }

    if (options?.locationId !== undefined) {
      conditions.push(eq(homeItems.locationId, options.locationId));
    }

    if (options?.search) {
      conditions.push(like(homeItems.name, `%${options.search}%`));
    }

    return await db
      .select()
      .from(homeItems)
      .where(and(...conditions))
      .orderBy(desc(homeItems.createdAt));
  }

  async findItemLabels(itemId: number): Promise<HomeLabel[]> {
    const result = await db
      .select({ label: homeLabels })
      .from(homeItemLabels)
      .innerJoin(homeLabels, eq(homeItemLabels.labelId, homeLabels.id))
      .where(eq(homeItemLabels.itemId, itemId));

    return result.map((r) => r.label);
  }

  async assignLabel(itemId: number, labelId: number): Promise<void> {
    await db
      .insert(homeItemLabels)
      .values({ itemId, labelId })
      .onConflictDoNothing();
  }

  async removeLabel(itemId: number, labelId: number): Promise<void> {
    await db
      .delete(homeItemLabels)
      .where(and(eq(homeItemLabels.itemId, itemId), eq(homeItemLabels.labelId, labelId)));
  }

  async getNextAssetId(homeId: number): Promise<number> {
    const result = await db
      .select({ maxAssetId: sql<number>`MAX(${homeItems.assetId})` })
      .from(homeItems)
      .where(eq(homeItems.homeId, homeId));

    return (result[0]?.maxAssetId ?? 0) + 1;
  }

  async countByLocation(locationId: number, workspaceId: number): Promise<number> {
    const [result] = await db
      .select({ total: count() })
      .from(homeItems)
      .where(
        and(
          eq(homeItems.locationId, locationId),
          eq(homeItems.workspaceId, workspaceId),
          isNull(homeItems.deletedAt)
        )
      );

    return result?.total ?? 0;
  }

  override async update(id: number, data: UpdateItemData, workspaceId: number): Promise<HomeItem> {
    const [updated] = await db
      .update(homeItems)
      .set({ ...data, updatedAt: getCurrentTimestamp() })
      .where(and(eq(homeItems.id, id), eq(homeItems.workspaceId, workspaceId)))
      .returning();

    if (!updated) {
      throw new Error("Failed to update item");
    }

    return updated;
  }

  override async delete(id: number, workspaceId: number): Promise<void> {
    await db
      .update(homeItems)
      .set({ deletedAt: getCurrentTimestamp() })
      .where(and(eq(homeItems.id, id), eq(homeItems.workspaceId, workspaceId)));
  }
}
