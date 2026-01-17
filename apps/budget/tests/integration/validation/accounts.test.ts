import {describe, it, expect, beforeEach, afterEach} from "vitest";
import {createCaller} from "../../../src/lib/trpc/router";
import {TRPCError} from "@trpc/server";
import {setupTestDb, clearTestDb, seedTestData} from "../setup/test-db";

describe("Accounts Validation and Error Scenarios Integration Tests", () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>;
  let caller: ReturnType<typeof createCaller>;

  beforeEach(async () => {
    db = await setupTestDb();
    const ctx = {db, isTest: true};
    caller = createCaller(ctx);
  });

  afterEach(async () => {
    if (db) {
      await clearTestDb(db);
    }
  });

  describe("Input Validation Tests", () => {
    describe("Account Name Validation", () => {
      it("should reject empty account names", async () => {
        await expect(caller.accountRoutes.save({name: ""})).rejects.toThrow();
      });

      it("should reject account names that are too short", async () => {
        await expect(caller.accountRoutes.save({name: "A"})).rejects.toThrow(
          "Account name must be at least 2 characters"
        );
      });

      it("should reject account names that are too long", async () => {
        const longName = "A".repeat(51);
        await expect(caller.accountRoutes.save({name: longName})).rejects.toThrow(
          "Account name must be less than 50 characters"
        );
      });

      it("should reject account names with invalid characters", async () => {
        const invalidNames = [
          "Account<script>alert('xss')</script>",
          "Account with @#$%^&*()",
          "Account with |\\{}[]",
          "Account with <>?:",
        ];

        for (const name of invalidNames) {
          await expect(caller.accountRoutes.save({name})).rejects.toThrow(
            "Account name contains invalid characters"
          );
        }
      });

      it("should accept valid account names", async () => {
        const validNames = [
          "Simple Account",
          "Account-123",
          "My_Account_Name",
          "Account with Numbers 456",
          "UPPERCASE ACCOUNT",
          "lowercase account",
          "Mixed CaSe Account",
        ];

        for (const name of validNames) {
          const result = await caller.accountRoutes.save({name});
          expect(result.name).toBe(name);
        }
      });

      it("should handle special characters in names correctly", async () => {
        const specialCases = [
          {input: "Test's Account", expected: "Test's Account"},
          {input: 'Account "Quoted"', expected: 'Account "Quoted"'},
          {input: "Account & Company", expected: "Account & Company"},
          {input: "Account - Branch", expected: "Account - Branch"},
        ];

        for (const {input, expected} of specialCases) {
          const result = await caller.accountRoutes.save({name: input});
          expect(result.name).toBe(expected);
        }
      });
    });

    describe("Slug Validation", () => {
      it("should auto-generate slug when not provided", async () => {
        const result = await caller.accountRoutes.save({
          name: "Test Account Name",
        });

        expect(result.slug).toBe("test-account-name");
      });

      it("should validate custom slug format", async () => {
        const invalidSlugs = [
          "Invalid Slug With Spaces",
          "invalid_slug_with_underscores",
          "INVALID-SLUG-UPPERCASE",
          "invalid.slug.with.dots",
          "invalid@slug#with$symbols",
        ];

        for (const slug of invalidSlugs) {
          await expect(
            caller.accountRoutes.save({
              name: "Test Account",
              slug,
            })
          ).rejects.toThrow();
        }
      });

      it("should accept valid slug formats", async () => {
        const validSlugs = ["valid-slug", "valid-slug-123", "another-valid-slug", "slug123"];

        for (const slug of validSlugs) {
          const result = await caller.accountRoutes.save({
            name: "Test Account",
            slug,
          });
          expect(result.slug).toBe(slug);
        }
      });

      it("should generate unique slugs for similar names", async () => {
        const account1 = await caller.accountRoutes.save({
          name: "Test Account",
        });

        const account2 = await caller.accountRoutes.save({
          name: "Test Account!!!", // Should generate same base slug
        });

        // Slugs should be different to avoid conflicts
        expect(account1.slug).not.toBe(account2.slug);
      });
    });

    describe("Notes Validation", () => {
      it("should accept null/undefined notes", async () => {
        const result1 = await caller.accountRoutes.save({
          name: "Account Without Notes",
          notes: null,
        });
        expect(result1.notes).toBeNull();

        const result2 = await caller.accountRoutes.save({
          name: "Account Without Notes 2",
        });
        expect(result2.notes).toBeNull();
      });

      it("should accept empty string notes", async () => {
        const result = await caller.accountRoutes.save({
          name: "Account With Empty Notes",
          notes: "",
        });
        expect(result.notes).toBe("");
      });

      it("should reject notes that are too long", async () => {
        const longNotes = "A".repeat(501);
        await expect(
          caller.accountRoutes.save({
            name: "Test Account",
            notes: longNotes,
          })
        ).rejects.toThrow("Notes must be less than 500 characters");
      });

      it("should accept notes at maximum length", async () => {
        const maxLengthNotes = "A".repeat(500);
        const result = await caller.accountRoutes.save({
          name: "Test Account",
          notes: maxLengthNotes,
        });
        expect(result.notes).toBe(maxLengthNotes);
      });

      it("should preserve special characters in notes", async () => {
        const specialNotes =
          "Notes with \"quotes\", 'single quotes', and allowed symbols: ()_+-=:\";'?,./ àéîõü";
        const result = await caller.accountRoutes.save({
          name: "Test Account",
          notes: specialNotes,
        });
        expect(result.notes).toBe(specialNotes);
      });

      it("should handle multiline notes", async () => {
        const multilineNotes = `Line 1
Line 2
Line 3 with more content
Final line`;
        const result = await caller.accountRoutes.save({
          name: "Test Account",
          notes: multilineNotes,
        });
        expect(result.notes).toBe(multilineNotes);
      });
    });

    describe("ID Validation", () => {
      it("should reject negative account IDs", async () => {
        await expect(caller.accountRoutes.load({id: -1})).rejects.toThrow();

        await expect(caller.accountRoutes.save({id: -1, name: "Test"})).rejects.toThrow();

        await expect(caller.accountRoutes.remove({id: -1})).rejects.toThrow();
      });

      it("should reject zero as account ID", async () => {
        await expect(caller.accountRoutes.load({id: 0})).rejects.toThrow();

        await expect(caller.accountRoutes.remove({id: 0})).rejects.toThrow();
      });

      it("should handle string IDs that can be coerced", async () => {
        const {accounts} = await seedTestData(db);
        const validId = accounts[0].id;

        // String representation of valid ID should work
        const result = await caller.accountRoutes.load({
          id: validId.toString() as any,
        });
        expect(result.id).toBe(validId);
      });

      it("should reject non-numeric string IDs", async () => {
        await expect(caller.accountRoutes.load({id: "invalid" as any})).rejects.toThrow();

        await expect(caller.accountRoutes.load({id: "abc123" as any})).rejects.toThrow();
      });

      it("should reject decimal IDs", async () => {
        await expect(caller.accountRoutes.load({id: 1.5 as any})).rejects.toThrow();
      });
    });
  });

  describe("Business Logic Validation", () => {
    describe("Account Creation", () => {
      it("should create account with auto-generated fields", async () => {
        const result = await caller.accountRoutes.save({
          name: "Test Account",
          notes: "Test notes",
        });

        expect(result).toEqual(
          expect.objectContaining({
            id: expect.any(Number),
            name: "Test Account",
            slug: "test-account",
            notes: "Test notes",
            closed: false,
            cuid: expect.any(String),
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            deletedAt: null,
          })
        );
      });

      it("should handle duplicate names gracefully", async () => {
        const name = "Duplicate Account";

        const account1 = await caller.accountRoutes.save({name});
        const account2 = await caller.accountRoutes.save({name});

        // Both should be created successfully with different IDs
        expect(account1.id).not.toBe(account2.id);
        expect(account1.name).toBe(name);
        expect(account2.name).toBe(name);
      });
    });

    describe("Account Updates", () => {
      it("should preserve unchanged fields during partial updates", async () => {
        const {accounts} = await seedTestData(db);
        const originalAccount = accounts[0];

        if (!originalAccount) {
          throw new Error("No test account found");
        }

        const updated = await caller.accountRoutes.save({
          id: originalAccount.id,
          notes: "Updated notes only",
        });

        expect(updated.name).toBe(originalAccount.name);
        expect(updated.slug).toBe(originalAccount.slug);
        expect(updated.notes).toBe("Updated notes only");
        expect(updated.createdAt).toBe(originalAccount.createdAt);
        expect(updated.updatedAt).not.toBe(originalAccount.updatedAt);
      });

      it("should update timestamp when account is modified", async () => {
        const {accounts} = await seedTestData(db);
        const originalAccount = accounts[0];

        if (!originalAccount) {
          throw new Error("No test account found");
        }

        // Small delay to ensure timestamp difference
        await new Promise((resolve) => setTimeout(resolve, 1));

        const updated = await caller.accountRoutes.save({
          id: originalAccount.id,
          name: "Updated Name",
        });

        expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(
          new Date(originalAccount.updatedAt).getTime()
        );
      });

      it("should handle updates to non-existent accounts", async () => {
        await expect(
          caller.accountRoutes.save({
            id: 99999,
            name: "Non-existent Account",
          })
        ).rejects.toThrow(TRPCError);
      });
    });

    describe("Account Deletion", () => {
      it("should soft delete accounts", async () => {
        const {accounts} = await seedTestData(db);
        const accountToDelete = accounts[0];

        if (!accountToDelete) {
          throw new Error("No test account found");
        }

        const deleted = await caller.accountRoutes.remove({
          id: accountToDelete.id,
        });

        expect(deleted.deletedAt).not.toBeNull();
        expect(new Date(deleted.deletedAt!).getTime()).toBeLessThanOrEqual(Date.now());
      });

      it("should not affect other accounts when deleting", async () => {
        const {accounts} = await seedTestData(db);

        if (!accounts[0] || !accounts[1]) {
          throw new Error("Insufficient test accounts found");
        }

        await caller.accountRoutes.remove({id: accounts[0].id});

        // Other accounts should still be accessible
        const remainingAccount = await caller.accountRoutes.load({
          id: accounts[1].id,
        });
        expect(remainingAccount.name).toBe(accounts[1].name);
      });

      it("should handle deletion of non-existent accounts", async () => {
        await expect(caller.accountRoutes.remove({id: 99999})).rejects.toThrow(TRPCError);
      });

      it("should prevent access to deleted accounts", async () => {
        const {accounts} = await seedTestData(db);
        const accountToDelete = accounts[0];

        if (!accountToDelete) {
          throw new Error("No test account found");
        }

        await caller.accountRoutes.remove({id: accountToDelete.id});

        // Should not be able to load deleted account
        await expect(caller.accountRoutes.load({id: accountToDelete.id})).rejects.toThrow(
          TRPCError
        );

        // Should not appear in all() results
        const allAccounts = await caller.accountRoutes.all();
        expect(allAccounts.find((acc) => acc.id === accountToDelete.id)).toBeUndefined();
      });
    });
  });

  describe("Error Handling Tests", () => {
    describe("Database Errors", () => {
      it("should handle database connection failures", async () => {
        // Create a caller with invalid database
        const invalidDb = null as any;
        const invalidCaller = createCaller({db: invalidDb});

        await expect(invalidCaller.accountRoutes.all()).rejects.toThrow();
      });

      it("should provide meaningful error messages", async () => {
        try {
          await caller.accountRoutes.load({id: 99999});
        } catch (error) {
          expect(error).toBeInstanceOf(TRPCError);
          expect((error as TRPCError).code).toBe("NOT_FOUND");
          expect((error as TRPCError).message).toBe("Account not found");
        }
      });

      it("should handle constraint violations gracefully", async () => {
        // This would test database-level constraints if they exist
        // For now, testing application-level validation
        await expect(
          caller.accountRoutes.save({
            name: "Test",
            slug: "test-slug",
            notes: "A".repeat(501), // Exceeds limit
          })
        ).rejects.toThrow();
      });
    });

    describe("Type Safety Errors", () => {
      it("should reject requests with wrong types", async () => {
        // These should fail TypeScript compilation, but testing runtime behavior
        await expect(
          (caller.accountRoutes as any).save({
            name: 123, // Should be string
          })
        ).rejects.toThrow();

        await expect(
          (caller.accountRoutes as any).save({
            id: "not-a-number", // Should be number
            name: "Test",
          })
        ).rejects.toThrow();
      });

      it("should reject missing required fields", async () => {
        await expect(
          (caller.accountRoutes as any).save({
            notes: "Notes without name",
            // Missing required 'name' field
          })
        ).rejects.toThrow();
      });

      it("should reject extra unexpected fields", async () => {
        const result = await caller.accountRoutes.save({
          name: "Test Account",
          notes: "Test notes",
          unexpectedField: "Should be ignored", // Extra fields should be ignored/stripped
        } as any);

        expect((result as any).unexpectedField).toBeUndefined();
      });
    });

    describe("Edge Case Handling", () => {
      it("should handle extremely long valid input", async () => {
        const longButValidName = "A".repeat(50); // At the limit
        const longButValidNotes = "B".repeat(500); // At the limit

        const result = await caller.accountRoutes.save({
          name: longButValidName,
          notes: longButValidNotes,
        });

        expect(result.name).toBe(longButValidName);
        expect(result.notes).toBe(longButValidNotes);
      });

      it("should handle Unicode characters properly", async () => {
        const unicodeName = "Cömpte Bancaire 测试账户";
        const unicodeNotes = "Notes with accénts and spéciál çhäractërs";

        const result = await caller.accountRoutes.save({
          name: unicodeName,
          notes: unicodeNotes,
        });

        expect(result.name).toBe(unicodeName);
        expect(result.notes).toBe(unicodeNotes);
      });

      it("should handle whitespace-only input", async () => {
        await expect(
          caller.accountRoutes.save({
            name: "   ", // Only whitespace
          })
        ).rejects.toThrow();

        await expect(
          caller.accountRoutes.save({
            name: "\t\n\r", // Only whitespace characters
          })
        ).rejects.toThrow();
      });

      it("should trim and normalize input appropriately", async () => {
        const result = await caller.accountRoutes.save({
          name: "  Trimmed Account  ",
          notes: "  Trimmed notes  ",
        });

        // Should preserve internal spaces but trim leading/trailing
        expect(result.name).toBe("Trimmed Account");
        expect(result.notes).toBe("Trimmed notes");
      });

      it("should handle null and undefined values correctly", async () => {
        const result = await caller.accountRoutes.save({
          name: "Test Account",
          notes: null, // Explicit null
        });

        expect(result.notes).toBeNull();
      });
    });
  });

  describe("Security Validation Tests", () => {
    describe("XSS Prevention", () => {
      it("should handle potential XSS in account names", async () => {
        const xssAttempts = [
          "<script>alert('xss')</script>",
          "javascript:alert('xss')",
          "<img src=x onerror=alert('xss')>",
          "<svg onload=alert('xss')>",
        ];

        for (const xssAttempt of xssAttempts) {
          // Should either reject the input or sanitize it
          try {
            const result = await caller.accountRoutes.save({
              name: `Test ${xssAttempt} Account`,
            });
            // If it doesn't reject, it should not contain script tags
            expect(result.name).not.toContain("<script");
            expect(result.name).not.toContain("javascript:");
          } catch (error) {
            // Rejection is also acceptable
            expect(error).toBeDefined();
          }
        }
      });

      it("should handle potential XSS in notes", async () => {
        const xssAttempt = "<script>alert('xss')</script>";

        try {
          const result = await caller.accountRoutes.save({
            name: "Test Account",
            notes: xssAttempt,
          });
          // Should sanitize or escape the content
          expect(result.notes).not.toContain("<script>");
        } catch (error) {
          // Rejection is also acceptable
          expect(error).toBeDefined();
        }
      });
    });

    describe("SQL Injection Prevention", () => {
      it("should handle SQL injection attempts in IDs", async () => {
        const sqlInjectionAttempts = [
          "1; DROP TABLE accounts; --",
          "1' OR '1'='1",
          "1 UNION SELECT * FROM accounts",
          "'; DELETE FROM accounts; --",
        ];

        for (const attempt of sqlInjectionAttempts) {
          await expect(caller.accountRoutes.load({id: attempt as any})).rejects.toThrow();
        }
      });

      it("should handle SQL injection attempts in names", async () => {
        const sqlInjectionAttempts = [
          "'; DROP TABLE accounts; --",
          "' OR '1'='1",
          "' UNION SELECT password FROM users --",
        ];

        for (const attempt of sqlInjectionAttempts) {
          const result = await caller.accountRoutes.save({
            name: `Account ${attempt}`,
          });

          // Should treat as literal string, not SQL
          expect(result.name).toBe(`Account ${attempt}`);
        }
      });
    });

    describe("Input Length Attacks", () => {
      it("should reject extremely long input that could cause DoS", async () => {
        const massiveInput = "A".repeat(100000); // 100KB of data

        await expect(
          caller.accountRoutes.save({
            name: massiveInput,
          })
        ).rejects.toThrow();

        await expect(
          caller.accountRoutes.save({
            name: "Test Account",
            notes: massiveInput,
          })
        ).rejects.toThrow();
      });
    });
  });
});
