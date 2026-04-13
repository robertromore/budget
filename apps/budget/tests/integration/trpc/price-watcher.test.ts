import { describe, test, expect, beforeEach } from "vitest";
import { createCaller } from "$core/trpc/router";
import * as schema from "$core/schema";
import { setupTestDb } from "../setup/test-db";
import { eq } from "drizzle-orm";

describe("Price Watcher tRPC Routes", () => {
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
        displayName: "PW Test Workspace",
        slug: "pw-test-workspace",
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

    // Seed a test product directly in DB (bypasses fetchProductInfo network call)
    [testProduct] = await db
      .insert(schema.priceProducts)
      .values({
        workspaceId,
        name: "Test Widget",
        url: "https://example.com/widget",
        retailer: "example",
        slug: "test-widget-abc123",
        currentPrice: 29.99,
        lowestPrice: 24.99,
        highestPrice: 39.99,
        targetPrice: 20.0,
        currency: "USD",
        status: "active",
        checkInterval: 6,
      })
      .returning();

    // Seed price history
    await db.insert(schema.priceHistory).values([
      { productId: testProduct.id, price: 39.99, source: "scrape", checkedAt: "2024-01-01T00:00:00Z" },
      { productId: testProduct.id, price: 34.99, source: "scrape", checkedAt: "2024-01-15T00:00:00Z" },
      { productId: testProduct.id, price: 29.99, source: "scrape", checkedAt: "2024-02-01T00:00:00Z" },
    ]);
  });

  describe("Products", () => {
    test("should list products", async () => {
      const products = await caller.priceWatcherRoutes.listProducts();
      expect(products).toHaveLength(1);
      expect(products[0].name).toBe("Test Widget");
    });

    test("should list products with status filter", async () => {
      const active = await caller.priceWatcherRoutes.listProducts({ status: "active" });
      expect(active).toHaveLength(1);

      const paused = await caller.priceWatcherRoutes.listProducts({ status: "paused" });
      expect(paused).toHaveLength(0);
    });

    test("should get product by slug", async () => {
      const product = await caller.priceWatcherRoutes.getProduct({ slug: "test-widget-abc123" });
      expect(product).not.toBeNull();
      expect(product!.name).toBe("Test Widget");
      expect(product!.currentPrice).toBe(29.99);
    });

    test("should return null for non-existent slug", async () => {
      const product = await caller.priceWatcherRoutes.getProduct({ slug: "does-not-exist" });
      expect(product).toBeNull();
    });

    test("should update product", async () => {
      const updated = await caller.priceWatcherRoutes.updateProduct({
        id: testProduct.id,
        data: { targetPrice: 15.0, checkInterval: 12, name: "Updated Widget" },
      });
      expect(updated.targetPrice).toBe(15.0);
      expect(updated.checkInterval).toBe(12);
      expect(updated.name).toBe("Updated Widget");
    });

    test("should delete product", async () => {
      await caller.priceWatcherRoutes.deleteProduct({ id: testProduct.id });

      const products = await caller.priceWatcherRoutes.listProducts();
      expect(products).toHaveLength(0);
    });
  });

  describe("Price History", () => {
    test("should get price history", async () => {
      const history = await caller.priceWatcherRoutes.getPriceHistory({
        productId: testProduct.id,
      });
      expect(history).toHaveLength(3);
      expect(history[0].price).toBe(39.99); // oldest first
      expect(history[2].price).toBe(29.99); // newest last
    });

    test("should get price history with date range", async () => {
      const history = await caller.priceWatcherRoutes.getPriceHistory({
        productId: testProduct.id,
        dateFrom: "2024-01-10T00:00:00Z",
        dateTo: "2024-01-20T00:00:00Z",
      });
      expect(history).toHaveLength(1);
      expect(history[0].price).toBe(34.99);
    });
  });

  describe("Alerts", () => {
    test("should create alert", async () => {
      const alert = await caller.priceWatcherRoutes.createAlert({
        productId: testProduct.id,
        type: "price_drop",
        threshold: 10,
      });
      expect(alert.type).toBe("price_drop");
      expect(alert.threshold).toBe(10);
      expect(alert.enabled).toBe(true);
    });

    test("should list alerts", async () => {
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

    test("should update alert", async () => {
      const alert = await caller.priceWatcherRoutes.createAlert({
        productId: testProduct.id,
        type: "price_drop",
        threshold: 10,
      });

      const updated = await caller.priceWatcherRoutes.updateAlert({
        id: alert.id,
        data: { threshold: 20, enabled: false },
      });
      expect(updated.threshold).toBe(20);
      expect(updated.enabled).toBe(false);
    });

    test("should delete alert", async () => {
      const alert = await caller.priceWatcherRoutes.createAlert({
        productId: testProduct.id,
        type: "any_change",
      });

      await caller.priceWatcherRoutes.deleteAlert({ id: alert.id });

      const alerts = await caller.priceWatcherRoutes.listAlerts({ productId: testProduct.id });
      expect(alerts).toHaveLength(0);
    });

    test("should reject invalid alert type", async () => {
      await expect(
        caller.priceWatcherRoutes.createAlert({
          productId: testProduct.id,
          type: "invalid_type" as any,
        })
      ).rejects.toThrow();
    });
  });
});
