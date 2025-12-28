/**
 * Automation Event Emitter
 *
 * A simple event bus for automation rule triggers.
 * Services emit events when entities change, and the rule engine subscribes to them.
 */

import type { EntityType, RuleEvent } from "$lib/types/automation";

/**
 * Event listener callback type
 */
type EventListener<T = unknown> = (event: RuleEvent<T>) => void | Promise<void>;

/**
 * Event key format: "entityType.event" (e.g., "transaction.created")
 */
type EventKey = `${EntityType}.${string}`;

/**
 * Automation Event Emitter singleton
 */
class AutomationEventEmitter {
  private listeners = new Map<EventKey, Set<EventListener>>();
  private wildcardListeners = new Map<EntityType, Set<EventListener>>();

  /**
   * Subscribe to a specific event
   */
  on<T = unknown>(entityType: EntityType, event: string, listener: EventListener<T>): () => void {
    const key: EventKey = `${entityType}.${event}`;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(listener as EventListener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(key)?.delete(listener as EventListener);
    };
  }

  /**
   * Subscribe to all events for an entity type
   */
  onAll<T = unknown>(entityType: EntityType, listener: EventListener<T>): () => void {
    if (!this.wildcardListeners.has(entityType)) {
      this.wildcardListeners.set(entityType, new Set());
    }
    this.wildcardListeners.get(entityType)!.add(listener as EventListener);

    // Return unsubscribe function
    return () => {
      this.wildcardListeners.get(entityType)?.delete(listener as EventListener);
    };
  }

  /**
   * Emit an event
   */
  async emit<T = unknown>(
    entityType: EntityType,
    event: string,
    data: Omit<RuleEvent<T>, "entityType" | "event" | "timestamp">
  ): Promise<void> {
    const ruleEvent: RuleEvent<T> = {
      entityType,
      event,
      ...data,
      timestamp: new Date(),
    };

    const key: EventKey = `${entityType}.${event}`;
    const promises: Promise<void>[] = [];

    // Call specific listeners
    const specificListeners = this.listeners.get(key);
    if (specificListeners) {
      for (const listener of specificListeners) {
        promises.push(
          Promise.resolve(listener(ruleEvent)).catch((err) => {
            console.error(`Error in automation event listener for ${key}:`, err);
          })
        );
      }
    }

    // Call wildcard listeners
    const wildcardListeners = this.wildcardListeners.get(entityType);
    if (wildcardListeners) {
      for (const listener of wildcardListeners) {
        promises.push(
          Promise.resolve(listener(ruleEvent)).catch((err) => {
            console.error(`Error in automation wildcard listener for ${entityType}:`, err);
          })
        );
      }
    }

    // Wait for all listeners to complete
    await Promise.all(promises);
  }

  /**
   * Remove all listeners (for testing/cleanup)
   */
  removeAllListeners(): void {
    this.listeners.clear();
    this.wildcardListeners.clear();
  }

  /**
   * Get listener count for a specific event (for testing)
   */
  listenerCount(entityType: EntityType, event?: string): number {
    let count = 0;
    if (event) {
      const key: EventKey = `${entityType}.${event}`;
      count += this.listeners.get(key)?.size ?? 0;
    } else {
      // Count all listeners for this entity type
      for (const [key, listeners] of this.listeners) {
        if (key.startsWith(`${entityType}.`)) {
          count += listeners.size;
        }
      }
    }
    count += this.wildcardListeners.get(entityType)?.size ?? 0;
    return count;
  }
}

/**
 * Singleton instance of the event emitter
 */
export const automationEvents = new AutomationEventEmitter();

/**
 * Helper function to emit transaction events
 */
export async function emitTransactionEvent(
  event: "created" | "updated" | "deleted" | "imported" | "categorized" | "cleared",
  data: Omit<RuleEvent, "entityType" | "event" | "timestamp">
): Promise<void> {
  await automationEvents.emit("transaction", event, data);
}

/**
 * Helper function to emit account events
 */
export async function emitAccountEvent(
  event: "created" | "updated" | "balanceChanged" | "reconciled",
  data: Omit<RuleEvent, "entityType" | "event" | "timestamp">
): Promise<void> {
  await automationEvents.emit("account", event, data);
}

/**
 * Helper function to emit payee events
 */
export async function emitPayeeEvent(
  event: "created" | "updated" | "merged",
  data: Omit<RuleEvent, "entityType" | "event" | "timestamp">
): Promise<void> {
  await automationEvents.emit("payee", event, data);
}

/**
 * Helper function to emit category events
 */
export async function emitCategoryEvent(
  event: "created" | "updated" | "spendingThresholdReached",
  data: Omit<RuleEvent, "entityType" | "event" | "timestamp">
): Promise<void> {
  await automationEvents.emit("category", event, data);
}

/**
 * Helper function to emit schedule events
 */
export async function emitScheduleEvent(
  event: "created" | "due" | "executed" | "skipped",
  data: Omit<RuleEvent, "entityType" | "event" | "timestamp">
): Promise<void> {
  await automationEvents.emit("schedule", event, data);
}

/**
 * Helper function to emit budget events
 */
export async function emitBudgetEvent(
  event: "created" | "updated" | "overspent" | "threshold" | "periodReset",
  data: Omit<RuleEvent, "entityType" | "event" | "timestamp">
): Promise<void> {
  await automationEvents.emit("budget", event, data);
}
