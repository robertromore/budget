import {describe, test, expect, beforeEach, afterEach} from "bun:test";
import {createCaller} from "../../../src/lib/trpc/router";
import {eq} from "drizzle-orm";
import {views} from "$lib/schema";
import {setupTestDb, clearTestDb} from "../setup/test-db";
import type {ViewFilter, ViewDisplayState} from "$lib/types";

describe("Views tRPC Integration Tests", () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>;
  let caller: ReturnType<typeof createCaller>;

  beforeEach(async () => {
    db = await setupTestDb();
    const ctx = {db, isTest: true};
    caller = createCaller(ctx);

    // Clean up views from previous tests
    await db.delete(views);
  });

  afterEach(async () => {
    if (db) {
      await clearTestDb(db);
    }
  });

  describe("views.all", () => {
    test("should return empty array when no views exist", async () => {
      const result = await caller.viewsRoutes.all();
      expect(result).toEqual([]);
    });

    test("should return all views", async () => {
      // Create test views
      await db.insert(views).values([
        {
          name: "Default View",
          description: "Default account view",
          icon: "table",
        },
        {
          name: "Filtered View",
          description: "View with filters",
          icon: "filter",
          filters: JSON.stringify([{column: "status", filter: "equals", value: ["cleared"]}]),
        },
        {
          name: "Custom View",
          description: null,
          icon: null,
        },
      ]);

      const result = await caller.viewsRoutes.all();

      expect(result.length).toBe(3);
      expect(result.map((v) => v.name)).toContain("Default View");
      expect(result.map((v) => v.name)).toContain("Filtered View");
      expect(result.map((v) => v.name)).toContain("Custom View");
    });

    test("should include all required view fields", async () => {
      await db.insert(views).values({
        name: "Test View",
        description: "Test description",
        icon: "test-icon",
      });

      const result = await caller.viewsRoutes.all();

      expect(result.length).toBe(1);
      const view = result[0];
      expect(view).toHaveProperty("id");
      expect(view).toHaveProperty("name");
      expect(view).toHaveProperty("description");
      expect(view).toHaveProperty("icon");
      expect(view).toHaveProperty("filters");
      expect(view).toHaveProperty("display");
      expect(view).toHaveProperty("dirty");
    });

    test("should handle JSON fields correctly", async () => {
      const testFilters: ViewFilter[] = [
        {column: "amount", filter: "greater_than", value: [100]},
        {column: "date", filter: "last_days", value: [30]},
      ];

      const testDisplay: ViewDisplayState = {
        grouping: ["category"],
        sort: [{id: "date", desc: true}],
        expanded: {group1: true, group2: false},
        visibility: {amount: true, notes: false},
      };

      await db.insert(views).values({
        name: "Complex View",
        filters: JSON.stringify(testFilters),
        display: JSON.stringify(testDisplay),
      });

      const result = await caller.viewsRoutes.all();
      const view = result[0];

      expect(JSON.parse(view.filters as string)).toEqual(testFilters);
      expect(JSON.parse(view.display as string)).toEqual(testDisplay);
    });
  });

  describe("views.load", () => {
    test("should load specific view by ID", async () => {
      const [inserted] = await db
        .insert(views)
        .values({
          name: "Budget Overview",
          description: "Monthly budget overview",
          icon: "chart",
        })
        .returning();

      const result = await caller.viewsRoutes.load({id: inserted.id});

      expect(result.id).toBe(inserted.id);
      expect(result.name).toBe("Budget Overview");
      expect(result.description).toBe("Monthly budget overview");
      expect(result.icon).toBe("chart");
    });

    test("should throw NOT_FOUND for non-existent view", async () => {
      await expect(caller.viewsRoutes.load({id: 999})).rejects.toThrow("View not found");
    });

    test("should handle string ID input (coercion)", async () => {
      const [inserted] = await db
        .insert(views)
        .values({
          name: "Coercion Test",
        })
        .returning();

      const result = await caller.viewsRoutes.load({id: inserted.id.toString() as any});
      expect(result.id).toBe(inserted.id);
    });

    test("should load view with complex JSON data", async () => {
      const complexFilters: ViewFilter[] = [
        {column: "payee", filter: "contains", value: ["grocery"]},
        {column: "amount", filter: "between", value: [10, 100]},
      ];

      const [inserted] = await db
        .insert(views)
        .values({
          name: "Complex JSON View",
          filters: JSON.stringify(complexFilters),
        })
        .returning();

      const result = await caller.viewsRoutes.load({id: inserted.id});
      expect(JSON.parse(result.filters as string)).toEqual(complexFilters);
    });
  });

  describe("views.save", () => {
    describe("Creating new views", () => {
      test("should create new view with required fields only", async () => {
        const viewData = {
          name: "Simple View",
        };

        const result = await caller.viewsRoutes.save(viewData);

        expect(result.name).toBe("Simple View");
        expect(result.id).toBeDefined();
        expect(result.description).toBeNull();
        expect(result.icon).toBeNull();
        expect(result.filters).toBeNull();
        expect(result.display).toBeNull();

        // Verify in database
        const dbView = await db.select().from(views).where(eq(views.id, result.id));
        expect(dbView[0]).toBeTruthy();
      });

      test("should create view with all optional fields", async () => {
        const filters: ViewFilter[] = [{column: "status", filter: "equals", value: ["cleared"]}];

        const display: ViewDisplayState = {
          sort: [{id: "date", desc: true}],
          expanded: true,
          visibility: true,
        };

        const viewData = {
          name: "Complete View",
          description: "View with all fields",
          icon: "complete",
          filters,
          display,
          dirty: true,
        };

        const result = await caller.viewsRoutes.save(viewData);

        expect(result.name).toBe("Complete View");
        expect(result.description).toBe("View with all fields");
        expect(result.icon).toBe("complete");
        expect(result.filters).toEqual(filters);
        expect(result.display).toEqual({
          sort: [{id: "date", desc: true}],
          expanded: {},
          visibility: {},
        });
        expect(result.dirty).toBe(true);
      });

      test("should handle empty/null JSON fields", async () => {
        const result = await caller.viewsRoutes.save({
          name: "Null Fields View",
          filters: null,
          display: null,
        });

        expect(result.filters).toBeNull();
        expect(result.display).toBeNull();
      });
    });

    describe("Updating existing views", () => {
      test("should update existing view", async () => {
        const [existing] = await db
          .insert(views)
          .values({
            name: "Original View",
            description: "Original description",
            icon: "original",
          })
          .returning();

        const result = await caller.viewsRoutes.save({
          id: existing.id,
          name: "Updated View",
          description: "Updated description",
          icon: "updated",
        });

        expect(result.id).toBe(existing.id);
        expect(result.name).toBe("Updated View");
        expect(result.description).toBe("Updated description");
        expect(result.icon).toBe("updated");

        // Verify in database
        const dbView = await db.select().from(views).where(eq(views.id, existing.id));
        expect(dbView[0].name).toBe("Updated View");
        expect(dbView[0].description).toBe("Updated description");
      });

      test("should update JSON fields", async () => {
        const [existing] = await db
          .insert(views)
          .values({
            name: "JSON Update Test",
          })
          .returning();

        const newFilters: ViewFilter[] = [
          {column: "category", filter: "in", value: ["food", "transport"]},
        ];

        const newDisplay: ViewDisplayState = {
          grouping: ["month"],
          sort: [{id: "amount", desc: false}],
          expanded: {"2023": true},
          visibility: {notes: false},
        };

        const result = await caller.viewsRoutes.save({
          id: existing.id,
          name: "JSON Update Test",
          filters: newFilters,
          display: newDisplay,
        });

        expect(result.filters).toEqual(newFilters);
        expect(result.display).toEqual(newDisplay);

        // Verify in database
        const dbView = await db.select().from(views).where(eq(views.id, existing.id));
        expect(dbView[0].filters).toEqual(newFilters);
        expect(dbView[0].display).toEqual(newDisplay);
      });

      test("should clear optional fields when set to null", async () => {
        const [existing] = await db
          .insert(views)
          .values({
            name: "Clear Fields Test",
            description: "Original description",
            icon: "original",
          })
          .returning();

        const result = await caller.viewsRoutes.save({
          id: existing.id,
          name: "Clear Fields Test",
          description: null,
          icon: null,
        });

        expect(result.description).toBeNull();
        expect(result.icon).toBeNull();
      });
    });

    describe("Validation errors", () => {
      test("should reject empty name", async () => {
        await expect(caller.viewsRoutes.save({name: ""})).rejects.toThrow(
          "Name must contain at least 2 characters"
        );
        await expect(caller.viewsRoutes.save({name: "a"})).rejects.toThrow(
          "Name must contain at least 2 characters"
        );
      });

      test("should reject description longer than 500 characters", async () => {
        const longDescription = "a".repeat(501);
        await expect(
          caller.viewsRoutes.save({
            name: "Valid Name",
            description: longDescription,
          })
        ).rejects.toThrow("Description must be less than 500 characters");
      });

      test("should accept maximum length description", async () => {
        const maxDescription = "a".repeat(500);
        const result = await caller.viewsRoutes.save({
          name: "Max Description Test",
          description: maxDescription,
        });
        expect(result.description).toBe(maxDescription);
      });

      test("should validate filter structure", async () => {
        const invalidFilters = [
          {column: "test"}, // Missing filter and value
          {filter: "equals"}, // Missing column and value
          {column: "test", filter: "equals"}, // Missing value
        ];

        for (const invalidFilter of invalidFilters) {
          await expect(
            caller.viewsRoutes.save({
              name: "Invalid Filter Test",
              filters: [invalidFilter as any],
            })
          ).rejects.toThrow();
        }
      });

      test("should validate display structure", async () => {
        const invalidDisplay = {
          sort: [{id: "test"}], // Missing desc field
        };

        await expect(
          caller.viewsRoutes.save({
            name: "Invalid Display Test",
            display: invalidDisplay as any,
          })
        ).rejects.toThrow();
      });

      test("should accept valid filter structures", async () => {
        const validFilters: ViewFilter[] = [
          {column: "amount", filter: "equals", value: [100]},
          {column: "date", filter: "between", value: ["2023-01-01", "2023-12-31"]},
          {column: "category", filter: "in", value: ["food", "transport", "utilities"]},
        ];

        const result = await caller.viewsRoutes.save({
          name: "Valid Filters Test",
          filters: validFilters,
        });

        expect(result.filters).toEqual(validFilters);
      });

      test("should accept valid display structures", async () => {
        const validDisplay: ViewDisplayState = {
          grouping: ["category", "month"],
          sort: [
            {id: "date", desc: true},
            {id: "amount", desc: false},
          ],
          expanded: {food: true, transport: false},
          visibility: {notes: false, category: true},
        };

        const result = await caller.viewsRoutes.save({
          name: "Valid Display Test",
          display: validDisplay,
        });

        expect(result.display).toEqual(validDisplay);
      });
    });

    test("should throw error when database operation fails", async () => {
      // Test with invalid ID that doesn't exist (for update scenario)
      await expect(
        caller.viewsRoutes.save({
          id: 999999,
          name: "Non-existent Update",
        })
      ).rejects.toThrow("Failed to save view");
    });
  });

  describe("views.remove", () => {
    test("should hard delete view", async () => {
      const [view] = await db
        .insert(views)
        .values({
          name: "To Be Deleted",
          description: "This will be deleted",
        })
        .returning();

      const result = await caller.viewsRoutes.remove({id: view.id});

      expect(result.id).toBe(view.id);
      expect(result.name).toBe("To Be Deleted");

      // Verify view is hard deleted (not in database anymore)
      const allViews = await caller.viewsRoutes.all();
      expect(allViews.map((v) => v.id)).not.toContain(view.id);

      const dbCheck = await db.select().from(views).where(eq(views.id, view.id));
      expect(dbCheck).toEqual([]);
    });

    test("should throw NOT_FOUND for non-existent view", async () => {
      await expect(caller.viewsRoutes.remove({id: 999})).rejects.toThrow(
        "View not found or could not be deleted"
      );
    });

    test("should throw validation error for invalid input", async () => {
      await expect(caller.viewsRoutes.remove(null as any)).rejects.toThrow("Invalid input");
      await expect(caller.viewsRoutes.remove({} as any)).rejects.toThrow();
    });
  });

  describe("views.delete (bulk)", () => {
    test("should hard delete multiple views", async () => {
      const views1 = await db
        .insert(views)
        .values([
          {name: "View 1", description: "First view"},
          {name: "View 2", description: "Second view"},
          {name: "View 3", description: "Third view"},
        ])
        .returning();

      const idsToDelete = [views1[0].id, views1[2].id]; // Delete first and third

      const result = await caller.viewsRoutes.delete({entities: idsToDelete});

      expect(result.length).toBe(2);
      expect(result.map((v) => v.id)).toEqual(expect.arrayContaining(idsToDelete));

      // Verify only one view remains
      const remainingViews = await caller.viewsRoutes.all();
      expect(remainingViews.length).toBe(1);
      expect(remainingViews[0].id).toBe(views1[1].id);

      // Verify deleted views are completely removed from database
      const dbCheck = await db.select().from(views);
      expect(dbCheck.length).toBe(1);
    });

    test("should handle empty array", async () => {
      const result = await caller.viewsRoutes.delete({entities: []});
      expect(result).toEqual([]);
    });

    test("should handle non-existent IDs gracefully", async () => {
      const result = await caller.viewsRoutes.delete({entities: [999, 1000]});
      expect(result).toEqual([]);
    });

    test("should handle mix of valid and invalid IDs", async () => {
      const [validView] = await db
        .insert(views)
        .values({
          name: "Valid View",
        })
        .returning();

      const result = await caller.viewsRoutes.delete({
        entities: [validView.id, 999],
      });

      expect(result.length).toBe(1);
      expect(result[0].id).toBe(validView.id);

      // Verify view is completely deleted
      const allViews = await caller.viewsRoutes.all();
      expect(allViews).toEqual([]);
    });
  });

  describe("Rate limiting", () => {
    test("should apply rate limiting to save operation", async () => {
      const result = await caller.viewsRoutes.save({name: "Rate Limited Test"});
      expect(result.name).toBe("Rate Limited Test");
    });

    test("should apply rate limiting to remove operation", async () => {
      const [view] = await db
        .insert(views)
        .values({
          name: "Rate Limited Delete",
        })
        .returning();

      const result = await caller.viewsRoutes.remove({id: view.id});
      expect(result.name).toBe("Rate Limited Delete");
    });

    test("should apply rate limiting to bulk delete operation", async () => {
      const [view] = await db
        .insert(views)
        .values({
          name: "Rate Limited Bulk Delete",
        })
        .returning();

      const result = await caller.viewsRoutes.delete({entities: [view.id]});
      expect(result.length).toBe(1);
    });
  });

  describe("Data integrity", () => {
    test("should handle concurrent operations", async () => {
      // Create multiple views simultaneously
      const promises = Array.from({length: 5}, (_, i) =>
        caller.viewsRoutes.save({name: `Concurrent View ${i}`})
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(5);
      expect(new Set(results.map((r) => r.id)).size).toBe(5); // All unique IDs

      const allViews = await caller.viewsRoutes.all();
      expect(allViews.length).toBe(5);
    });

    test("should maintain JSON data integrity", async () => {
      const complexData = {
        name: "Integrity Test",
        filters: [
          {column: "amount", filter: "between", value: [0, 1000]},
          {column: "status", filter: "in", value: ["cleared", "pending"]},
        ] as ViewFilter[],
        display: {
          grouping: ["category", "payee"],
          sort: [
            {id: "date", desc: true},
            {id: "amount", desc: false},
          ],
          expanded: {food: true, transport: false, utilities: true},
          visibility: {notes: false, category: true, amount: true},
        } as ViewDisplayState,
      };

      const result = await caller.viewsRoutes.save(complexData);

      // Load the same view to verify data integrity
      const loaded = await caller.viewsRoutes.load({id: result.id});

      expect(loaded.filters).toEqual(complexData.filters);
      expect(loaded.display).toEqual(complexData.display);
    });
  });

  describe("Edge cases", () => {
    test("should handle special characters in names", async () => {
      const specialNames = [
        "View & Filter",
        "Test-View_123",
        "View (Parentheses)",
        "View [Brackets]",
        "View {Braces}",
        "UTF-8: Café & Résumé",
        "Numbers: 2023 Q4",
        "Symbols: $€£¥",
      ];

      for (const name of specialNames) {
        const result = await caller.viewsRoutes.save({name});
        expect(result.name).toBe(name);
      }

      const allViews = await caller.viewsRoutes.all();
      expect(allViews.length).toBe(specialNames.length);
    });

    test("should handle complex nested JSON structures", async () => {
      const deeplyNestedDisplay: ViewDisplayState = {
        grouping: ["year", "month", "category", "payee"],
        sort: [
          {id: "date", desc: true},
          {id: "amount", desc: false},
          {id: "category", desc: false},
        ],
        expanded: {
          "2023": true,
          "2023-01": false,
          "2023-02": true,
          food: true,
          transport: false,
          utilities: true,
          entertainment: false,
        },
        visibility: {
          id: false,
          date: true,
          amount: true,
          payee: true,
          category: true,
          notes: false,
          status: true,
          account: true,
        },
      };

      const result = await caller.viewsRoutes.save({
        name: "Deep Nesting Test",
        display: deeplyNestedDisplay,
      });

      expect(result.display).toEqual(deeplyNestedDisplay);

      // Verify persistence
      const loaded = await caller.viewsRoutes.load({id: result.id});
      expect(loaded.display).toEqual(deeplyNestedDisplay);
    });

    test("should handle array values in filters", async () => {
      const filtersWithArrays: ViewFilter[] = [
        {
          column: "category",
          filter: "in",
          value: ["food", "transport", "utilities", "entertainment"],
        },
        {column: "amount", filter: "between", value: [0, 500]},
        {column: "tags", filter: "contains_any", value: ["urgent", "recurring", "planned"]},
        {column: "date", filter: "in_range", value: ["2023-01-01", "2023-12-31"]},
      ];

      const result = await caller.viewsRoutes.save({
        name: "Array Values Test",
        filters: filtersWithArrays,
      });

      expect(result.filters).toEqual(filtersWithArrays);
    });

    test("should handle boolean and literal types in display", async () => {
      const displayWithLiterals: ViewDisplayState = {
        expanded: true, // Literal true
        visibility: true, // Literal true
      };

      const result1 = await caller.viewsRoutes.save({
        name: "Literal True Test",
        display: displayWithLiterals,
      });

      expect(result1.display).toEqual({expanded: {}, visibility: {}});

      const displayWithRecords: ViewDisplayState = {
        expanded: {group1: true, group2: false},
        visibility: {col1: true, col2: false},
      };

      const result2 = await caller.viewsRoutes.save({
        name: "Record Test",
        display: displayWithRecords,
      });

      expect(result2.display).toEqual(displayWithRecords);
    });

    test("should handle empty arrays and objects", async () => {
      const emptyStructures = {
        name: "Empty Structures Test",
        filters: [] as ViewFilter[],
        display: {
          grouping: [],
          sort: [],
          expanded: {},
          visibility: {},
        } as ViewDisplayState,
      };

      const result = await caller.viewsRoutes.save(emptyStructures);

      expect(result.filters).toEqual([]);
      expect(result.display?.grouping).toEqual([]);
      expect(result.display?.sort).toEqual([]);
      expect(result.display?.expanded).toEqual({});
      expect(result.display?.visibility).toEqual({});
    });

    test("should handle duplicate view names", async () => {
      // System should allow duplicate names (business requirement)
      const duplicateName = "Duplicate View";

      const view1 = await caller.viewsRoutes.save({name: duplicateName});
      const view2 = await caller.viewsRoutes.save({name: duplicateName});

      expect(view1.name).toBe(duplicateName);
      expect(view2.name).toBe(duplicateName);
      expect(view1.id).not.toBe(view2.id);

      const allViews = await caller.viewsRoutes.all();
      expect(allViews.length).toBe(2);
      expect(allViews.filter((v) => v.name === duplicateName).length).toBe(2);
    });
  });

  describe("Business logic", () => {
    test("should preserve dirty flag state", async () => {
      const cleanView = await caller.viewsRoutes.save({
        name: "Clean View",
        dirty: false,
      });
      expect(cleanView.dirty).toBe(false);

      const dirtyView = await caller.viewsRoutes.save({
        name: "Dirty View",
        dirty: true,
      });
      expect(dirtyView.dirty).toBe(true);
    });

    test("should handle view icons consistently", async () => {
      const iconTypes = [
        "table",
        "grid",
        "list",
        "chart",
        "filter",
        "eye",
        "settings",
        "star",
        "bookmark",
        "folder",
      ];

      for (const icon of iconTypes) {
        const result = await caller.viewsRoutes.save({
          name: `${icon} View`,
          icon,
        });
        expect(result.icon).toBe(icon);
      }
    });

    test("should support view templates via JSON structures", async () => {
      const templateView = {
        name: "Budget Template",
        description: "Monthly budget overview template",
        icon: "chart",
        filters: [
          {column: "date", filter: "current_month", value: []},
          {column: "status", filter: "not_equals", value: ["scheduled"]},
        ] as ViewFilter[],
        display: {
          grouping: ["category"],
          sort: [{id: "amount", desc: true}],
          expanded: true,
          visibility: {notes: false, id: false},
        } as ViewDisplayState,
      };

      const result = await caller.viewsRoutes.save(templateView);

      // Verify template structure is preserved
      expect(result.filters).toEqual(templateView.filters);
      expect(result.display).toEqual({
        grouping: ["category"],
        sort: [{id: "amount", desc: true}],
        expanded: {},
        visibility: {notes: false, id: false},
      });
    });
  });
});
