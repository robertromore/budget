import { homes, type Home, type NewHome } from "$core/schema/home/homes";
import { db } from "$core/server/db";
import { BaseRepository } from "$core/server/shared/database/base-repository";
import { getCurrentTimestamp } from "$core/utils/dates-core";
import { and, eq, isNull } from "drizzle-orm";

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface UpdateHomeData {
  name?: string;
  slug?: string;
  description?: string | null;
  address?: string | null;
  notes?: string | null;
  coverImageUrl?: string | null;
}

export class HomeRepository extends BaseRepository<typeof homes, Home, NewHome, UpdateHomeData> {
  constructor() {
    super(db, homes, "Home");
  }

  async createTx(client: DbOrTx, data: NewHome, workspaceId: number): Promise<Home> {
    const [home] = await client
      .insert(homes)
      .values({ ...data, workspaceId })
      .returning();

    if (!home) {
      throw new Error("Failed to create home");
    }

    return home;
  }

  override async create(data: NewHome, workspaceId: number): Promise<Home> {
    return this.createTx(db, data, workspaceId);
  }

  override async findById(id: number, workspaceId: number): Promise<Home | null> {
    const result = await db
      .select()
      .from(homes)
      .where(and(eq(homes.id, id), eq(homes.workspaceId, workspaceId), isNull(homes.deletedAt)))
      .limit(1);

    return result[0] || null;
  }

  async findBySlug(slug: string, workspaceId: number): Promise<Home | null> {
    const result = await db
      .select()
      .from(homes)
      .where(and(eq(homes.slug, slug), eq(homes.workspaceId, workspaceId), isNull(homes.deletedAt)))
      .limit(1);

    return result[0] || null;
  }

  async findAllByWorkspace(workspaceId: number): Promise<Home[]> {
    return await db
      .select()
      .from(homes)
      .where(and(eq(homes.workspaceId, workspaceId), isNull(homes.deletedAt)));
  }

  override async update(id: number, data: UpdateHomeData, workspaceId: number): Promise<Home> {
    const [updated] = await db
      .update(homes)
      .set({ ...data, updatedAt: getCurrentTimestamp() })
      .where(and(eq(homes.id, id), eq(homes.workspaceId, workspaceId)))
      .returning();

    if (!updated) {
      throw new Error("Failed to update home");
    }

    return updated;
  }

  override async delete(id: number, workspaceId: number): Promise<void> {
    await db
      .update(homes)
      .set({ deletedAt: getCurrentTimestamp() })
      .where(and(eq(homes.id, id), eq(homes.workspaceId, workspaceId)));
  }
}
