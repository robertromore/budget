import { payees } from "$lib/schema/payees";
import type { BillingCycle } from "$lib/schema/subscriptions";
import { db } from "$lib/server/db";
import { eq, isNull } from "drizzle-orm";
import { SubscriptionAlertService } from "./alerts";
import { SubscriptionDetectionService } from "./detection";
import { SubscriptionRepository } from "./repository";
import type {
  AlertWithSubscription,
  CalendarEntry,
  ConfirmDetectionInput,
  CreateSubscriptionInput,
  DetectionOptions,
  DetectionResult,
  PriceChange,
  RecordPriceChangeInput,
  Subscription,
  SubscriptionAnalytics,
  SubscriptionFilters,
  SubscriptionSortOptions,
  SubscriptionWithRelations,
  TransactionBasedDetectionOptions,
  TransactionBasedDetectionResult,
  UpdateSubscriptionInput,
} from "./types";

export class SubscriptionService {
  private repository: SubscriptionRepository;
  private detectionService: SubscriptionDetectionService;
  private alertService: SubscriptionAlertService;

  constructor() {
    this.repository = new SubscriptionRepository();
    this.detectionService = new SubscriptionDetectionService();
    this.alertService = new SubscriptionAlertService(this.repository);
  }

  // ==================== CRUD OPERATIONS ====================

  async create(input: CreateSubscriptionInput, workspaceId: number): Promise<Subscription> {
    const subscription = await this.repository.create({
      workspaceId,
      payeeId: input.payeeId ?? null,
      accountId: input.accountId ?? null,
      name: input.name,
      type: input.type,
      billingCycle: input.billingCycle,
      amount: input.amount,
      currency: input.currency ?? "USD",
      status: input.status ?? "active",
      startDate: input.startDate ?? new Date().toISOString().split("T")[0],
      renewalDate: input.renewalDate,
      trialEndsAt: input.trialEndsAt,
      detectionConfidence: input.detectionConfidence ?? 0,
      isManuallyAdded: input.isManuallyAdded ?? false,
      isUserConfirmed: input.isUserConfirmed ?? false,
      autoRenewal: input.autoRenewal ?? true,
      metadata: input.metadata ?? null,
      alertPreferences: input.alertPreferences ?? null,
    });

    // Record initial price
    await this.repository.addPriceHistory({
      subscriptionId: subscription.id,
      amount: input.amount,
      previousAmount: null,
      effectiveDate: input.startDate ?? new Date().toISOString().split("T")[0]!,
      changeType: "initial",
      changePercentage: null,
    });

    return subscription;
  }

  async update(input: UpdateSubscriptionInput, workspaceId: number): Promise<Subscription | null> {
    const existing = await this.repository.getById(input.id, workspaceId);
    if (!existing) return null;

    // Check for price change
    if (input.amount !== undefined && input.amount !== existing.amount) {
      const changePercentage = ((input.amount - existing.amount) / existing.amount) * 100;
      await this.repository.addPriceHistory({
        subscriptionId: input.id,
        amount: input.amount,
        previousAmount: existing.amount,
        effectiveDate: new Date().toISOString().split("T")[0]!,
        changeType: changePercentage > 0 ? "increase" : "decrease",
        changePercentage: Math.abs(changePercentage),
      });
    }

    // Convert null to undefined for optional fields (DB expects undefined, not null)
    const nullToUndefined = <T>(value: T | null | undefined): T | undefined =>
      value === null ? undefined : value;

    return await this.repository.update(input.id, workspaceId, {
      payeeId: input.payeeId,
      accountId: input.accountId,
      name: input.name,
      type: input.type,
      billingCycle: input.billingCycle,
      amount: input.amount,
      currency: nullToUndefined(input.currency),
      status: nullToUndefined(input.status),
      startDate: nullToUndefined(input.startDate),
      renewalDate: input.renewalDate,
      cancelledAt: input.cancelledAt,
      trialEndsAt: input.trialEndsAt,
      isUserConfirmed: input.isUserConfirmed,
      autoRenewal: input.autoRenewal,
      metadata: input.metadata,
      alertPreferences: input.alertPreferences,
    });
  }

