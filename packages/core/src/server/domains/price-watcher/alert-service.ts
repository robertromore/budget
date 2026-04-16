import type { PriceAlert } from "$core/schema/price-alerts";
import type { PriceWatcherPreferences } from "$core/schema/workspaces";
import { notifications } from "$core/schema/notifications";
import { workspaces } from "$core/schema/workspaces";
import { users } from "$core/schema/users";
import { priceProducts } from "$core/schema/price-products";
import { db } from "$core/server/db";
import { sendEmail } from "$core/server/email";
import { priceAlertEmail } from "$core/server/email/templates";
import { getEnv } from "$core/server/env";
import { eq } from "drizzle-orm";
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
    workspaceId: number,
    oldPrice: number,
    newPrice: number,
    inStock: boolean,
    wasInStock: boolean,
    targetPrice?: number | null,
    productName?: string
  ): Promise<AlertTriggerResult[]> {
    const alerts = await this.alertRepo.findEnabled(productId, workspaceId);
    const results: AlertTriggerResult[] = [];

    for (const alert of alerts) {
      const triggered = this.shouldTrigger(alert, oldPrice, newPrice, inStock, wasInStock, targetPrice);

      if (triggered.triggered) {
        await this.alertRepo.markTriggered(alert.id);
        await this.createNotification(alert, triggered.reason, productName);
        await this.sendAlertEmail(alert, triggered.reason, productName, newPrice);
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

  private async sendAlertEmail(
    alert: PriceAlert,
    reason?: string,
    productName?: string,
    currentPrice?: number | null
  ): Promise<void> {
    try {
      // Check notification preferences
      const prefs = await this.getNotificationPrefs(alert.workspaceId);
      if (!this.isEmailEnabledForType(alert.type, prefs)) return;

      // Get workspace owner email
      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, alert.workspaceId),
      });
      if (!workspace?.ownerId) return;

      const owner = await db.query.users.findFirst({
        where: eq(users.id, workspace.ownerId),
      });
      if (!owner?.email) return;

      // Get product URL for the email link
      const product = await db.query.priceProducts.findFirst({
        where: eq(priceProducts.id, alert.productId),
      });

      const appUrl = getEnv("BETTER_AUTH_URL") || getEnv("PUBLIC_APP_URL") || "";

      const email = priceAlertEmail({
        productName: productName ?? "Product",
        reason: reason ?? "Price alert triggered",
        alertType: alert.type,
        currentPrice,
        productUrl: product?.url,
        appUrl,
      });

      await sendEmail({
        to: owner.email,
        ...email,
      });
    } catch {
      // Don't fail the price check if email sending fails
    }
  }

  private async getNotificationPrefs(workspaceId: number): Promise<PriceWatcherPreferences["notifications"]> {
    try {
      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
      });
      if (!workspace?.preferences) return undefined;
      const parsed = typeof workspace.preferences === "string"
        ? JSON.parse(workspace.preferences)
        : workspace.preferences;
      return parsed?.priceWatcher?.notifications;
    } catch {
      return undefined;
    }
  }

  private isEmailEnabledForType(
    type: string,
    prefs?: PriceWatcherPreferences["notifications"]
  ): boolean {
    // Default: all enabled except anyChange
    if (!prefs) {
      return type !== "any_change";
    }
    switch (type) {
      case "price_drop": return prefs.priceDrop !== false;
      case "target_reached": return prefs.targetReached !== false;
      case "back_in_stock": return prefs.backInStock !== false;
      case "any_change": return prefs.anyChange === true;
      default: return true;
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
    data: {
      type?: "price_drop" | "target_reached" | "back_in_stock" | "any_change";
      threshold?: number | null;
      enabled?: boolean;
    },
    workspaceId: number
  ): Promise<PriceAlert> {
    return this.alertRepo.update(id, data, workspaceId);
  }

  async deleteAlert(id: number, workspaceId: number): Promise<void> {
    await this.alertRepo.delete(id, workspaceId);
  }

  async getAlertsByProduct(productId: number, workspaceId: number): Promise<PriceAlert[]> {
    return this.alertRepo.findByProduct(productId, workspaceId);
  }

  async getAllAlerts(workspaceId: number): Promise<PriceAlert[]> {
    return this.alertRepo.findAllByWorkspace(workspaceId);
  }
}
