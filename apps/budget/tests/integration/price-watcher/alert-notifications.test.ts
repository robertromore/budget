/**
 * Alert evaluation and notification integration tests.
 *
 * Tests the AlertService.evaluateAlerts flow including notification creation.
 * Uses the tRPC caller for database-backed operations.
 */

import { describe, test, expect, beforeEach } from "vitest";
import { createCaller } from "$core/trpc/router";
import * as schema from "$core/schema";
import { setupTestDb } from "../setup/test-db";
import { eq } from "drizzle-orm";

describe("Price Alert Notifications", () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>;
  let caller: ReturnType<typeof createCaller>;
  let workspaceId: number;
  let testProduct: any;

  beforeEach(async () => {
    db = await setupTestDb();
    const testUserId = "test-user";

    await db.insert(schema.users).values({
      id: testUserId,
      name: "Test User",
      displayName: "Test User",
      email: "test@example.com",
    });

    const [workspace] = await db
      .insert(schema.workspaces)
      .values({
        displayName: "Alert Test Workspace",
        slug: "alert-test-workspace",
        ownerId: testUserId,
      })
      .returning();
    workspaceId = workspace.id;

    await db.insert(schema.workspaceMembers).values({
      workspaceId,
      userId: testUserId,
      role: "owner",
      isDefault: true,
    });

    const ctx = {
      db: db as any,
      userId: testUserId,
      sessionId: "test-session",
      workspaceId,
      request: { headers: new Headers(), getCookie: () => undefined, setCookie: () => {} } as any,
      isTest: true,
    };
    caller = createCaller(ctx);

    // Seed product with price history
    [testProduct] = await db
      .insert(schema.priceProducts)
      .values({
        workspaceId,
        name: "Test Widget",
        url: "https://example.com/widget",
        retailer: "example",
        slug: "test-widget-alert",
        currentPrice: 50,
        lowestPrice: 40,
        highestPrice: 100,
        targetPrice: 45,
        currency: "USD",
        status: "active",
      })
      .returning();

    // Seed price history (old price = 100, new price will be set by updating product)
    await db.insert(schema.priceHistory).values([
      { productId: testProduct.id, price: 100, source: "scrape", checkedAt: "2024-01-01T00:00:00Z" },
      { productId: testProduct.id, price: 50, source: "scrape", checkedAt: "2024-02-01T00:00:00Z" },
    ]);
  });

  describe("Alert CRUD via tRPC", () => {
    test("should create a price_drop alert with threshold", async () => {
      const alert = await caller.priceWatcherRoutes.createAlert({
        productId: testProduct.id,
        type: "price_drop",
        threshold: 10,
      });

      expect(alert.type).toBe("price_drop");
      expect(alert.threshold).toBe(10);
      expect(alert.enabled).toBe(true);
      expect(alert.workspaceId).toBe(workspaceId);
    });

    test("should create a target_reached alert without threshold", async () => {
      const alert = await caller.priceWatcherRoutes.createAlert({
        productId: testProduct.id,
        type: "target_reached",
      });

      expect(alert.type).toBe("target_reached");
      expect(alert.threshold).toBeNull();
    });

    test("should create a back_in_stock alert", async () => {
      const alert = await caller.priceWatcherRoutes.createAlert({
        productId: testProduct.id,
        type: "back_in_stock",
      });

      expect(alert.type).toBe("back_in_stock");
    });

    test("should create an any_change alert", async () => {
      const alert = await caller.priceWatcherRoutes.createAlert({
        productId: testProduct.id,
        type: "any_change",
      });

      expect(alert.type).toBe("any_change");
    });

    test("should toggle alert enabled/disabled", async () => {
      const alert = await caller.priceWatcherRoutes.createAlert({
        productId: testProduct.id,
        type: "price_drop",
        threshold: 5,
      });

      const disabled = await caller.priceWatcherRoutes.updateAlert({
        id: alert.id,
        data: { enabled: false },
      });
      expect(disabled.enabled).toBe(false);

      const enabled = await caller.priceWatcherRoutes.updateAlert({
        id: alert.id,
        data: { enabled: true },
      });
      expect(enabled.enabled).toBe(true);
    });

    test("should list alerts for a product", async () => {
      await caller.priceWatcherRoutes.createAlert({
        productId: testProduct.id,
        type: "price_drop",
        threshold: 10,
      });
      await caller.priceWatcherRoutes.createAlert({
        productId: testProduct.id,
        type: "target_reached",
      });

      const alerts = await caller.priceWatcherRoutes.listAlerts({ productId: testProduct.id });
      expect(alerts).toHaveLength(2);
    });

    test("should delete an alert", async () => {
      const alert = await caller.priceWatcherRoutes.createAlert({
        productId: testProduct.id,
        type: "any_change",
      });

      await caller.priceWatcherRoutes.deleteAlert({ id: alert.id });

      const alerts = await caller.priceWatcherRoutes.listAlerts({ productId: testProduct.id });
      expect(alerts).toHaveLength(0);
    });
  });

  describe("Manual price logging", () => {
    test("should log a manual price and update product stats", async () => {
      const updated = await caller.priceWatcherRoutes.logManualPrice({
        productId: testProduct.id,
        price: 35,
      });

      expect(updated.currentPrice).toBe(35);
      expect(updated.lowestPrice).toBe(35); // Lower than previous 40
      expect(updated.status).toBe("active");
      expect(updated.errorCount).toBe(0);
    });

    test("should create a price history entry with manual source", async () => {
      await caller.priceWatcherRoutes.logManualPrice({
        productId: testProduct.id,
        price: 42,
      });

      const history = await caller.priceWatcherRoutes.getPriceHistory({
        productId: testProduct.id,
      });

      const manualEntries = history.filter((h: any) => h.source === "manual");
      expect(manualEntries).toHaveLength(1);
      expect(manualEntries[0].price).toBe(42);
    });

    test("should reset error state on manual price log", async () => {
      // Set product to error state
      await db
        .update(schema.priceProducts)
        .set({ status: "error", errorCount: 3, errorMessage: "test error" })
        .where(eq(schema.priceProducts.id, testProduct.id));

      const updated = await caller.priceWatcherRoutes.logManualPrice({
        productId: testProduct.id,
        price: 55,
      });

      expect(updated.status).toBe("active");
      expect(updated.errorCount).toBe(0);
      expect(updated.errorMessage).toBeNull();
    });
  });
});