  async delete(id: number, workspaceId: number): Promise<boolean> {
    return await this.repository.softDelete(id, workspaceId);
  }

  async getById(id: number, workspaceId: number): Promise<SubscriptionWithRelations | null> {
    return await this.repository.getById(id, workspaceId);
  }

  async getAll(
    workspaceId: number,
    filters?: SubscriptionFilters,
    sort?: SubscriptionSortOptions
  ): Promise<SubscriptionWithRelations[]> {
    return await this.repository.getAll(workspaceId, filters, sort);
  }

  async getByAccount(
    accountId: number,
    workspaceId: number
  ): Promise<SubscriptionWithRelations[]> {
    return await this.repository.getByAccountId(accountId, workspaceId);
  }

  // ==================== DETECTION OPERATIONS ====================

  async detectSubscriptions(
    workspaceId: number,
    options?: DetectionOptions
  ): Promise<DetectionResult[]> {
    // Get all payees for the workspace
    const allPayees = await db.query.payees.findMany({
      where: eq(payees.workspaceId, workspaceId),
    });

    // Get existing subscriptions to know which payees are already tracked
    const existingSubscriptions = await this.repository.getAll(workspaceId);
    const trackedPayeeIds = existingSubscriptions
      .filter((s) => s.payeeId !== null)
      .map((s) => s.payeeId!);

    return await this.detectionService.detectSubscriptions(allPayees, trackedPayeeIds, options);
  }

  async confirmSubscription(
    input: ConfirmDetectionInput,
    workspaceId: number
  ): Promise<Subscription> {
    // Check if subscription already exists for this payee
    const existing = await this.repository.getByPayeeId(input.payeeId, workspaceId);
    if (existing) {
      // Update existing subscription
      return (await this.repository.update(existing.id, workspaceId, {
        isUserConfirmed: true,
        name: input.name,
        type: input.type,
        billingCycle: input.billingCycle,
        amount: input.amount,
        accountId: input.accountId,
        renewalDate: input.renewalDate,
      }))!;
    }

    // Get payee details
    const payee = await db.query.payees.findFirst({
      where: eq(payees.id, input.payeeId),
    });

    if (!payee) {
      throw new Error("Payee not found");
    }

    // Create new subscription
    return await this.create(
      {
        payeeId: input.payeeId,
        accountId: input.accountId,
        name: input.name ?? payee.name ?? "Unknown Subscription",
        type: input.type ?? "other",
        billingCycle: input.billingCycle ?? "monthly",
        amount: input.amount ?? payee.avgAmount ?? 0,
        renewalDate: input.renewalDate,
        isUserConfirmed: true,
      },
      workspaceId
    );
  }

  async rejectSubscription(payeeId: number, workspaceId: number): Promise<void> {
    // Mark this payee as explicitly NOT a subscription
    // This could be stored in payee metadata or a separate rejection table
    const existing = await this.repository.getByPayeeId(payeeId, workspaceId);
    if (existing) {
      await this.repository.softDelete(existing.id, workspaceId);
    }

    // Update payee to mark it as rejected for subscription detection
    await db
      .update(payees)
      .set({
        subscriptionInfo: {
          isSubscription: false,
          rejectedAt: new Date().toISOString(),
        },
      })
      .where(eq(payees.id, payeeId));
  }

  /**
   * Detect subscriptions by analyzing transaction patterns directly
   * Similar to how budgets analyze transactions for recurring expenses
   */
  async detectFromTransactions(
    workspaceId: number,
    options?: TransactionBasedDetectionOptions
  ): Promise<TransactionBasedDetectionResult[]> {
    // Get existing subscriptions to know which payees are already tracked
    const existingSubscriptions = await this.repository.getAll(workspaceId);
    const trackedPayeeIds = existingSubscriptions
      .filter((s) => s.payeeId !== null)
      .map((s) => s.payeeId!);

    // Create a map of payee IDs to subscription IDs for already tracked items
    const payeeToSubscription = new Map<number, number>();
    for (const sub of existingSubscriptions) {
      if (sub.payeeId) {
        payeeToSubscription.set(sub.payeeId, sub.id);
      }
    }

    const results = await this.detectionService.detectFromTransactions(
      workspaceId,
      trackedPayeeIds,
      options
    );

    // Add existing subscription IDs to results
    return results.map((result) => ({
      ...result,
      existingSubscriptionId: payeeToSubscription.get(result.payeeId),
    }));
  }

