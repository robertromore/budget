import type { MetricAlert } from "$lib/schema/metric-alerts";
import { notifications } from "$lib/schema/notifications";
import { transactions } from "$lib/schema/transactions";
import { db } from "$lib/server/db";
import { NotFoundError, ValidationError } from "$lib/server/shared/types/errors";
import { getCurrentTimestamp } from "$lib/utils/dates";
import { and, eq, gte, isNull, lt, sql, sum } from "drizzle-orm";
import type { MetricAlertRepository } from "./repository";

export interface CreateAlertInput {
  name: string;
  metricType: "monthly_spending" | "category_spending" | "account_spending";
  conditionType: "above" | "below";
  threshold: number;
  accountId?: number;
  categoryId?: number;
  isActive?: boolean;
  metadata?: {
    calculationMethod?: string;
    dataPointCount?: number;
    selectedMonths?: string[];
  };
}

export interface EvaluationResult {
  checked: number;
  triggered: number;
  alerts: Array<{
    id: number;
    name: string;
    triggered: boolean;
    currentValue: number;
  }>;
}

export class MetricAlertService {
  constructor(private repository: MetricAlertRepository) {}

  async createAlert(data: CreateAlertInput, workspaceId: number): Promise<MetricAlert> {
    if (data.metricType === "category_spending" && !data.categoryId) {
      throw new ValidationError("Category ID is required for category spending alerts");
    }
    if (data.metricType === "account_spending" && !data.accountId) {
      throw new ValidationError("Account ID is required for account spending alerts");
    }

    return await this.repository.create(
      {
        name: data.name,
        metricType: data.metricType,
        conditionType: data.conditionType,
        threshold: data.threshold,
        accountId: data.accountId ?? null,
        categoryId: data.categoryId ?? null,
        isActive: data.isActive ?? true,
        metadata: data.metadata ?? {},
        workspaceId,
      },
      workspaceId
    );
  }

  async updateAlert(
    id: number,
    data: {
      name?: string;
      conditionType?: "above" | "below";
      threshold?: number;
      isActive?: boolean;
      metadata?: Record<string, unknown>;
    },
    workspaceId: number
  ): Promise<MetricAlert> {
    await this.getAlertById(id, workspaceId);
    return await this.repository.update(id, data, workspaceId);
  }

  async deleteAlert(id: number, workspaceId: number): Promise<void> {
    await this.getAlertById(id, workspaceId);
    await this.repository.softDelete(id, workspaceId);
  }

  async getAlertById(id: number, workspaceId: number): Promise<MetricAlert> {
    const alert = await this.repository.findById(id, workspaceId);
    if (!alert) {
      throw new NotFoundError("MetricAlert", id);
    }
    return alert;
  }

  async getAllAlerts(workspaceId: number): Promise<MetricAlert[]> {
    return await this.repository.findAllByWorkspace(workspaceId);
  }

  async toggleAlert(id: number, workspaceId: number): Promise<MetricAlert> {
    const alert = await this.getAlertById(id, workspaceId);
    return await this.repository.update(id, { isActive: !alert.isActive }, workspaceId);
  }

  async evaluateAlerts(workspaceId: number): Promise<EvaluationResult> {
    const activeAlerts = await this.repository.findAllActive(workspaceId);
    const results: EvaluationResult = { checked: 0, triggered: 0, alerts: [] };

    // Current month boundaries
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      .toISOString()
      .split("T")[0];

    for (const alert of activeAlerts) {
      const currentValue = await this.getCurrentMetricValue(
        alert,
        workspaceId,
        monthStart!,
        monthEnd!
      );

      const triggered =
        alert.conditionType === "above"
          ? currentValue > alert.threshold
          : currentValue < alert.threshold;

      results.checked++;
      results.alerts.push({
        id: alert.id,
        name: alert.name,
        triggered,
        currentValue,
      });

      if (triggered) {
        results.triggered++;
        await this.repository.markTriggered(alert.id, workspaceId);

        // Create in-app notification
        const direction = alert.conditionType === "above" ? "exceeded" : "fell below";
        await db.insert(notifications).values({
          id: crypto.randomUUID(),
          workspaceId,
          type: "warning",
          title: `Alert: ${alert.name}`,
          description: `Current spending ($${currentValue.toFixed(2)}) has ${direction} your threshold of $${alert.threshold.toFixed(2)}`,
          createdAt: new Date(),
          read: false,
        });
      } else {
        await this.repository.markChecked(alert.id, workspaceId);
      }
    }

    return results;
  }

  private async getCurrentMetricValue(
    alert: MetricAlert,
    workspaceId: number,
    monthStart: string,
    monthEnd: string
  ): Promise<number> {
    const conditions = [
      eq(transactions.workspaceId, workspaceId),
      gte(transactions.date, monthStart),
      lt(transactions.date, monthEnd),
      isNull(transactions.deletedAt),
    ];

    if (alert.metricType === "category_spending" && alert.categoryId) {
      conditions.push(eq(transactions.categoryId, alert.categoryId));
    }

    if (alert.metricType === "account_spending" && alert.accountId) {
      conditions.push(eq(transactions.accountId, alert.accountId));
    }

    const [result] = await db
      .select({
        total: sum(sql`ABS(${transactions.amount})`),
      })
      .from(transactions)
      .where(and(...conditions));

    return Number(result?.total ?? 0);
  }
}
