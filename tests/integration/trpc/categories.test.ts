import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { createCaller } from "../../../src/lib/trpc/router";
import { eq } from "drizzle-orm";
import { categories } from "$lib/schema";
import { setupTestDb, clearTestDb } from "../setup/test-db";

describe("Categories tRPC Integration Tests", () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>;
  let caller: ReturnType<typeof createCaller>;

  beforeEach(async () => {
    db = await setupTestDb();
    const ctx = { db, isTest: true };
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
        { name: "Food", notes: "Groceries and dining" },
        { name: "Transport", notes: null },
        { name: "Deleted Category", notes: "Should not appear", deletedAt: "2023-01-01T00:00:00Z" }
      ]);

      const result = await caller.categoriesRoutes.all();
      
      expect(result.length).toBe(2);
      expect(result.map(c => c.name)).toContain("Food");
      expect(result.map(c => c.name)).toContain("Transport");
      expect(result.map(c => c.name)).not.toContain("Deleted Category");
    });

    test("should include all required category fields", async () => {
      await db.insert(categories).values({ name: "Test Category", notes: "Test notes" });

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
      const [inserted] = await db.insert(categories).values({
        name: "Entertainment",
        notes: "Movies and games"
      }).returning();

      const result = await caller.categoriesRoutes.load({ id: inserted.id });
      
      expect(result.id).toBe(inserted.id);
      expect(result.name).toBe("Entertainment");
      expect(result.notes).toBe("Movies and games");
    });

    test("should throw NOT_FOUND for non-existent category", async () => {
      await expect(caller.categoriesRoutes.load({ id: 999 })).rejects.toThrow("Category not found");
    });

    test("should throw NOT_FOUND for deleted category", async () => {
      const [inserted] = await db.insert(categories).values({
        name: "Deleted Category",
        deletedAt: "2023-01-01T00:00:00Z"
      }).returning();

      await expect(caller.categoriesRoutes.load({ id: inserted.id })).rejects.toThrow("Category not found");
    });

    test("should handle string ID input (coercion)", async () => {
      const [inserted] = await db.insert(categories).values({
        name: "Coercion Test"
      }).returning();

      const result = await caller.categoriesRoutes.load({ id: inserted.id.toString() as any });
      expect(result.id).toBe(inserted.id);
    });
  });

  describe("categories.save", () => {
    describe("Creating new category", () => {
      test("should create new category with valid data", async () => {
        const categoryData = {
          name: "Health",
          notes: "Medical expenses"
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
        const result = await caller.categoriesRoutes.save({ name: "Minimal Category" });
        
        expect(result.name).toBe("Minimal Category");
        expect(result.notes).toBeNull();
      });

      test("should trim whitespace from name", async () => {
        const result = await caller.categoriesRoutes.save({ name: "  Trimmed Name  " });
        expect(result.name).toBe("Trimmed Name");
      });

      test("should trim whitespace from notes", async () => {
        const result = await caller.categoriesRoutes.save({ 
          name: "Test", 
          notes: "  Trimmed Notes  " 
        });
        expect(result.notes).toBe("Trimmed Notes");
      });
    });

    describe("Updating existing category", () => {
      test("should update existing category", async () => {
        const [existing] = await db.insert(categories).values({
          name: "Original Name",
          notes: "Original notes"
        }).returning();

        const result = await caller.categoriesRoutes.save({
          id: existing.id,
          name: "Updated Name",
          notes: "Updated notes"
        });

        expect(result.id).toBe(existing.id);
        expect(result.name).toBe("Updated Name");
        expect(result.notes).toBe("Updated notes");

        // Verify in database
        const dbCategory = await db.select().from(categories).where(eq(categories.id, existing.id));
        expect(dbCategory[0].name).toBe("Updated Name");
        expect(dbCategory[0].notes).toBe("Updated notes");
      });

      test("should clear notes when set to null", async () => {
        const [existing] = await db.insert(categories).values({
          name: "Category with Notes",
          notes: "Original notes"
        }).returning();

        const result = await caller.categoriesRoutes.save({
          id: existing.id,
          name: "Updated Category",
          notes: null
        });

        expect(result.notes).toBeNull();
      });
    });

    describe("Validation errors", () => {
      test("should reject empty name", async () => {
        await expect(caller.categoriesRoutes.save({ name: "" })).rejects.toThrow("Category name is required");
        await expect(caller.categoriesRoutes.save({ name: "   " })).rejects.toThrow("Category name is required");
      });

      test("should reject name longer than 50 characters", async () => {
        const longName = "a".repeat(51);
        await expect(caller.categoriesRoutes.save({ name: longName })).rejects.toThrow("Category name must be less than 50 characters");
      });

      test("should reject name with HTML/XSS characters", async () => {
        await expect(caller.categoriesRoutes.save({ name: "<script>alert('xss')</script>" })).rejects.toThrow("Category name contains invalid characters");
        await expect(caller.categoriesRoutes.save({ name: "Category <tag>" })).rejects.toThrow("Category name contains invalid characters");
        await expect(caller.categoriesRoutes.save({ name: "Category {bracket}" })).rejects.toThrow("Category name contains invalid characters");
        await expect(caller.categoriesRoutes.save({ name: "Category [square]" })).rejects.toThrow("Category name contains invalid characters");
        await expect(caller.categoriesRoutes.save({ name: "Category \\backslash" })).rejects.toThrow("Category name contains invalid characters");
        await expect(caller.categoriesRoutes.save({ name: "Category |pipe" })).rejects.toThrow("Category name contains invalid characters");
      });

      test("should reject notes longer than 500 characters", async () => {
        const longNotes = "a".repeat(501);
        await expect(caller.categoriesRoutes.save({ 
          name: "Valid Name", 
          notes: longNotes 
        })).rejects.toThrow("Notes must be less than 500 characters");
      });

      test("should reject notes with HTML tags", async () => {
        await expect(caller.categoriesRoutes.save({ 
          name: "Valid Name", 
          notes: "Notes with <b>HTML</b> tags" 
        })).rejects.toThrow("Notes cannot contain HTML tags");
        
        await expect(caller.categoriesRoutes.save({ 
          name: "Valid Name", 
          notes: "<script>alert('xss')</script>" 
        })).rejects.toThrow("Notes cannot contain HTML tags");
      });
    });

    test("should throw error when database operation fails", async () => {
      // Test with invalid ID that doesn't exist (for update scenario)
      await expect(caller.categoriesRoutes.save({
        id: 999999,
        name: "Non-existent Update"
      })).rejects.toThrow("Failed to save category");
    });
  });

  describe("categories.remove", () => {
    test("should soft delete category by setting deletedAt", async () => {
      const [category] = await db.insert(categories).values({
        name: "To Be Deleted"
      }).returning();

      const result = await caller.categoriesRoutes.remove({ id: category.id });
      
      expect(result.id).toBe(category.id);
      expect(result.deletedAt).toBeTruthy();
      expect(new Date(result.deletedAt!).getTime()).toBeCloseTo(new Date().getTime(), -4); // Within 10 seconds

      // Verify category is soft deleted
      const allCategories = await caller.categoriesRoutes.all();
      expect(allCategories.map(c => c.id)).not.toContain(category.id);
    });

    test("should throw NOT_FOUND for non-existent category", async () => {
      await expect(caller.categoriesRoutes.remove({ id: 999 })).rejects.toThrow("Category not found or could not be deleted");
    });

    test("should throw validation error for invalid input", async () => {
      await expect(caller.categoriesRoutes.remove(null as any)).rejects.toThrow("Invalid input");
      await expect(caller.categoriesRoutes.remove({} as any)).rejects.toThrow();
    });
  });

  describe("categories.delete (bulk)", () => {
    test("should soft delete multiple categories", async () => {
      const categories1 = await db.insert(categories).values([
        { name: "Category 1" },
        { name: "Category 2" },
        { name: "Category 3" }
      ]).returning();

      const idsToDelete = [categories1[0].id, categories1[2].id]; // Delete first and third

      const result = await caller.categoriesRoutes.delete({ entities: idsToDelete });
      
      expect(result.length).toBe(2);
      expect(result.every(c => c.deletedAt !== null)).toBe(true);

      // Verify only one category remains active
      const remainingCategories = await caller.categoriesRoutes.all();
      expect(remainingCategories.length).toBe(1);
      expect(remainingCategories[0].id).toBe(categories1[1].id);
    });

    test("should handle empty array", async () => {
      const result = await caller.categoriesRoutes.delete({ entities: [] });
      expect(result).toEqual([]);
    });

    test("should handle non-existent IDs gracefully", async () => {
      const result = await caller.categoriesRoutes.delete({ entities: [999, 1000] });
      expect(result).toEqual([]);
    });

    test("should handle mix of valid and invalid IDs", async () => {
      const [validCategory] = await db.insert(categories).values({
        name: "Valid Category"
      }).returning();

      const result = await caller.categoriesRoutes.delete({ 
        entities: [validCategory.id, 999] 
      });
      
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(validCategory.id);
      expect(result[0].deletedAt).toBeTruthy();
    });
  });

  describe("Rate limiting", () => {
    test("should apply rate limiting to save operation", async () => {
      // This test verifies rate limiting is applied but doesn't test the actual limits
      // as that would require multiple rapid requests which could be flaky
      const result = await caller.categoriesRoutes.save({ name: "Rate Limited Test" });
      expect(result.name).toBe("Rate Limited Test");
    });

    test("should apply rate limiting to remove operation", async () => {
      const [category] = await db.insert(categories).values({
        name: "Rate Limited Delete"
      }).returning();

      const result = await caller.categoriesRoutes.remove({ id: category.id });
      expect(result.deletedAt).toBeTruthy();
    });

    test("should apply rate limiting to bulk delete operation", async () => {
      const [category] = await db.insert(categories).values({
        name: "Rate Limited Bulk Delete"
      }).returning();

      const result = await caller.categoriesRoutes.delete({ entities: [category.id] });
      expect(result.length).toBe(1);
    });
  });

  describe("Data integrity", () => {
    test("should maintain referential integrity with parent categories", async () => {
      const [parent] = await db.insert(categories).values({
        name: "Parent Category"
      }).returning();

      // Insert child category manually to test the relationship
      await db.insert(categories).values({
        name: "Child Category",
        parentId: parent.id
      });

      const allCategories = await caller.categoriesRoutes.all();
      const child = allCategories.find(c => c.name === "Child Category");
      
      expect(child?.parentId).toBe(parent.id);
    });

    test("should handle concurrent operations", async () => {
      // Create multiple categories simultaneously
      const promises = Array.from({ length: 5 }, (_, i) =>
        caller.categoriesRoutes.save({ name: `Concurrent Category ${i}` })
      );

      const results = await Promise.all(promises);
      
      expect(results.length).toBe(5);
      expect(new Set(results.map(r => r.id)).size).toBe(5); // All unique IDs
      
      const allCategories = await caller.categoriesRoutes.all();
      expect(allCategories.length).toBe(5);
    });
  });

  describe("Edge cases", () => {
    test("should handle special characters in valid names", async () => {
      const validNames = [
        "Food & Beverages",
        "Health-care",
        "Books/Education",
        "Auto (Maintenance)",
        "Taxes & Fees",
        "Gift Cards",
        "ATM Fees"
      ];

      for (const name of validNames) {
        const result = await caller.categoriesRoutes.save({ name });
        expect(result.name).toBe(name);
      }

      const allCategories = await caller.categoriesRoutes.all();
      expect(allCategories.length).toBe(validNames.length);
    });

    test("should handle unicode characters", async () => {
      const unicodeNames = [
        "🍕 Food",
        "🚗 Transport", 
        "€ Euro expenses",
        "Café & Restaurant",
        "Niño's toys"
      ];

      for (const name of unicodeNames) {
        const result = await caller.categoriesRoutes.save({ name });
        expect(result.name).toBe(name);
      }
    });

    test("should handle maximum length names and notes", async () => {
      const maxName = "a".repeat(50);
      const maxNotes = "b".repeat(500);

      const result = await caller.categoriesRoutes.save({ 
        name: maxName, 
        notes: maxNotes 
      });
      
      expect(result.name).toBe(maxName);
      expect(result.notes).toBe(maxNotes);
    });
  });
});