import type { PriceAlert } from "$core/schema/price-alerts";
import { notifications } from "$core/schema/notifications";
import { db } from "$core/server/db";
import { AlertRepository } from "./alert-repository";

export interface AlertTriggerResult {
  alert: PriceAlert;
  triggered: boolean;
  reason?: string;
}

export class AlertService {
  constructor(private alertRepo: AlertRepository) {}

  /**
   * Evaluate all enabled alerts for a product after a price check.
   * targetPrice is passed from the product record by the caller.
   */
  async evaluateAlerts(
    productId: number,
    oldPrice: number,
    newPrice: number,
    inStock: boolean,
    wasInStock: boolean,
    targetPrice?: number | null,
    productName?: string
  ): Promise<AlertTriggerResult[]> {
    const alerts = await this.alertRepo.findEnabled(productId);
    const results: AlertTriggerResult[] = [];

    for (const alert of alerts) {
      const triggered = this.shouldTrigger(alert, oldPrice, newPrice, inStock, wasInStock, targetPrice);

      if (triggered.triggered) {
        await this.alertRepo.markTriggered(alert.id);
        await this.createNotification(alert, triggered.reason, productName);
      }

      results.push(triggered);
    }

    return results;
  }

  private async createNotification(
    alert: PriceAlert,
    reason?: string,
    productName?: string
  ): Promise<void> {
    try {
      const title = productName
        ? `Price Alert: ${productName}`
        : "Price Alert";

      await db.insert(notifications).values({
        id: crypto.randomUUID(),
        workspaceId: alert.workspaceId,
        type: alert.type === "back_in_stock" ? "success" : "warning",
        title,
        description: reason ?? null,
        createdAt: new Date(),
        read: false,
        persistent: true,
      });
    } catch {
      // Don't fail the price check if notification creation fails
    }
  }

  private shouldTrigger(
    alert: PriceAlert,
    oldPrice: number,
    newPrice: number,
    inStock: boolean,
    wasInStock: boolean,
    targetPrice?: number | null
  ): AlertTriggerResult {
    switch (alert.type) {
      case "price_drop": {
        if (newPrice >= oldPrice) {
          return { alert, triggered: false };
        }
        const dropPercent = ((oldPrice - newPrice) / oldPrice) * 100;
        const threshold = alert.threshold ?? 0;
        if (dropPercent >= threshold) {
          return {
            alert,
            triggered: true,
            reason: `Price dropped ${dropPercent.toFixed(1)}% (from $${oldPrice.toFixed(2)} to $${newPrice.toFixed(2)})`,
          };
        }
        return { alert, triggered: false };
      }

      case "target_reached": {
        if (targetPrice !== null && targetPrice !== undefined && newPrice <= targetPrice) {
          return {
            alert,
            triggered: true,
            reason: `Price $${newPrice.toFixed(2)} reached target $${targetPrice.toFixed(2)}`,
          };
        }
        return { alert, triggered: false };
      }

      case "back_in_stock": {
        if (!wasInStock && inStock) {
          return {
            alert,
            triggered: true,
            reason: "Product is back in stock",
          };
        }
        return { alert, triggered: false };
      }

      case "any_change": {
        if (Math.abs(newPrice - oldPrice) > 0.01) {
          return {
            alert,
            triggered: true,
            reason: `Price changed from $${oldPrice.toFixed(2)} to $${newPrice.toFixed(2)}`,
          };
        }
        return { alert, triggered: false };
      }

      default:
        return { alert, triggered: false };
    }
  }

  async createAlert(data: {
    productId: number;
    workspaceId: number;
    type: "price_drop" | "target_reached" | "back_in_stock" | "any_change";
    threshold?: number | null;
    enabled?: boolean;
  }): Promise<PriceAlert> {
    return this.alertRepo.create({
      productId: data.productId,
      workspaceId: data.workspaceId,
      type: data.type,
      threshold: data.threshold ?? null,
      enabled: data.enabled ?? true,
    });
  }

  async updateAlert(
    id: number,
    data: { type?: "price_drop" | "target_reached" | "back_in_stock" | "any_change"; threshold?: number | null; enabled?: boolean }
  ): Promise<PriceAlert> {
    return this.alertRepo.update(id, data);
  }

  async deleteAlert(id: number): Promise<void> {
    await this.alertRepo.delete(id);
  }

  async getAlertsByProduct(productId: number): Promise<PriceAlert[]> {
    return this.alertRepo.findByProduct(productId);
  }

  async getAllAlerts(workspaceId: number): Promise<PriceAlert[]> {
    return this.alertRepo.findAllByWorkspace(workspaceId);
  }
}
