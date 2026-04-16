import {
  homeMaintenance,
  type HomeMaintenance,
  type NewHomeMaintenance,
} from "$core/schema/home/home-maintenance";
import { db } from "$core/server/db";
import { getCurrentTimestamp } from "$core/utils/dates-core";
import { and, desc, eq } from "drizzle-orm";

export interface UpdateMaintenanceData {
  name?: string;
  description?: string | null;
  maintenanceType?: string;
  scheduledDate?: string | null;
  completedDate?: string | null;
  cost?: number | null;
  notes?: string | null;
}

export class HomeMaintenanceRepository {
  async findById(id: number, workspaceId: number): Promise<HomeMaintenance | null> {
    const result = await db
      .select()
      .from(homeMaintenance)
      .where(and(eq(homeMaintenance.id, id), eq(homeMaintenance.workspaceId, workspaceId)))
      .limit(1);

    return result[0] || null;
  }

  async findByItem(itemId: number, workspaceId: number): Promise<HomeMaintenance[]> {
    return await db
      .select()
      .from(homeMaintenance)
      .where(and(eq(homeMaintenance.itemId, itemId), eq(homeMaintenance.workspaceId, workspaceId)))
      .orderBy(desc(homeMaintenance.createdAt));
  }

  async create(data: NewHomeMaintenance, workspaceId: number): Promise<HomeMaintenance> {
    const [record] = await db
      .insert(homeMaintenance)
      .values({ ...data, workspaceId })
      .returning();

    if (!record) throw new Error("Failed to create maintenance record");
    return record;
  }

  async update(
    id: number,
    data: UpdateMaintenanceData,
    workspaceId: number
  ): Promise<HomeMaintenance> {
    const [updated] = await db
      .update(homeMaintenance)
      .set({ ...data, updatedAt: getCurrentTimestamp() })
      .where(and(eq(homeMaintenance.id, id), eq(homeMaintenance.workspaceId, workspaceId)))
      .returning();

    if (!updated) throw new Error("Failed to update maintenance record");
    return updated;
  }

  async delete(id: number, workspaceId: number): Promise<void> {
    await db
      .delete(homeMaintenance)
      .where(and(eq(homeMaintenance.id, id), eq(homeMaintenance.workspaceId, workspaceId)));
  }
}
