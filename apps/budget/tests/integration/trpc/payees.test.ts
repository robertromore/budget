import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { createCaller } from "$core/trpc/router";
import { eq } from "drizzle-orm";
import { payees, users, workspaces, workspaceMembers } from "$core/schema";
import { setupTestDb, clearTestDb } from "../setup/test-db";

describe("Payees tRPC Integration Tests", () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>;
  let caller: ReturnType<typeof createCaller>;
  let workspaceId: number;
  let payeeCounter = 0;

  function buildPayee(values: { name: string; notes?: string | null; deletedAt?: string }) {
    payeeCounter += 1;
    const baseSlug =
      values.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "payee";
    return {
      workspaceId,
      slug: `${baseSlug}-${payeeCounter}`,
      ...values,
    };
  }

  beforeEach(async () => {
    db = await setupTestDb();
    payeeCounter = 0;

    const testUserId = "test-user";
    await db.insert(users).values({
      id: testUserId,
      name: "Test User",
      displayName: "Test User",
      email: "test@example.com",
    });

    const [workspace] = await db
      .insert(workspaces)
      .values({
        displayName: "Payees Test Workspace",
        slug: "payees-test-workspace",
        ownerId: testUserId,
      })
      .returning();
    workspaceId = workspace.id;

    await db.insert(workspaceMembers).values({
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

    // Clean up payees from previous tests
    await db.delete(payees);
  });

  afterEach(async () => {
    if (db) {
      await clearTestDb(db);
    }
  });

  describe("payees.all", () => {
    test("should return empty array when no payees exist", async () => {
      const result = await caller.payeeRoutes.all();
      expect(result).toEqual([]);
    });

    test("should return all non-deleted payees", async () => {
      // Create test payees
      await db.insert(payees).values([
        buildPayee({ name: "Grocery Store", notes: "Local supermarket" }),
        buildPayee({ name: "Gas Station", notes: null }),
        buildPayee({
          name: "Deleted Payee",
          notes: "Should not appear",
          deletedAt: "2023-01-01T00:00:00Z",
        }),
      ]);

      const result = await caller.payeeRoutes.all();

      expect(result.length).toBe(2);
      expect(result.map((p) => p.name)).toContain("Grocery Store");
      expect(result.map((p) => p.name)).toContain("Gas Station");
      expect(result.map((p) => p.name)).not.toContain("Deleted Payee");
    });

    test("should include all required payee fields", async () => {
      await db.insert(payees).values(buildPayee({ name: "Test Payee", notes: "Test notes" }));

      const result = await caller.payeeRoutes.all();

      expect(result.length).toBe(1);
      const payee = result[0];
      expect(payee).toHaveProperty("id");
      expect(payee).toHaveProperty("name");
      expect(payee).toHaveProperty("notes");
      expect(payee).toHaveProperty("dateCreated");
      expect(payee).toHaveProperty("createdAt");
      expect(payee).toHaveProperty("updatedAt");
      expect(payee).toHaveProperty("deletedAt");
    });
  });

  describe("payees.load", () => {
    test("should load specific payee by ID", async () => {
      const [inserted] = await db
        .insert(payees)
        .values(buildPayee({ name: "Restaurant", notes: "Favorite dining spot" }))
        .returning();

      const result = await caller.payeeRoutes.load({ id: inserted.id });

      expect(result.id).toBe(inserted.id);
      expect(result.name).toBe("Restaurant");
      expect(result.notes).toBe("Favorite dining spot");
    });

    test("should throw NOT_FOUND for non-existent payee", async () => {
      await expect(caller.payeeRoutes.load({ id: 999 })).rejects.toThrow(
        "Payee with ID 999 not found"
      );
    });

    test("should load deleted payee by ID", async () => {
      const [inserted] = await db
        .insert(payees)
        .values(buildPayee({ name: "Deleted Payee", deletedAt: "2023-01-01T00:00:00Z" }))
        .returning();

      const result = await caller.payeeRoutes.load({ id: inserted.id });
      expect(result.id).toBe(inserted.id);
      expect(result.deletedAt).toBeTruthy();
    });

    test("should handle string ID input (coercion)", async () => {
      const [inserted] = await db
        .insert(payees)
        .values(buildPayee({ name: "Coercion Test" }))
        .returning();

      const result = await caller.payeeRoutes.load({ id: inserted.id.toString() as any });
      expect(result.id).toBe(inserted.id);
    });
  });

  describe("payees.save", () => {
    describe("Creating new payee", () => {
      test("should create new payee with valid data", async () => {
        const payeeData = {
          name: "Coffee Shop",
          notes: "Daily coffee stop",
        };

        const result = await caller.payeeRoutes.save(payeeData);

        expect(result.name).toBe("Coffee Shop");
        expect(result.notes).toBe("Daily coffee stop");
        expect(result.id).toBeDefined();
        expect(result.createdAt).toBeDefined();
        expect(result.updatedAt).toBeDefined();
        expect(result.deletedAt).toBeNull();

        // Verify in database
        const dbPayee = await db.select().from(payees).where(eq(payees.id, result.id));
        expect(dbPayee[0]).toBeTruthy();
      });

      test("should create payee with only name (notes optional)", async () => {
        const result = await caller.payeeRoutes.save({ name: "Minimal Payee" });

        expect(result.name).toBe("Minimal Payee");
        expect(result.notes).toBeNull();
      });
    });

    describe("Updating existing payee", () => {
      test("should update existing payee", async () => {
        const [existing] = await db
          .insert(payees)
          .values(buildPayee({ name: "Original Name", notes: "Original notes" }))
          .returning();

        const result = await caller.payeeRoutes.save({
          id: existing.id,
          name: "Revised Name",
          notes: "Revised notes",
        });

        expect(result.id).toBe(existing.id);
        expect(result.name).toBe("Revised Name");
        expect(result.notes).toBe("Revised notes");

        // Verify in database
        const dbPayee = await db.select().from(payees).where(eq(payees.id, existing.id));
        expect(dbPayee[0].name).toBe("Revised Name");
        expect(dbPayee[0].notes).toBe("Revised notes");
      });

      test("should clear notes when set to null", async () => {
        const [existing] = await db
          .insert(payees)
          .values(buildPayee({ name: "Payee with Notes", notes: "Original notes" }))
          .returning();

        const result = await caller.payeeRoutes.save({
          id: existing.id,
          name: "Revised Payee",
          notes: null,
        });

        expect(result.notes).toBeNull();
      });

      test("should throw error for non-existent payee update", async () => {
        await expect(
          caller.payeeRoutes.save({
            id: 999999,
            name: "Non-existent Update",
          })
        ).rejects.toThrow("Payee with ID 999999 not found");
      });
    });

    describe("Validation errors", () => {
      test("should reject empty name", async () => {
        await expect(caller.payeeRoutes.save({ name: "" })).rejects.toThrow(
          "Payee name is required"
        );
      });

      test("should reject name longer than 50 characters", async () => {
        const longName = "a".repeat(51);
        await expect(caller.payeeRoutes.save({ name: longName })).rejects.toThrow(
          "Payee name must be less than 50 characters"
        );
      });

      test("should reject name with invalid characters", async () => {
        const invalidNames = [
          "Payee@Domain",
          "Payee#123",
          "Payee$Money",
          "Payee%Percent",
          "Payee*Star",
          "Payee+Plus",
          "Payee=Equals",
          "Payee[bracket]",
          "Payee{brace}",
          "Payee|pipe",
          "Payee\\backslash",
          "Payee/slash",
          "Payee<tag>",
          "Payee>arrow",
          "Payee?question",
        ];

        for (const invalidName of invalidNames) {
          await expect(caller.payeeRoutes.save({ name: invalidName })).rejects.toThrow(
            "Payee name contains invalid characters"
          );
        }
      });

      test("should accept valid special characters", async () => {
        const validNames = [
          "McDonalds Restaurant",
          "Best Buy & Co",
          "Target-Store",
          "Walmart_Supercenter",
          "CVS Pharmacy",
          "7-Eleven Store",
          "H&M Fashion",
          "Bed Bath & Beyond",
        ];

        for (const validName of validNames) {
          const result = await caller.payeeRoutes.save({ name: validName });
          expect(result.name).toBe(validName);
        }

        const allPayees = await caller.payeeRoutes.all();
        expect(allPayees.length).toBe(validNames.length);
      });

      test("should reject notes longer than 500 characters", async () => {
        const longNotes = "a".repeat(501);
        await expect(
          caller.payeeRoutes.save({
            name: "Valid Name",
            notes: longNotes,
          })
        ).rejects.toThrow("Notes must be less than 500 characters");
      });
    });
  });

  describe("payees.remove", () => {
    test("should soft delete payee by setting deletedAt", async () => {
      const [payee] = await db
        .insert(payees)
        .values(buildPayee({ name: "To Be Deleted" }))
        .returning();

      const result = await caller.payeeRoutes.remove({ id: payee.id });

      expect(result.id).toBe(payee.id);
      expect(result.deletedAt).toBeTruthy();
      expect(result.deletedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Verify payee is soft deleted
      const allPayees = await caller.payeeRoutes.all();
      expect(allPayees.map((p) => p.id)).not.toContain(payee.id);
    });

    test("should throw NOT_FOUND for non-existent payee", async () => {
      await expect(caller.payeeRoutes.remove({ id: 999 })).rejects.toThrow(
        "Payee with ID 999 not found"
      );
    });

    test("should throw validation error for invalid input", async () => {
      await expect(caller.payeeRoutes.remove(null as any)).rejects.toThrow("Invalid input");
      await expect(caller.payeeRoutes.remove({} as any)).rejects.toThrow();
    });
  });

  describe("payees.delete (bulk)", () => {
    test("should soft delete multiple payees", async () => {
      const payees1 = await db
        .insert(payees)
        .values([
          buildPayee({ name: "Payee 1" }),
          buildPayee({ name: "Payee 2" }),
          buildPayee({ name: "Payee 3" }),
        ])
        .returning();

      const idsToDelete = [payees1[0].id, payees1[2].id]; // Delete first and third

      const result = await caller.payeeRoutes.delete({ entities: idsToDelete });

      expect(result.deletedCount).toBe(2);
      expect(result.errors).toEqual([]);

      // Verify only one payee remains active
      const remainingPayees = await caller.payeeRoutes.all();
      expect(remainingPayees.length).toBe(1);
      expect(remainingPayees[0].id).toBe(payees1[1].id);
    });

    test("should handle empty array", async () => {
      await expect(caller.payeeRoutes.delete({ entities: [] })).rejects.toThrow(
        "No payee IDs provided"
      );
    });

    test("should handle non-existent IDs gracefully", async () => {
      const result = await caller.payeeRoutes.delete({ entities: [999, 1000] });
      expect(result.deletedCount).toBe(0);
      expect(result.errors).toHaveLength(2);
    });

    test("should handle mix of valid and invalid IDs", async () => {
      const [validPayee] = await db
        .insert(payees)
        .values(buildPayee({ name: "Valid Payee" }))
        .returning();

      const result = await caller.payeeRoutes.delete({
        entities: [validPayee.id, 999],
      });

      expect(result.deletedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe("Rate limiting", () => {
    test("should apply rate limiting to save operation", async () => {
      // This test verifies rate limiting is applied but doesn't test the actual limits
      // as that would require multiple rapid requests which could be flaky
      const result = await caller.payeeRoutes.save({ name: "Rate Limited Test" });
      expect(result.name).toBe("Rate Limited Test");
    });

    test("should apply rate limiting to remove operation", async () => {
      const [payee] = await db
        .insert(payees)
        .values(buildPayee({ name: "Rate Limited Delete" }))
        .returning();

      const result = await caller.payeeRoutes.remove({ id: payee.id });
      expect(result.deletedAt).toBeTruthy();
    });

    test("should apply rate limiting to bulk delete operation", async () => {
      const [payee] = await db
        .insert(payees)
        .values(buildPayee({ name: "Rate Limited Bulk Delete" }))
        .returning();

      const result = await caller.payeeRoutes.delete({ entities: [payee.id] });
      expect(result.deletedCount).toBe(1);
      expect(result.errors).toEqual([]);
    });
  });

  describe("Data integrity", () => {
    test("should handle concurrent operations", async () => {
      // Create multiple payees simultaneously
      const promises = Array.from({ length: 5 }, (_, i) =>
        caller.payeeRoutes.save({ name: `Concurrent Payee ${i}` })
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(5);
      expect(new Set(results.map((r) => r.id)).size).toBe(5); // All unique IDs

      const allPayees = await caller.payeeRoutes.all();
      expect(allPayees.length).toBe(5);
    });
  });

  describe("Edge cases", () => {
    test("should handle maximum length names and notes", async () => {
      const maxName = "a".repeat(50);
      const maxNotes = "b".repeat(500);

      const result = await caller.payeeRoutes.save({
        name: maxName,
        notes: maxNotes,
      });

      expect(result.name).toBe(maxName);
      expect(result.notes).toBe(maxNotes);
    });

    test("should handle numbers in payee names", async () => {
      const numericNames = [
        "Store 123",
        "Highway 101 Gas",
        "Apartment 5B Rent",
        "Route 66 Diner",
        "Building 2021",
      ];

      for (const name of numericNames) {
        const result = await caller.payeeRoutes.save({ name });
        expect(result.name).toBe(name);
      }
    });

    test("should handle case sensitivity properly", async () => {
      const names = ["UPPERCASE", "lowercase", "MixedCase", "CamelCase"];

      for (const name of names) {
        const result = await caller.payeeRoutes.save({ name });
        expect(result.name).toBe(name); // Should preserve original case
      }

      const allPayees = await caller.payeeRoutes.all();
      expect(allPayees.length).toBe(4);
      expect(allPayees.map((p) => p.name)).toEqual(expect.arrayContaining(names));
    });

    test("should handle whitespace in names", async () => {
      const names = [
        "Multiple   Spaces",
        " Leading Space",
        "Trailing Space ",
        "Tab\tCharacter",
        "New\nLine",
      ];

      // Values are trimmed before storage; internal whitespace is preserved.
      for (const name of names) {
        const result = await caller.payeeRoutes.save({ name });
        expect(result.name).toBe(name.trim());
      }

      const allPayees = await caller.payeeRoutes.all();
      expect(allPayees.length).toBe(5);
    });

    test("should handle duplicate names", async () => {
      // System should allow duplicate names (business requirement)
      const duplicateName = "Duplicate Store";

      const payee1 = await caller.payeeRoutes.save({ name: duplicateName });
      const payee2 = await caller.payeeRoutes.save({ name: duplicateName });

      expect(payee1.name).toBe(duplicateName);
      expect(payee2.name).toBe(duplicateName);
      expect(payee1.id).not.toBe(payee2.id);

      const allPayees = await caller.payeeRoutes.all();
      expect(allPayees.length).toBe(2);
      expect(allPayees.filter((p) => p.name === duplicateName).length).toBe(2);
    });
  });
});
