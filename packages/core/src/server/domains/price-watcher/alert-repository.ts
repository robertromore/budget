import { priceAlerts } from "$core/schema/price-alerts";
import type { NewPriceAlert, PriceAlert } from "$core/schema/price-alerts";
import { db } from "$core/server/db";
import { NotFoundError } from "$core/server/shared/types/errors";
import { getCurrentTimestamp } from "$core/utils/dates-core";
import { and, eq } from "drizzle-orm";

export class AlertRepository {
  async create(data: NewPriceAlert): Promise<PriceAlert> {
    const [alert] = await db.insert(priceAlerts).values(data).returning();
    if (!alert) {
      throw new Error("Failed to create alert");
    }
    return alert;
  }

  async findById(id: number): Promise<PriceAlert | null> {
    return (
      (await db.query.priceAlerts.findFirst({
        where: eq(priceAlerts.id, id),
      })) ?? null
    );
  }

  async update(id: number, data: Partial<NewPriceAlert>): Promise<PriceAlert> {
    const [updated] = await db
      .update(priceAlerts)
      .set({ ...data, updatedAt: getCurrentTimestamp() })
      .where(eq(priceAlerts.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundError("Alert", id);
    }
    return updated;
  }

  async delete(id: number): Promise<void> {
    await db.delete(priceAlerts).where(eq(priceAlerts.id, id));
  }

  async findByProduct(productId: number): Promise<PriceAlert[]> {
    return db.query.priceAlerts.findMany({
      where: eq(priceAlerts.productId, productId),
    });
  }

  async findEnabled(productId: number): Promise<PriceAlert[]> {
    return db.query.priceAlerts.findMany({
      where: and(
        eq(priceAlerts.productId, productId),
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
      .set({ lastTriggeredAt: getCurrentTimestamp(), updatedAt: getCurrentTimestamp() })
      .where(eq(priceAlerts.id, id));
  }
}
