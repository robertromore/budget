import { priceAlerts } from "$core/schema/price-alerts";
import type { NewPriceAlert, PriceAlert } from "$core/schema/price-alerts";
import { db } from "$core/server/db";
import { NotFoundError } from "$core/server/shared/types/errors";
import { getCurrentTimestamp, nowISOString } from "$core/utils/dates-core";
import { and, eq } from "drizzle-orm";

export class AlertRepository {
  async create(data: NewPriceAlert): Promise<PriceAlert> {
    const [alert] = await db.insert(priceAlerts).values(data).returning();
    if (!alert) {
      throw new Error("Failed to create alert");
    }
    return alert;
  }

  async findById(id: number, workspaceId: number): Promise<PriceAlert | null> {
    return (
      (await db.query.priceAlerts.findFirst({
        where: and(eq(priceAlerts.id, id), eq(priceAlerts.workspaceId, workspaceId)),
      })) ?? null
    );
  }

  async update(
    id: number,
    data: Partial<NewPriceAlert>,
    workspaceId: number
  ): Promise<PriceAlert> {
    const [updated] = await db
      .update(priceAlerts)
      .set({ ...data, updatedAt: getCurrentTimestamp() })
      .where(and(eq(priceAlerts.id, id), eq(priceAlerts.workspaceId, workspaceId)))
      .returning();

    if (!updated) {
      throw new NotFoundError("Alert", id);
    }
    return updated;
  }

  async delete(id: number, workspaceId: number): Promise<void> {
    await db
      .delete(priceAlerts)
      .where(and(eq(priceAlerts.id, id), eq(priceAlerts.workspaceId, workspaceId)));
  }

  async findByProduct(productId: number, workspaceId: number): Promise<PriceAlert[]> {
    return db.query.priceAlerts.findMany({
      where: and(
        eq(priceAlerts.productId, productId),
        eq(priceAlerts.workspaceId, workspaceId)
      ),
    });
  }

  async findEnabled(productId: number, workspaceId: number): Promise<PriceAlert[]> {
    return db.query.priceAlerts.findMany({
      where: and(
        eq(priceAlerts.productId, productId),
        eq(priceAlerts.workspaceId, workspaceId),
        eq(priceAlerts.enabled, true)
      ),
    });
  }

  async findAllByWorkspace(workspaceId: number): Promise<PriceAlert[]> {
    return db.query.priceAlerts.findMany({
      where: eq(priceAlerts.workspaceId, workspaceId),
    });
  }

  async markTriggered(id: number): Promise<void> {
    await db
      .update(priceAlerts)
      .set({ lastTriggeredAt: nowISOString(), updatedAt: getCurrentTimestamp() })
      .where(eq(priceAlerts.id, id));
  }
}
