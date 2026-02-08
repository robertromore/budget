import {
  metricAlerts,
  type MetricAlert,
  type NewMetricAlert,
} from "$lib/schema/metric-alerts";
import { db } from "$lib/server/db";
import { BaseRepository } from "$lib/server/shared/database/base-repository";
import { getCurrentTimestamp } from "$lib/utils/dates";
import { and, eq, isNull } from "drizzle-orm";

export interface UpdateMetricAlertData {
  name?: string;
  conditionType?: "above" | "below";
  threshold?: number;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

export class MetricAlertRepository extends BaseRepository<
  typeof metricAlerts,
  MetricAlert,
  NewMetricAlert,
  UpdateMetricAlertData
> {
  constructor() {
    super(db, metricAlerts, "MetricAlert");
  }

  async create(data: NewMetricAlert, workspaceId: number): Promise<MetricAlert> {
    const [alert] = await db
      .insert(metricAlerts)
      .values({ ...data, workspaceId })
      .returning();

    if (!alert) {
      throw new Error("Failed to create metric alert");
    }

    return alert;
  }

  override async findById(id: number, workspaceId: number): Promise<MetricAlert | null> {
    const result = await db
      .select()
      .from(metricAlerts)
      .where(
        and(
          eq(metricAlerts.id, id),
          eq(metricAlerts.workspaceId, workspaceId),
          isNull(metricAlerts.deletedAt)
        )
      )
      .limit(1);

    return result[0] || null;
  }

  async findAllByWorkspace(workspaceId: number): Promise<MetricAlert[]> {
    return await db
      .select()
      .from(metricAlerts)
      .where(
        and(
          eq(metricAlerts.workspaceId, workspaceId),
          isNull(metricAlerts.deletedAt)
        )
      );
  }

  async findAllActive(workspaceId: number): Promise<MetricAlert[]> {
    return await db
      .select()
      .from(metricAlerts)
      .where(
        and(
          eq(metricAlerts.workspaceId, workspaceId),
          eq(metricAlerts.isActive, true),
          isNull(metricAlerts.deletedAt)
        )
      );
  }

  override async update(
    id: number,
    data: UpdateMetricAlertData,
    workspaceId: number
  ): Promise<MetricAlert> {
    const [updated] = await db
      .update(metricAlerts)
      .set({
        ...data,
        updatedAt: getCurrentTimestamp(),
      })
      .where(
        and(
          eq(metricAlerts.id, id),
          eq(metricAlerts.workspaceId, workspaceId),
          isNull(metricAlerts.deletedAt)
        )
      )
      .returning();

    if (!updated) {
      throw new Error("Failed to update metric alert");
    }

    return updated;
  }

  async markTriggered(id: number, workspaceId: number): Promise<void> {
    const now = getCurrentTimestamp();
    await db
      .update(metricAlerts)
      .set({
        lastTriggeredAt: now,
        lastCheckedAt: now,
        triggerCount: (await this.findById(id, workspaceId))!.triggerCount + 1,
        updatedAt: now,
      })
      .where(
        and(
          eq(metricAlerts.id, id),
          eq(metricAlerts.workspaceId, workspaceId)
        )
      );
  }

  async markChecked(id: number, workspaceId: number): Promise<void> {
    const now = getCurrentTimestamp();
    await db
      .update(metricAlerts)
      .set({
        lastCheckedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(metricAlerts.id, id),
          eq(metricAlerts.workspaceId, workspaceId)
        )
      );
  }
}
