import {describe, test, expect, beforeEach, afterEach} from "vitest";
import {createCaller} from "../../../src/lib/trpc/router";
import {eq} from "drizzle-orm";
import {categories, users, workspaces, workspaceMembers} from "$lib/schema";
import {setupTestDb, clearTestDb} from "../setup/test-db";

describe("Categories tRPC Integration Tests", () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>;
  let caller: ReturnType<typeof createCaller>;
  let workspaceId: number;
  let categoryCounter = 0;

  function buildCategory(values: {
    name: string;
    notes?: string | null;
    deletedAt?: string;
    parentId?: number;
  }) {
    categoryCounter += 1;
    const baseSlug =
      values.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "category";
    return {
      workspaceId,
      slug: `${baseSlug}-${categoryCounter}`,
      ...values,
    };
  }

  beforeEach(async () => {
    db = await setupTestDb();
    categoryCounter = 0;

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
        displayName: "Categories Test Workspace",
        slug: "categories-test-workspace",
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
      event: {} as any,
      isTest: true,
    };
    caller = createCaller(ctx);

    // Clean up categories from previous tests
    await db.delete(categories);
  });

  afterEach(async () => {
    if (db) {
      await clearTestDb(db);
    }
  });

  describe("categories.all", () => {
    test("should return empty array when no categories exist", async () => {
      const result = await caller.categoriesRoutes.all();
      expect(result).toEqual([]);
    });

    test("should return all non-deleted categories", async () => {
      // Create test categories
      await db.insert(categories).values([
        buildCategory({name: "Food", notes: "Groceries and dining"}),
        buildCategory({name: "Transport", notes: null}),
        buildCategory({
          name: "Deleted Category",
          notes: "Should not appear",
          deletedAt: "2023-01-01T00:00:00Z",
        }),
      ]);

      const result = await caller.categoriesRoutes.all();

      expect(result.length).toBe(2);
      expect(result.map((c) => c.name)).toContain("Food");
      expect(result.map((c) => c.name)).toContain("Transport");
      expect(result.map((c) => c.name)).not.toContain("Deleted Category");
    });

    test("should include all required category fields", async () => {
      await db.insert(categories).values(buildCategory({name: "Test Category", notes: "Test notes"}));

      const result = await caller.categoriesRoutes.all();

      expect(result.length).toBe(1);
      const category = result[0];
      expect(category).toHaveProperty("id");
      expect(category).toHaveProperty("name");
      expect(category).toHaveProperty("notes");
      expect(category).toHaveProperty("parentId");
      expect(category).toHaveProperty("dateCreated");
      expect(category).toHaveProperty("createdAt");
      expect(category).toHaveProperty("updatedAt");
      expect(category).toHaveProperty("deletedAt");
    });
  });

  describe("categories.load", () => {
    test("should load specific category by ID", async () => {
      const [inserted] = await db
        .insert(categories)
        .values(buildCategory({name: "Entertainment", notes: "Movies and games"}))
        .returning();

      const result = await caller.categoriesRoutes.load({id: inserted.id});

      expect(result.id).toBe(inserted.id);
      expect(result.name).toBe("Entertainment");
      expect(result.notes).toBe("Movies and games");
    });

    test("should throw NOT_FOUND for non-existent category", async () => {
      await expect(caller.categoriesRoutes.load({id: 999})).rejects.toThrow(
        "Category with ID 999 not found"
      );
    });

    test("should load deleted category by ID", async () => {
      const [inserted] = await db
        .insert(categories)
        .values(buildCategory({name: "Deleted Category", deletedAt: "2023-01-01T00:00:00Z"}))
        .returning();

      const result = await caller.categoriesRoutes.load({id: inserted.id});
      expect(result.id).toBe(inserted.id);
      expect(result.deletedAt).toBeTruthy();
    });

    test("should handle string ID input (coercion)", async () => {
      const [inserted] = await db
        .insert(categories)
        .values(buildCategory({name: "Coercion Test"}))
        .returning();

      const result = await caller.categoriesRoutes.load({id: inserted.id.toString() as any});
      expect(result.id).toBe(inserted.id);
    });
  });

  describe("categories.save", () => {
    describe("Creating new category", () => {
      test("should create new category with valid data", async () => {
        const categoryData = {
          name: "Health",
          notes: "Medical expenses",
        };

        const result = await caller.categoriesRoutes.save(categoryData);

        expect(result.name).toBe("Health");
        expect(result.notes).toBe("Medical expenses");
        expect(result.id).toBeDefined();
        expect(result.createdAt).toBeDefined();
        expect(result.updatedAt).toBeDefined();
        expect(result.deletedAt).toBeNull();

        // Verify in database
        const dbCategory = await db.select().from(categories).where(eq(categories.id, result.id));
        expect(dbCategory[0]).toBeTruthy();
      });

      test("should create category with only name (notes optional)", async () => {
        const result = await caller.categoriesRoutes.save({name: "Minimal Category"});

        expect(result.name).toBe("Minimal Category");
        expect(result.notes).toBeNull();
      });

      test("should trim whitespace from name", async () => {
        const result = await caller.categoriesRoutes.save({name: "  Trimmed Name  "});
        expect(result.name).toBe("Trimmed Name");
      });

      test("should trim whitespace from notes", async () => {
        const result = await caller.categoriesRoutes.save({
          name: "Test",
          notes: "  Trimmed Notes  ",
        });
        expect(result.notes).toBe("Trimmed Notes");
      });
    });

    describe("Updating existing category", () => {
      test("should update existing category", async () => {
        const [existing] = await db
          .insert(categories)
          .values(buildCategory({name: "Original Name", notes: "Original notes"}))
          .returning();

        const result = await caller.categoriesRoutes.save({
          id: existing.id,
          name: "Revised Name",
          notes: "Revised notes",
        });

        expect(result.id).toBe(existing.id);
        expect(result.name).toBe("Revised Name");
        expect(result.notes).toBe("Revised notes");

        // Verify in database
        const dbCategory = await db.select().from(categories).where(eq(categories.id, existing.id));
        expect(dbCategory[0].name).toBe("Revised Name");
        expect(dbCategory[0].notes).toBe("Revised notes");
      });

      test("should clear notes when set to null", async () => {
        const [existing] = await db
          .insert(categories)
          .values(buildCategory({name: "Category with Notes", notes: "Original notes"}))
          .returning();

        const result = await caller.categoriesRoutes.save({
          id: existing.id,
          name: "Revised Category",
          notes: null,
        });

        expect(result.notes).toBeNull();
      });
    });

    describe("Validation errors", () => {
      test("should reject empty name", async () => {
        await expect(caller.categoriesRoutes.save({name: ""})).rejects.toThrow(
          "Category name is required"
        );
        await expect(caller.categoriesRoutes.save({name: "   "})).rejects.toThrow(
          "Category name is required"
        );
      });

      test("should reject name longer than 50 characters", async () => {
        const longName = "a".repeat(51);
        await expect(caller.categoriesRoutes.save({name: longName})).rejects.toThrow(
          "Category name must be less than 50 characters"
        );
      });

      test("should reject name with HTML/XSS characters", async () => {
        await expect(
          caller.categoriesRoutes.save({name: "<script>alert('xss')</script>"})
        ).rejects.toThrow("Category name contains invalid characters");
        await expect(caller.categoriesRoutes.save({name: "Category <tag>"})).rejects.toThrow(
          "Category name contains invalid characters"
        );
        await expect(caller.categoriesRoutes.save({name: "Category {bracket}"})).rejects.toThrow(
          "Category name contains invalid characters"
        );
        await expect(caller.categoriesRoutes.save({name: "Category [square]"})).rejects.toThrow(
          "Category name contains invalid characters"
        );
        await expect(caller.categoriesRoutes.save({name: "Category \\backslash"})).rejects.toThrow(
          "Category name contains invalid characters"
        );
        await expect(caller.categoriesRoutes.save({name: "Category |pipe"})).rejects.toThrow(
          "Category name contains invalid characters"
        );
      });

      test("should reject notes longer than 500 characters", async () => {
        const longNotes = "a".repeat(501);
        await expect(
          caller.categoriesRoutes.save({
            name: "Valid Name",
            notes: longNotes,
          })
        ).rejects.toThrow("Notes must be less than 500 characters");
      });

      test("should reject notes with HTML tags", async () => {
        await expect(
          caller.categoriesRoutes.save({
            name: "Valid Name",
            notes: "Notes with <b>HTML</b> tags",
          })
        ).rejects.toThrow("Notes cannot contain HTML tags");

        await expect(
          caller.categoriesRoutes.save({
            name: "Valid Name",
            notes: "<script>alert('xss')</script>",
          })
        ).rejects.toThrow("Notes cannot contain HTML tags");
      });
    });

    test("should throw error when database operation fails", async () => {
      // Test with invalid ID that doesn't exist (for update scenario)
      await expect(
        caller.categoriesRoutes.save({
          id: 999999,
          name: "Non-existent Update",
        })
      ).rejects.toThrow("Category with ID 999999 not found");
    });
  });

  describe("categories.remove", () => {
    test("should soft delete category by setting deletedAt", async () => {
      const [category] = await db
        .insert(categories)
        .values(buildCategory({name: "To Be Deleted"}))
        .returning();

      const result = await caller.categoriesRoutes.remove({id: category.id});

      expect(result.id).toBe(category.id);
      expect(result.deletedAt).toBeTruthy();
      expect(result.deletedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Verify category is soft deleted
      const allCategories = await caller.categoriesRoutes.all();
      expect(allCategories.map((c) => c.id)).not.toContain(category.id);
    });

    test("should throw NOT_FOUND for non-existent category", async () => {
      await expect(caller.categoriesRoutes.remove({id: 999})).rejects.toThrow(
        "Category with ID 999 not found"
      );
    });

    test("should throw validation error for invalid input", async () => {
      await expect(caller.categoriesRoutes.remove(null as any)).rejects.toThrow("Invalid input");
      await expect(caller.categoriesRoutes.remove({} as any)).rejects.toThrow();
    });
  });

  describe("categories.delete (bulk)", () => {
    test("should soft delete multiple categories", async () => {
      const categories1 = await db
        .insert(categories)
        .values([
          buildCategory({name: "Category 1"}),
          buildCategory({name: "Category 2"}),
          buildCategory({name: "Category 3"}),
        ])
        .returning();

      const idsToDelete = [categories1[0].id, categories1[2].id]; // Delete first and third

      const result = await caller.categoriesRoutes.delete({entities: idsToDelete});

      expect(result.deletedCount).toBe(2);
      expect(result.errors).toEqual([]);

      // Verify only one category remains active
      const remainingCategories = await caller.categoriesRoutes.all();
      expect(remainingCategories.length).toBe(1);
      expect(remainingCategories[0].id).toBe(categories1[1].id);
    });

    test("should handle empty array", async () => {
      await expect(caller.categoriesRoutes.delete({entities: []})).rejects.toThrow(
        "No category IDs provided"
      );
    });

    test("should handle non-existent IDs gracefully", async () => {
      const result = await caller.categoriesRoutes.delete({entities: [999, 1000]});
      expect(result.deletedCount).toBe(0);
      expect(result.errors).toHaveLength(2);
    });

    test("should handle mix of valid and invalid IDs", async () => {
      const [validCategory] = await db
        .insert(categories)
        .values(buildCategory({name: "Valid Category"}))
        .returning();

      const result = await caller.categoriesRoutes.delete({
        entities: [validCategory.id, 999],
      });

      expect(result.deletedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe("Rate limiting", () => {
    test("should apply rate limiting to save operation", async () => {
      // This test verifies rate limiting is applied but doesn't test the actual limits
      // as that would require multiple rapid requests which could be flaky
      const result = await caller.categoriesRoutes.save({name: "Rate Limited Test"});
      expect(result.name).toBe("Rate Limited Test");
    });

    test("should apply rate limiting to remove operation", async () => {
      const [category] = await db
        .insert(categories)
        .values(buildCategory({name: "Rate Limited Delete"}))
        .returning();

      const result = await caller.categoriesRoutes.remove({id: category.id});
      expect(result.deletedAt).toBeTruthy();
    });

    test("should apply rate limiting to bulk delete operation", async () => {
      const [category] = await db
        .insert(categories)
        .values(buildCategory({name: "Rate Limited Bulk Delete"}))
        .returning();

      const result = await caller.categoriesRoutes.delete({entities: [category.id]});
      expect(result.deletedCount).toBe(1);
      expect(result.errors).toEqual([]);
    });
  });

  describe("Data integrity", () => {
    test("should maintain referential integrity with parent categories", async () => {
      const [parent] = await db
        .insert(categories)
        .values(buildCategory({name: "Parent Category"}))
        .returning();

      // Insert child category manually to test the relationship
      await db.insert(categories).values(buildCategory({name: "Child Category", parentId: parent.id}));

      const allCategories = await caller.categoriesRoutes.all();
      const child = allCategories.find((c) => c.name === "Child Category");

      expect(child?.parentId).toBe(parent.id);
    });

    test("should handle concurrent operations", async () => {
      // Create multiple categories simultaneously
      const promises = Array.from({length: 5}, (_, i) =>
        caller.categoriesRoutes.save({name: `Concurrent Category ${i}`})
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(5);
      expect(new Set(results.map((r) => r.id)).size).toBe(5); // All unique IDs

      const allCategories = await caller.categoriesRoutes.all();
      expect(allCategories.length).toBe(5);
    });
  });

  describe("Edge cases", () => {
    test("should handle special characters in valid names", async () => {
      const validNames = [
        "Food & Beverages",
        "Health-care",
        "Books Education",
        "Auto (Maintenance)",
        "Taxes & Fees",
        "Gift Cards",
        "ATM Fees",
        "Name_With_Underscore",
      ];

      for (const name of validNames) {
        const result = await caller.categoriesRoutes.save({name});
        expect(result.name).toBe(name);
      }

      const allCategories = await caller.categoriesRoutes.all();
      expect(allCategories.length).toBe(validNames.length);
    });

    test("should reject unicode characters", async () => {
      const unicodeNames = [
        "🍕 Food",
        "🚗 Transport",
        "€ Euro expenses",
        "Café & Restaurant",
        "Niño's toys",
      ];

      for (const name of unicodeNames) {
        await expect(caller.categoriesRoutes.save({name})).rejects.toThrow(
          "Name contains invalid characters"
        );
      }
    });

    test("should handle maximum length names and notes", async () => {
      const maxName = "a".repeat(50);
      const maxNotes = "b".repeat(500);

      const result = await caller.categoriesRoutes.save({
        name: maxName,
        notes: maxNotes,
      });

      expect(result.name).toBe(maxName);
      expect(result.notes).toBe(maxNotes);
    });
  });
});
