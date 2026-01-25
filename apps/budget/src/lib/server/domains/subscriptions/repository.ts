import {
  subscriptionAlerts,
  subscriptionPriceHistory,
  subscriptions,
  type InsertSubscription,
  type InsertSubscriptionAlert,
  type InsertSubscriptionPriceHistory,
  type Subscription,
  type SubscriptionAlert,
  type SubscriptionPriceHistory,
  type SubscriptionWithRelations,
} from "$lib/schema/subscriptions-table";
import { db } from "$lib/server/db";
import { and, asc, desc, eq, gte, inArray, isNull, like, lte, or, sql } from "drizzle-orm";
import type { SubscriptionFilters, SubscriptionSortOptions } from "./types";

export class SubscriptionRepository {
  // ==================== SUBSCRIPTION CRUD ====================

  async create(data: InsertSubscription): Promise<Subscription> {
    const [result] = await db.insert(subscriptions).values(data).returning();
    return result!;
  }

  async update(id: number, workspaceId: number, data: Partial<InsertSubscription>): Promise<Subscription | null> {
    const [result] = await db
      .update(subscriptions)
      .set({ ...data, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(subscriptions.id, id), eq(subscriptions.workspaceId, workspaceId)))
      .returning();
    return result ?? null;
  }

  async softDelete(id: number, workspaceId: number): Promise<boolean> {
    const [result] = await db
      .update(subscriptions)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP`, status: "cancelled" })
      .where(and(eq(subscriptions.id, id), eq(subscriptions.workspaceId, workspaceId)))
      .returning();
    return !!result;
  }

  async hardDelete(id: number, workspaceId: number): Promise<boolean> {
    const result = await db
      .delete(subscriptions)
      .where(and(eq(subscriptions.id, id), eq(subscriptions.workspaceId, workspaceId)));
    return result.rowsAffected > 0;
  }

  async getById(id: number, workspaceId: number): Promise<SubscriptionWithRelations | null> {
    const result = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.id, id),
        eq(subscriptions.workspaceId, workspaceId),
        isNull(subscriptions.deletedAt)
      ),
      with: {
        payee: true,
        account: true,
        priceHistory: {
          orderBy: [desc(subscriptionPriceHistory.effectiveDate)],
          limit: 10,
        },
        alerts: {
          where: eq(subscriptionAlerts.isDismissed, false),
          orderBy: [desc(subscriptionAlerts.triggerDate)],
        },
      },
    });
    return result ?? null;
  }

  async getAll(
    workspaceId: number,
    filters?: SubscriptionFilters,
    sort?: SubscriptionSortOptions
  ): Promise<SubscriptionWithRelations[]> {
    const conditions = [eq(subscriptions.workspaceId, workspaceId), isNull(subscriptions.deletedAt)];

    // Apply filters
    if (filters?.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      conditions.push(inArray(subscriptions.status, statuses));
    }
    if (filters?.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type];
      conditions.push(inArray(subscriptions.type, types));
    }
    if (filters?.billingCycle) {
      const cycles = Array.isArray(filters.billingCycle) ? filters.billingCycle : [filters.billingCycle];
      conditions.push(inArray(subscriptions.billingCycle, cycles));
    }
    if (filters?.accountId !== undefined) {
      conditions.push(eq(subscriptions.accountId, filters.accountId));
    }
    if (filters?.payeeId !== undefined) {
      conditions.push(eq(subscriptions.payeeId, filters.payeeId));
    }
    if (filters?.minAmount !== undefined) {
      conditions.push(gte(subscriptions.amount, filters.minAmount));
    }
    if (filters?.maxAmount !== undefined) {
      conditions.push(lte(subscriptions.amount, filters.maxAmount));
    }
    if (filters?.isManuallyAdded !== undefined) {
      conditions.push(eq(subscriptions.isManuallyAdded, filters.isManuallyAdded));
    }
    if (filters?.isUserConfirmed !== undefined) {
      conditions.push(eq(subscriptions.isUserConfirmed, filters.isUserConfirmed));
    }
    if (filters?.search) {
      conditions.push(like(subscriptions.name, `%${filters.search}%`));
    }

    // Build order by clause
    const orderBy = sort
      ? sort.direction === "asc"
        ? [asc(subscriptions[sort.field])]
        : [desc(subscriptions[sort.field])]
      : [asc(subscriptions.name)];

    return await db.query.subscriptions.findMany({
      where: and(...conditions),
      orderBy,
      with: {
        payee: true,
        account: true,
        priceHistory: {
          orderBy: [desc(subscriptionPriceHistory.effectiveDate)],
          limit: 1,
        },
        alerts: {
          where: eq(subscriptionAlerts.isDismissed, false),
        },
      },
    });
  }

  async getByPayeeId(payeeId: number, workspaceId: number): Promise<Subscription | null> {
    const result = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.payeeId, payeeId),
        eq(subscriptions.workspaceId, workspaceId),
        isNull(subscriptions.deletedAt)
      ),
    });
    return result ?? null;
  }

  async getByAccountId(accountId: number, workspaceId: number): Promise<SubscriptionWithRelations[]> {
    return await db.query.subscriptions.findMany({
      where: and(
        eq(subscriptions.accountId, accountId),
        eq(subscriptions.workspaceId, workspaceId),
        isNull(subscriptions.deletedAt)
      ),
      with: {
        payee: true,
        account: true,
        priceHistory: {
          orderBy: [desc(subscriptionPriceHistory.effectiveDate)],
          limit: 1,
        },
        alerts: {
          where: eq(subscriptionAlerts.isDismissed, false),
        },
      },
    });
  }

  async getUpcomingRenewals(workspaceId: number, days: number): Promise<SubscriptionWithRelations[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    const todayStr = today.toISOString().split("T")[0]!;
    const futureDateStr = futureDate.toISOString().split("T")[0]!;

    return await db.query.subscriptions.findMany({
      where: and(
        eq(subscriptions.workspaceId, workspaceId),
        eq(subscriptions.status, "active"),
        isNull(subscriptions.deletedAt),
        gte(subscriptions.renewalDate, todayStr),
        lte(subscriptions.renewalDate, futureDateStr)
      ),
      orderBy: [asc(subscriptions.renewalDate)],
      with: {
        payee: true,
        account: true,
        priceHistory: {
          orderBy: [desc(subscriptionPriceHistory.effectiveDate)],
          limit: 1,
        },
        alerts: true,
      },
    });
  }

  async getTrialsEndingSoon(workspaceId: number, days: number): Promise<SubscriptionWithRelations[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    const todayStr = today.toISOString().split("T")[0]!;
    const futureDateStr = futureDate.toISOString().split("T")[0]!;

    return await db.query.subscriptions.findMany({
      where: and(
        eq(subscriptions.workspaceId, workspaceId),
        eq(subscriptions.status, "trial"),
        isNull(subscriptions.deletedAt),
        gte(subscriptions.trialEndsAt, todayStr),
        lte(subscriptions.trialEndsAt, futureDateStr)
      ),
      orderBy: [asc(subscriptions.trialEndsAt)],
      with: {
        payee: true,
        account: true,
        priceHistory: true,
        alerts: true,
      },
    });
  }

  // ==================== PRICE HISTORY ====================

  async addPriceHistory(data: InsertSubscriptionPriceHistory): Promise<SubscriptionPriceHistory> {
    const [result] = await db.insert(subscriptionPriceHistory).values(data).returning();
    return result!;
  }

  async getPriceHistory(subscriptionId: number, limit?: number): Promise<SubscriptionPriceHistory[]> {
    return await db.query.subscriptionPriceHistory.findMany({
      where: eq(subscriptionPriceHistory.subscriptionId, subscriptionId),
      orderBy: [desc(subscriptionPriceHistory.effectiveDate)],
      limit: limit ?? 50,
    });
  }

  async getLatestPrice(subscriptionId: number): Promise<SubscriptionPriceHistory | null> {
    const result = await db.query.subscriptionPriceHistory.findFirst({
      where: eq(subscriptionPriceHistory.subscriptionId, subscriptionId),
      orderBy: [desc(subscriptionPriceHistory.effectiveDate)],
    });
    return result ?? null;
  }

  // ==================== ALERTS ====================

  async createAlert(data: InsertSubscriptionAlert): Promise<SubscriptionAlert> {
    const [result] = await db.insert(subscriptionAlerts).values(data).returning();
    return result!;
  }

  async getAlerts(workspaceId: number, includeDismissed = false): Promise<SubscriptionAlert[]> {
    const conditions = [eq(subscriptionAlerts.workspaceId, workspaceId)];
    if (!includeDismissed) {
      conditions.push(eq(subscriptionAlerts.isDismissed, false));
    }

    return await db.query.subscriptionAlerts.findMany({
      where: and(...conditions),
      orderBy: [desc(subscriptionAlerts.triggerDate)],
    });
  }

  async getAlertsWithSubscriptions(
    workspaceId: number,
    includeDismissed = false
  ): Promise<Array<SubscriptionAlert & { subscription: Subscription }>> {
    const conditions = [eq(subscriptionAlerts.workspaceId, workspaceId)];
    if (!includeDismissed) {
      conditions.push(eq(subscriptionAlerts.isDismissed, false));
    }

    const results = await db.query.subscriptionAlerts.findMany({
      where: and(...conditions),
      orderBy: [desc(subscriptionAlerts.triggerDate)],
      with: {
        subscription: true,
      },
    });

    return results as Array<SubscriptionAlert & { subscription: Subscription }>;
  }

  async dismissAlert(alertId: number, workspaceId: number): Promise<boolean> {
    const [result] = await db
      .update(subscriptionAlerts)
      .set({ isDismissed: true })
      .where(and(eq(subscriptionAlerts.id, alertId), eq(subscriptionAlerts.workspaceId, workspaceId)))
      .returning();
    return !!result;
  }

  async markAlertActioned(alertId: number, workspaceId: number): Promise<boolean> {
    const [result] = await db
      .update(subscriptionAlerts)
      .set({ isActioned: true })
      .where(and(eq(subscriptionAlerts.id, alertId), eq(subscriptionAlerts.workspaceId, workspaceId)))
      .returning();
    return !!result;
  }

  async deleteAlertsForSubscription(subscriptionId: number): Promise<void> {
    await db.delete(subscriptionAlerts).where(eq(subscriptionAlerts.subscriptionId, subscriptionId));
  }

  async getExistingAlert(
    subscriptionId: number,
    alertType: SubscriptionAlert["alertType"],
    triggerDate: string
  ): Promise<SubscriptionAlert | null> {
    const result = await db.query.subscriptionAlerts.findFirst({
      where: and(
        eq(subscriptionAlerts.subscriptionId, subscriptionId),
        eq(subscriptionAlerts.alertType, alertType),
        eq(subscriptionAlerts.triggerDate, triggerDate),
        eq(subscriptionAlerts.isDismissed, false)
      ),
    });
    return result ?? null;
  }

  // ==================== ANALYTICS ====================

  async getAnalyticsData(workspaceId: number): Promise<{
    subscriptions: Subscription[];
    priceChanges: SubscriptionPriceHistory[];
  }> {
    const subs = await db.query.subscriptions.findMany({
      where: and(eq(subscriptions.workspaceId, workspaceId), isNull(subscriptions.deletedAt)),
    });

    const subIds = subs.map((s) => s.id);
    const priceChanges =
      subIds.length > 0
        ? await db.query.subscriptionPriceHistory.findMany({
            where: inArray(subscriptionPriceHistory.subscriptionId, subIds),
            orderBy: [desc(subscriptionPriceHistory.effectiveDate)],
          })
        : [];

    return { subscriptions: subs, priceChanges };
  }

  async getCalendarData(
    workspaceId: number,
    startDate: string,
    endDate: string
  ): Promise<SubscriptionWithRelations[]> {
    return await db.query.subscriptions.findMany({
      where: and(
        eq(subscriptions.workspaceId, workspaceId),
        isNull(subscriptions.deletedAt),
        or(
          // Renewals in range
          and(gte(subscriptions.renewalDate, startDate), lte(subscriptions.renewalDate, endDate)),
          // Trial ends in range
          and(gte(subscriptions.trialEndsAt, startDate), lte(subscriptions.trialEndsAt, endDate)),
          // Cancellations in range
          and(gte(subscriptions.cancelledAt, startDate), lte(subscriptions.cancelledAt, endDate))
        )
      ),
      with: {
        payee: true,
        account: true,
        priceHistory: true,
        alerts: true,
      },
    });
  }
}
