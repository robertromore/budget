import type { SubscriptionAlertType } from "$lib/schema/subscriptions-table";
import type { SubscriptionRepository } from "./repository";
import type { CreateAlertInput, Subscription } from "./types";

interface AlertConfig {
  renewalReminderDays: number;
  trialEndingDays: number;
  unusedAlertDays: number;
  priceIncreaseThreshold: number; // percentage
}

const DEFAULT_ALERT_CONFIG: AlertConfig = {
  renewalReminderDays: 7,
  trialEndingDays: 3,
  unusedAlertDays: 60,
  priceIncreaseThreshold: 5,
};

export class SubscriptionAlertService {
  constructor(
    private repository: SubscriptionRepository,
    private config: AlertConfig = DEFAULT_ALERT_CONFIG
  ) {}

  /**
   * Generate all pending alerts for a workspace
   */
  async generateAlerts(workspaceId: number): Promise<CreateAlertInput[]> {
    const alerts: CreateAlertInput[] = [];
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0]!;

    // Get all active and trial subscriptions
    const subscriptions = await this.repository.getAll(workspaceId, {
      status: ["active", "trial"],
    });

    for (const subscription of subscriptions) {
      // Check for upcoming renewals
      const renewalAlerts = await this.checkRenewalAlerts(subscription, today, todayStr);
      alerts.push(...renewalAlerts);

      // Check for trial ending
      const trialAlerts = await this.checkTrialAlerts(subscription, today, todayStr);
      alerts.push(...trialAlerts);

      // Check for price increases
      const priceAlerts = await this.checkPriceAlerts(subscription, todayStr);
      alerts.push(...priceAlerts);
    }

    // Filter out alerts that already exist
    const uniqueAlerts: CreateAlertInput[] = [];
    for (const alert of alerts) {
      const existing = await this.repository.getExistingAlert(
        alert.subscriptionId,
        alert.alertType,
        alert.triggerDate
      );
      if (!existing) {
        uniqueAlerts.push(alert);
      }
    }

    return uniqueAlerts;
  }

  /**
   * Create alerts that were generated
   */
  async createGeneratedAlerts(workspaceId: number, alerts: CreateAlertInput[]): Promise<number> {
    let created = 0;
    for (const alert of alerts) {
      await this.repository.createAlert({
        ...alert,
        workspaceId,
      });
      created++;
    }
    return created;
  }

  /**
   * Check for upcoming renewal alerts
   */
  private async checkRenewalAlerts(
    subscription: Subscription,
    today: Date,
    todayStr: string
  ): Promise<CreateAlertInput[]> {
    const alerts: CreateAlertInput[] = [];

    if (!subscription.renewalDate || subscription.status !== "active") {
      return alerts;
    }

    // Get user preferences or use defaults
    const prefs = subscription.alertPreferences as {
      renewalReminder?: boolean;
      renewalReminderDays?: number;
    } | null;

    if (prefs?.renewalReminder === false) {
      return alerts;
    }

    const reminderDays = prefs?.renewalReminderDays ?? this.config.renewalReminderDays;
    const renewalDate = new Date(subscription.renewalDate);
    const daysUntilRenewal = Math.ceil(
      (renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilRenewal > 0 && daysUntilRenewal <= reminderDays) {
      alerts.push({
        subscriptionId: subscription.id,
        alertType: "renewal_upcoming",
        triggerDate: todayStr,
        metadata: {
          renewalDate: subscription.renewalDate,
          daysUntil: daysUntilRenewal,
          amount: subscription.amount,
        },
      });
    }

    return alerts;
  }

  /**
   * Check for trial ending alerts
   */
  private async checkTrialAlerts(
    subscription: Subscription,
    today: Date,
    todayStr: string
  ): Promise<CreateAlertInput[]> {
    const alerts: CreateAlertInput[] = [];

    if (!subscription.trialEndsAt || subscription.status !== "trial") {
      return alerts;
    }

    const trialEndDate = new Date(subscription.trialEndsAt);
    const daysUntilTrialEnd = Math.ceil(
      (trialEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilTrialEnd > 0 && daysUntilTrialEnd <= this.config.trialEndingDays) {
      alerts.push({
        subscriptionId: subscription.id,
        alertType: "trial_ending",
        triggerDate: todayStr,
        metadata: {
          trialEndsAt: subscription.trialEndsAt,
          daysUntil: daysUntilTrialEnd,
          amountAfterTrial: subscription.amount,
        },
      });
    }

    return alerts;
  }

  /**
   * Check for price increase alerts
   */
  private async checkPriceAlerts(
    subscription: Subscription,
    todayStr: string
  ): Promise<CreateAlertInput[]> {
    const alerts: CreateAlertInput[] = [];

    // Get user preferences
    const prefs = subscription.alertPreferences as {
      priceChangeAlert?: boolean;
    } | null;

    if (prefs?.priceChangeAlert === false) {
      return alerts;
    }

    // Get recent price history
    const priceHistory = await this.repository.getPriceHistory(subscription.id, 2);

    if (priceHistory.length >= 2) {
      const current = priceHistory[0]!;
      const previous = priceHistory[1]!;

      if (current.changeType === "increase" && current.changePercentage) {
        if (current.changePercentage >= this.config.priceIncreaseThreshold) {
          // Only alert if this is a recent change (within last 7 days)
          const changeDate = new Date(current.effectiveDate);
          const daysSinceChange = Math.ceil(
            (new Date().getTime() - changeDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysSinceChange <= 7) {
            alerts.push({
              subscriptionId: subscription.id,
              alertType: "price_increase",
              triggerDate: todayStr,
              metadata: {
                previousAmount: previous.amount,
                newAmount: current.amount,
                changePercentage: current.changePercentage,
                effectiveDate: current.effectiveDate,
              },
            });
          }
        }
      }
    }

    return alerts;
  }

  /**
   * Create a confirmation needed alert for newly detected subscriptions
   */
  createConfirmationAlert(subscriptionId: number, todayStr: string): CreateAlertInput {
    return {
      subscriptionId,
      alertType: "confirmation_needed",
      triggerDate: todayStr,
      metadata: {
        message: "Please confirm if this is a subscription you want to track",
      },
    };
  }

  /**
   * Create a duplicate detected alert
   */
  createDuplicateAlert(
    subscriptionId: number,
    duplicateOfId: number,
    todayStr: string
  ): CreateAlertInput {
    return {
      subscriptionId,
      alertType: "duplicate_detected",
      triggerDate: todayStr,
      metadata: {
        duplicateOfId,
        message: "This subscription may be a duplicate of an existing one",
      },
    };
  }

  /**
   * Create a payment failed alert
   */
  createPaymentFailedAlert(
    subscriptionId: number,
    expectedDate: string,
    todayStr: string
  ): CreateAlertInput {
    return {
      subscriptionId,
      alertType: "payment_failed",
      triggerDate: todayStr,
      metadata: {
        expectedDate,
        message: "Expected payment was not found for this subscription",
      },
    };
  }
}
