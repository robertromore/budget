/**
 * Authentication - Integration Tests
 *
 * Tests user authentication including user creation,
 * preferences, and account management.
 */

import {describe, it, expect, beforeEach} from "vitest";
import {setupTestDb} from "../setup/test-db";
import * as schema from "../../../src/lib/schema";
import {eq} from "drizzle-orm";
import type {BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {createId} from "@paralleldrive/cuid2";
import type {UserPreferences} from "../../../src/lib/schema/users";

type TestDb = BunSQLiteDatabase<typeof schema>;

interface TestContext {
  db: TestDb;
}

async function setupTestContext(): Promise<TestContext> {
  const db = await setupTestDb();
  return {db};
}

describe("Authentication", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("user creation", () => {
    it("should create a user with basic info", async () => {
      const userId = createId();

      const [user] = await ctx.db
        .insert(schema.users)
        .values({
          id: userId,
          name: "John Doe",
          email: "john@example.com",
        })
        .returning();

      expect(user.name).toBe("John Doe");
      expect(user.email).toBe("john@example.com");
      expect(user.role).toBe("user"); // Default role
    });

    it("should create user with display name and slug", async () => {
      const userId = createId();

      const [user] = await ctx.db
        .insert(schema.users)
        .values({
          id: userId,
          name: "John Doe",
          displayName: "Johnny",
          slug: "johnny-doe",
          email: "john@example.com",
        })
        .returning();

      expect(user.displayName).toBe("Johnny");
      expect(user.slug).toBe("johnny-doe");
    });

    it("should enforce unique email", async () => {
      const user1Id = createId();
      const user2Id = createId();

      await ctx.db.insert(schema.users).values({
        id: user1Id,
        name: "User 1",
        email: "same@example.com",
      });

      let errorThrown = false;
      try {
        await ctx.db.insert(schema.users).values({
          id: user2Id,
          name: "User 2",
          email: "same@example.com",
        });
      } catch (error) {
        errorThrown = true;
        expect((error as Error).message).toContain("UNIQUE constraint failed");
      }
      expect(errorThrown).toBe(true);
    });

    it("should enforce unique slug", async () => {
      const user1Id = createId();
      const user2Id = createId();

      await ctx.db.insert(schema.users).values({
        id: user1Id,
        name: "User 1",
        slug: "same-slug",
        email: "user1@example.com",
      });

      let errorThrown = false;
      try {
        await ctx.db.insert(schema.users).values({
          id: user2Id,
          name: "User 2",
          slug: "same-slug",
          email: "user2@example.com",
        });
      } catch (error) {
        errorThrown = true;
        expect((error as Error).message).toContain("UNIQUE constraint failed");
      }
      expect(errorThrown).toBe(true);
    });
  });

  describe("user roles", () => {
    it("should create user with default role", async () => {
      const userId = createId();

      const [user] = await ctx.db
        .insert(schema.users)
        .values({
          id: userId,
          name: "Regular User",
          email: "regular@example.com",
        })
        .returning();

      expect(user.role).toBe("user");
    });

    it("should create admin user", async () => {
      const userId = createId();

      const [user] = await ctx.db
        .insert(schema.users)
        .values({
          id: userId,
          name: "Admin User",
          email: "admin@example.com",
          role: "admin",
        })
        .returning();

      expect(user.role).toBe("admin");
    });

    it("should update user role", async () => {
      const userId = createId();

      const [user] = await ctx.db
        .insert(schema.users)
        .values({
          id: userId,
          name: "Promoted User",
          email: "promoted@example.com",
          role: "user",
        })
        .returning();

      await ctx.db
        .update(schema.users)
        .set({role: "admin"})
        .where(eq(schema.users.id, user.id));

      const updated = await ctx.db.query.users.findFirst({
        where: eq(schema.users.id, user.id),
      });

      expect(updated?.role).toBe("admin");
    });
  });

  describe("email verification", () => {
    it("should create user with unverified email", async () => {
      const userId = createId();

      const [user] = await ctx.db
        .insert(schema.users)
        .values({
          id: userId,
          name: "Unverified User",
          email: "unverified@example.com",
          emailVerified: false,
        })
        .returning();

      expect(user.emailVerified).toBe(false);
    });

    it("should verify user email", async () => {
      const userId = createId();

      const [user] = await ctx.db
        .insert(schema.users)
        .values({
          id: userId,
          name: "Verifying User",
          email: "verifying@example.com",
          emailVerified: false,
        })
        .returning();

      await ctx.db
        .update(schema.users)
        .set({emailVerified: true})
        .where(eq(schema.users.id, user.id));

      const verified = await ctx.db.query.users.findFirst({
        where: eq(schema.users.id, user.id),
      });

      expect(verified?.emailVerified).toBe(true);
    });
  });

  describe("user preferences", () => {
    it("should store user preferences", async () => {
      const userId = createId();
      const preferences: UserPreferences = {
        dateFormat: "YYYY-MM-DD",
        currencySymbol: "$",
        numberFormat: "en-US",
        showCents: true,
        theme: "dark",
      };

      const [user] = await ctx.db
        .insert(schema.users)
        .values({
          id: userId,
          name: "Pref User",
          email: "pref@example.com",
          preferences: JSON.stringify(preferences),
        })
        .returning();

      const storedPrefs = JSON.parse(user.preferences || "{}") as UserPreferences;
      expect(storedPrefs.dateFormat).toBe("YYYY-MM-DD");
      expect(storedPrefs.theme).toBe("dark");
    });

    it("should update user preferences", async () => {
      const userId = createId();
      const initialPrefs: UserPreferences = {
        theme: "light",
        fontSize: "normal",
      };

      const [user] = await ctx.db
        .insert(schema.users)
        .values({
          id: userId,
          name: "Update Pref User",
          email: "update-pref@example.com",
          preferences: JSON.stringify(initialPrefs),
        })
        .returning();

      const updatedPrefs: UserPreferences = {
        ...initialPrefs,
        theme: "dark",
        fontSize: "large",
      };

      await ctx.db
        .update(schema.users)
        .set({preferences: JSON.stringify(updatedPrefs)})
        .where(eq(schema.users.id, user.id));

      const updated = await ctx.db.query.users.findFirst({
        where: eq(schema.users.id, user.id),
      });

      const storedPrefs = JSON.parse(updated?.preferences || "{}") as UserPreferences;
      expect(storedPrefs.theme).toBe("dark");
      expect(storedPrefs.fontSize).toBe("large");
    });

    it("should store display preferences", async () => {
      const userId = createId();
      const preferences: UserPreferences = {
        tableDisplayMode: "sheet",
        borderRadius: "lg",
        notificationMode: "toast",
      };

      const [user] = await ctx.db
        .insert(schema.users)
        .values({
          id: userId,
          name: "Display Pref User",
          email: "display@example.com",
          preferences: JSON.stringify(preferences),
        })
        .returning();

      const storedPrefs = JSON.parse(user.preferences || "{}") as UserPreferences;
      expect(storedPrefs.tableDisplayMode).toBe("sheet");
      expect(storedPrefs.borderRadius).toBe("lg");
    });
  });

  describe("profile image", () => {
    it("should store profile image URL", async () => {
      const userId = createId();

      const [user] = await ctx.db
        .insert(schema.users)
        .values({
          id: userId,
          name: "Image User",
          email: "image@example.com",
          image: "https://example.com/avatar.jpg",
        })
        .returning();

      expect(user.image).toBe("https://example.com/avatar.jpg");
    });

    it("should update profile image", async () => {
      const userId = createId();

      const [user] = await ctx.db
        .insert(schema.users)
        .values({
          id: userId,
          name: "Update Image User",
          email: "update-image@example.com",
          image: "https://example.com/old.jpg",
        })
        .returning();

      await ctx.db
        .update(schema.users)
        .set({image: "https://example.com/new.jpg"})
        .where(eq(schema.users.id, user.id));

      const updated = await ctx.db.query.users.findFirst({
        where: eq(schema.users.id, user.id),
      });

      expect(updated?.image).toBe("https://example.com/new.jpg");
    });
  });

  describe("user lookup", () => {
    it("should find user by email", async () => {
      const userId = createId();

      await ctx.db.insert(schema.users).values({
        id: userId,
        name: "Email User",
        email: "findme@example.com",
      });

      const found = await ctx.db.query.users.findFirst({
        where: eq(schema.users.email, "findme@example.com"),
      });

      expect(found?.name).toBe("Email User");
    });

    it("should find user by slug", async () => {
      const userId = createId();

      await ctx.db.insert(schema.users).values({
        id: userId,
        name: "Slug User",
        slug: "slug-user",
        email: "slug@example.com",
      });

      const found = await ctx.db.query.users.findFirst({
        where: eq(schema.users.slug, "slug-user"),
      });

      expect(found?.name).toBe("Slug User");
    });

    it("should find user by id", async () => {
      const userId = createId();

      await ctx.db.insert(schema.users).values({
        id: userId,
        name: "ID User",
        email: "id@example.com",
      });

      const found = await ctx.db.query.users.findFirst({
        where: eq(schema.users.id, userId),
      });

      expect(found?.name).toBe("ID User");
    });
  });

  describe("soft delete", () => {
    it("should soft delete user", async () => {
      const userId = createId();

      const [user] = await ctx.db
        .insert(schema.users)
        .values({
          id: userId,
          name: "Deleted User",
          email: "deleted@example.com",
        })
        .returning();

      const now = new Date();
      await ctx.db
        .update(schema.users)
        .set({deletedAt: now})
        .where(eq(schema.users.id, user.id));

      const deleted = await ctx.db.query.users.findFirst({
        where: eq(schema.users.id, user.id),
      });

      expect(deleted?.deletedAt).toBeDefined();
    });

    it("should restore soft deleted user", async () => {
      const userId = createId();

      const [user] = await ctx.db
        .insert(schema.users)
        .values({
          id: userId,
          name: "Restore User",
          email: "restore@example.com",
          deletedAt: new Date(),
        })
        .returning();

      await ctx.db
        .update(schema.users)
        .set({deletedAt: null})
        .where(eq(schema.users.id, user.id));

      const restored = await ctx.db.query.users.findFirst({
        where: eq(schema.users.id, user.id),
      });

      expect(restored?.deletedAt).toBeNull();
    });
  });

  describe("user updates", () => {
    it("should update user name", async () => {
      const userId = createId();

      const [user] = await ctx.db
        .insert(schema.users)
        .values({
          id: userId,
          name: "Original Name",
          email: "update@example.com",
        })
        .returning();

      await ctx.db
        .update(schema.users)
        .set({name: "Updated Name"})
        .where(eq(schema.users.id, user.id));

      const updated = await ctx.db.query.users.findFirst({
        where: eq(schema.users.id, user.id),
      });

      expect(updated?.name).toBe("Updated Name");
    });

    it("should update multiple fields", async () => {
      const userId = createId();

      const [user] = await ctx.db
        .insert(schema.users)
        .values({
          id: userId,
          name: "Multi Update User",
          email: "multi@example.com",
        })
        .returning();

      await ctx.db
        .update(schema.users)
        .set({
          displayName: "New Display",
          slug: "new-slug",
          image: "https://new.com/avatar.jpg",
        })
        .where(eq(schema.users.id, user.id));

      const updated = await ctx.db.query.users.findFirst({
        where: eq(schema.users.id, user.id),
      });

      expect(updated?.displayName).toBe("New Display");
      expect(updated?.slug).toBe("new-slug");
      expect(updated?.image).toBe("https://new.com/avatar.jpg");
    });
  });

  describe("hard delete", () => {
    it("should hard delete user", async () => {
      const userId = createId();

      await ctx.db.insert(schema.users).values({
        id: userId,
        name: "Hard Delete User",
        email: "harddelete@example.com",
      });

      await ctx.db.delete(schema.users).where(eq(schema.users.id, userId));

      const deleted = await ctx.db.query.users.findFirst({
        where: eq(schema.users.id, userId),
      });

      expect(deleted).toBeUndefined();
    });
  });
});