  // ==================== PRICE TRACKING ====================

  async recordPriceChange(input: RecordPriceChangeInput, workspaceId: number): Promise<void> {
    const subscription = await this.repository.getById(input.subscriptionId, workspaceId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    const previousAmount = subscription.amount;
    const changePercentage = ((input.newAmount - previousAmount) / previousAmount) * 100;

    // Add to price history
    await this.repository.addPriceHistory({
      subscriptionId: input.subscriptionId,
      amount: input.newAmount,
      previousAmount,
      effectiveDate: input.effectiveDate ?? new Date().toISOString().split("T")[0]!,
      changeType: changePercentage > 0 ? "increase" : "decrease",
      changePercentage: Math.abs(changePercentage),
      detectedFromTransactionId: input.transactionId,
    });

    // Update subscription amount
    await this.repository.update(input.subscriptionId, workspaceId, {
      amount: input.newAmount,
    });
  }

  async getPriceHistory(subscriptionId: number, workspaceId: number) {
    const subscription = await this.repository.getById(subscriptionId, workspaceId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }
    return await this.repository.getPriceHistory(subscriptionId);
  }

  async detectPriceChanges(workspaceId: number): Promise<PriceChange[]> {
    // This would typically analyze recent transactions and compare against expected amounts
    // For now, returning based on price history
    const subscriptions = await this.repository.getAll(workspaceId, { status: "active" });
    const changes: PriceChange[] = [];

    for (const sub of subscriptions) {
      const history = await this.repository.getPriceHistory(sub.id, 2);
      if (history.length >= 2) {
        const current = history[0]!;
        const previous = history[1]!;

        if (current.changeType !== "initial") {
          changes.push({
            subscriptionId: sub.id,
            subscriptionName: sub.name,
            oldAmount: previous.amount,
            newAmount: current.amount,
            changePercentage: current.changePercentage ?? 0,
            effectiveDate: current.effectiveDate,
            transactionId: current.detectedFromTransactionId ?? undefined,
          });
        }
      }
    }

    return changes;
  }

  // ==================== ALERTS ====================

  async generateAndCreateAlerts(workspaceId: number): Promise<number> {
    const alerts = await this.alertService.generateAlerts(workspaceId);
    return await this.alertService.createGeneratedAlerts(workspaceId, alerts);
  }

  async getAlerts(workspaceId: number): Promise<AlertWithSubscription[]> {
    return await this.repository.getAlertsWithSubscriptions(workspaceId);
  }

  async dismissAlert(alertId: number, workspaceId: number): Promise<boolean> {
    return await this.repository.dismissAlert(alertId, workspaceId);
  }

  // ==================== ANALYTICS ====================

  async getAnalytics(workspaceId: number): Promise<SubscriptionAnalytics> {
    const { subscriptions, priceChanges } = await this.repository.getAnalyticsData(workspaceId);

    const activeSubscriptions = subscriptions.filter((s) => s.status === "active");

    // Calculate totals
    const totalMonthlyCost = subscriptions.reduce((sum, sub) => {
      if (sub.status !== "active") return sum;
      return sum + this.normalizeToMonthlyCost(sub.amount, sub.billingCycle);
    }, 0);

    // Group by status
    const byStatus: Record<string, number> = {};
    for (const sub of subscriptions) {
      byStatus[sub.status] = (byStatus[sub.status] ?? 0) + 1;
    }

    // Group by type
    const byType: Record<string, { count: number; monthlyCost: number }> = {};
    for (const sub of subscriptions) {
      if (!byType[sub.type]) {
        byType[sub.type] = { count: 0, monthlyCost: 0 };
      }
      byType[sub.type]!.count++;
      if (sub.status === "active") {
        byType[sub.type]!.monthlyCost += this.normalizeToMonthlyCost(sub.amount, sub.billingCycle);
      }
    }

    // Group by billing cycle
    const byBillingCycle: Record<string, number> = {};
    for (const sub of subscriptions) {
      byBillingCycle[sub.billingCycle] = (byBillingCycle[sub.billingCycle] ?? 0) + 1;
    }

    // Price change stats
    const increases = priceChanges.filter((p) => p.changeType === "increase");
    const decreases = priceChanges.filter((p) => p.changeType === "decrease");
    const avgIncreasePercent =
      increases.length > 0
        ? increases.reduce((sum, p) => sum + (p.changePercentage ?? 0), 0) / increases.length
        : 0;

    // Upcoming renewals and trials
    const today = new Date();
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);

    const upcomingRenewals = activeSubscriptions.filter((s) => {
      if (!s.renewalDate) return false;
      const renewalDate = new Date(s.renewalDate);
      return renewalDate >= today && renewalDate <= sevenDaysLater;
    }).length;

    const trialEnding = subscriptions.filter((s) => {
      if (s.status !== "trial" || !s.trialEndsAt) return false;
      const trialEnd = new Date(s.trialEndsAt);
      return trialEnd >= today && trialEnd <= sevenDaysLater;
    }).length;

    return {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: activeSubscriptions.length,
      totalMonthlyCost,
      totalAnnualCost: totalMonthlyCost * 12,
      byStatus,
      byType,
      byBillingCycle,
      averageSubscriptionCost:
        activeSubscriptions.length > 0 ? totalMonthlyCost / activeSubscriptions.length : 0,
      priceChangeStats: {
        totalIncreases: increases.length,
        totalDecreases: decreases.length,
        averageIncreasePercent: avgIncreasePercent,
      },
      upcomingRenewals,
      trialEnding,
    };
  }

