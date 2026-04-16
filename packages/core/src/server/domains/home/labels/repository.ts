import { homeLabels, type HomeLabel, type NewHomeLabel } from "$core/schema/home/home-labels";
import { homeItemLabels } from "$core/schema/home/home-item-labels";
import { db } from "$core/server/db";
import { BaseRepository } from "$core/server/shared/database/base-repository";
import { getCurrentTimestamp } from "$core/utils/dates-core";
import { and, asc, count, eq, isNull } from "drizzle-orm";

export interface UpdateLabelData {
  name?: string;
  description?: string | null;
  color?: string | null;
}

export interface LabelWithCount extends HomeLabel {
  itemCount: number;
}

export class HomeLabelRepository extends BaseRepository<
  typeof homeLabels,
  HomeLabel,
  NewHomeLabel,
  UpdateLabelData
> {
  constructor() {
    super(db, homeLabels, "HomeLabel");
  }

  override async create(data: NewHomeLabel, workspaceId: number): Promise<HomeLabel> {
    const [label] = await db
      .insert(homeLabels)
      .values({ ...data, workspaceId })
      .returning();

    if (!label) {
      throw new Error("Failed to create label");
    }

    return label;
  }

  override async findById(id: number, workspaceId: number): Promise<HomeLabel | null> {
    const result = await db
      .select()
      .from(homeLabels)
      .where(
        and(
          eq(homeLabels.id, id),
          eq(homeLabels.workspaceId, workspaceId),
          isNull(homeLabels.deletedAt)
        )
      )
      .limit(1);

    return result[0] || null;
  }

  async findAllByHome(homeId: number, workspaceId: number): Promise<HomeLabel[]> {
    return await db
      .select()
      .from(homeLabels)
      .where(
        and(
          eq(homeLabels.homeId, homeId),
          eq(homeLabels.workspaceId, workspaceId),
          isNull(homeLabels.deletedAt)
        )
      )
      .orderBy(asc(homeLabels.name));
  }

  async findAllWithCounts(homeId: number, workspaceId: number): Promise<LabelWithCount[]> {
    const labels = await this.findAllByHome(homeId, workspaceId);

    const labelsWithCounts: LabelWithCount[] = [];
    for (const label of labels) {
      const [result] = await db
        .select({ total: count() })
        .from(homeItemLabels)
        .where(eq(homeItemLabels.labelId, label.id));

      labelsWithCounts.push({ ...label, itemCount: result?.total ?? 0 });
    }

    return labelsWithCounts;
  }

  override async update(id: number, data: UpdateLabelData, workspaceId: number): Promise<HomeLabel> {
    const [updated] = await db
      .update(homeLabels)
      .set({ ...data, updatedAt: getCurrentTimestamp() })
      .where(and(eq(homeLabels.id, id), eq(homeLabels.workspaceId, workspaceId)))
      .returning();

    if (!updated) {
      throw new Error("Failed to update label");
    }

    return updated;
  }

  override async delete(id: number, workspaceId: number): Promise<void> {
    await db
      .update(homeLabels)
      .set({ deletedAt: getCurrentTimestamp() })
      .where(and(eq(homeLabels.id, id), eq(homeLabels.workspaceId, workspaceId)));
  }
}
