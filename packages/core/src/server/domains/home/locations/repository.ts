import {
  homeLocations,
  type HomeLocation,
  type NewHomeLocation,
} from "$core/schema/home/home-locations";
import { db } from "$core/server/db";
import { BaseRepository } from "$core/server/shared/database/base-repository";
import { getCurrentTimestamp } from "$core/utils/dates-core";
import { and, asc, eq, isNull } from "drizzle-orm";

export interface UpdateLocationData {
  name?: string;
  description?: string | null;
  parentId?: number | null;
  locationType?: string;
  icon?: string | null;
  color?: string | null;
  displayOrder?: number;
}

export interface LocationTreeNode extends HomeLocation {
  children: LocationTreeNode[];
  itemCount?: number;
}

export class HomeLocationRepository extends BaseRepository<
  typeof homeLocations,
  HomeLocation,
  NewHomeLocation,
  UpdateLocationData
> {
  constructor() {
    super(db, homeLocations, "HomeLocation");
  }

  override async create(data: NewHomeLocation, workspaceId: number): Promise<HomeLocation> {
    const [location] = await db
      .insert(homeLocations)
      .values({ ...data, workspaceId })
      .returning();

    if (!location) {
      throw new Error("Failed to create location");
    }

    return location;
  }

  override async findById(id: number, workspaceId: number): Promise<HomeLocation | null> {
    const result = await db
      .select()
      .from(homeLocations)
      .where(
        and(
          eq(homeLocations.id, id),
          eq(homeLocations.workspaceId, workspaceId),
          isNull(homeLocations.deletedAt)
        )
      )
      .limit(1);

    return result[0] || null;
  }

  async findAllByHome(homeId: number, workspaceId: number): Promise<HomeLocation[]> {
    return await db
      .select()
      .from(homeLocations)
      .where(
        and(
          eq(homeLocations.homeId, homeId),
          eq(homeLocations.workspaceId, workspaceId),
          isNull(homeLocations.deletedAt)
        )
      )
      .orderBy(asc(homeLocations.displayOrder), asc(homeLocations.name));
  }

  async findChildren(parentId: number, workspaceId: number): Promise<HomeLocation[]> {
    return await db
      .select()
      .from(homeLocations)
      .where(
        and(
          eq(homeLocations.parentId, parentId),
          eq(homeLocations.workspaceId, workspaceId),
          isNull(homeLocations.deletedAt)
        )
      )
      .orderBy(asc(homeLocations.displayOrder), asc(homeLocations.name));
  }

  override async update(
    id: number,
    data: UpdateLocationData,
    workspaceId: number
  ): Promise<HomeLocation> {
    const [updated] = await db
      .update(homeLocations)
      .set({ ...data, updatedAt: getCurrentTimestamp() })
      .where(and(eq(homeLocations.id, id), eq(homeLocations.workspaceId, workspaceId)))
      .returning();

    if (!updated) {
      throw new Error("Failed to update location");
    }

    return updated;
  }

  override async delete(id: number, workspaceId: number): Promise<void> {
    await db
      .update(homeLocations)
      .set({ deletedAt: getCurrentTimestamp() })
      .where(and(eq(homeLocations.id, id), eq(homeLocations.workspaceId, workspaceId)));
  }
}