  async getUpcomingRenewals(
    workspaceId: number,
    days: number = 30
  ): Promise<SubscriptionWithRelations[]> {
    return await this.repository.getUpcomingRenewals(workspaceId, days);
  }

  async getCalendarView(
    workspaceId: number,
    startDate: string,
    endDate: string
  ): Promise<CalendarEntry[]> {
    const subscriptions = await this.repository.getCalendarData(workspaceId, startDate, endDate);

    // Build calendar entries
    const entriesMap = new Map<string, CalendarEntry>();

    for (const sub of subscriptions) {
      // Add renewal date entry
      if (sub.renewalDate && sub.status === "active") {
        const existing = entriesMap.get(sub.renewalDate) ?? {
          date: sub.renewalDate,
          subscriptions: [],
          totalAmount: 0,
        };
        existing.subscriptions.push({
          id: sub.id,
          name: sub.name,
          amount: sub.amount,
          type: sub.type,
          eventType: "renewal",
        });
        existing.totalAmount += sub.amount;
        entriesMap.set(sub.renewalDate, existing);
      }

      // Add trial end date entry
      if (sub.trialEndsAt && sub.status === "trial") {
        const existing = entriesMap.get(sub.trialEndsAt) ?? {
          date: sub.trialEndsAt,
          subscriptions: [],
          totalAmount: 0,
        };
        existing.subscriptions.push({
          id: sub.id,
          name: sub.name,
          amount: sub.amount,
          type: sub.type,
          eventType: "trial_end",
        });
        entriesMap.set(sub.trialEndsAt, existing);
      }

      // Add cancellation date entry
      if (sub.cancelledAt) {
        const existing = entriesMap.get(sub.cancelledAt) ?? {
          date: sub.cancelledAt,
          subscriptions: [],
          totalAmount: 0,
        };
        existing.subscriptions.push({
          id: sub.id,
          name: sub.name,
          amount: sub.amount,
          type: sub.type,
          eventType: "cancelled",
        });
        entriesMap.set(sub.cancelledAt, existing);
      }
    }

    // Sort by date
    return Array.from(entriesMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  // ==================== HELPER METHODS ====================

  private normalizeToMonthlyCost(amount: number, billingCycle: BillingCycle): number {
    switch (billingCycle) {
      case "daily":
        return amount * 30;
      case "weekly":
        return amount * 4.33;
      case "monthly":
        return amount;
      case "quarterly":
        return amount / 3;
      case "semi_annual":
        return amount / 6;
      case "annual":
        return amount / 12;
      case "irregular":
        return amount; // Assume monthly for irregular
    }
  }
}
