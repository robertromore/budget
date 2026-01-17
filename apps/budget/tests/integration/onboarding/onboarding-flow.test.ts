/**
 * Onboarding Flow - Integration Tests
 *
 * Tests the complete onboarding flow including user registration,
 * workspace creation, initial account setup, and preferences configuration.
 */

import {describe, it, expect, beforeEach} from "vitest";
import {setupTestDb} from "../setup/test-db";
import * as schema from "../../../src/lib/schema";
import {eq} from "drizzle-orm";
import type {BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {createId} from "@paralleldrive/cuid2";
import type {WorkspacePreferences, MLPreferences} from "../../../src/lib/schema/workspaces";

type TestDb = BunSQLiteDatabase<typeof schema>;

interface TestContext {
  db: TestDb;
}

async function setupTestContext(): Promise<TestContext> {
  const db = await setupTestDb();
  return {db};
}

describe("Onboarding Flow", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("user registration", () => {
    it("should create new user during signup", async () => {
      const userId = createId();

      const [user] = await ctx.db
        .insert(schema.users)
        .values({
          id: userId,
          name: "New User",
          email: "newuser@example.com",
          emailVerified: false,
        })
        .returning();

      expect(user.name).toBe("New User");
      expect(user.emailVerified).toBe(false);
    });

    it("should set initial user preferences", async () => {
      const userId = createId();
      const preferences = {
        dateFormat: "MM/DD/YYYY" as const,
        theme: "system",
      };

      const [user] = await ctx.db
        .insert(schema.users)
        .values({
          id: userId,
          name: "Preference User",
          email: "pref@example.com",
          preferences: JSON.stringify(preferences),
        })
        .returning();

      const storedPrefs = JSON.parse(user.preferences || "{}");
      expect(storedPrefs.dateFormat).toBe("MM/DD/YYYY");
    });
  });

  describe("workspace creation", () => {
    it("should create workspace with owner", async () => {
      const userId = createId();

      const [user] = await ctx.db
        .insert(schema.users)
        .values({
          id: userId,
          name: "Owner",
          email: "owner@example.com",
        })
        .returning();

      const [workspace] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "Personal Budget",
          slug: "personal-budget",
          ownerId: user.id,
        })
        .returning();

      expect(workspace.displayName).toBe("Personal Budget");
      expect(workspace.ownerId).toBe(user.id);
    });

    it("should create workspace member for owner", async () => {
      const userId = createId();

      const [user] = await ctx.db
        .insert(schema.users)
        .values({
          id: userId,
          name: "Owner",
          email: "owner@example.com",
        })
        .returning();

      const [workspace] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "Personal Budget",
          slug: "personal-budget",
          ownerId: user.id,
        })
        .returning();

      const [member] = await ctx.db
        .insert(schema.workspaceMembers)
        .values({
          workspaceId: workspace.id,
          userId: user.id,
          role: "owner",
          isDefault: true,
        })
        .returning();

      expect(member.role).toBe("owner");
      expect(member.isDefault).toBe(true);
    });

    it("should set workspace preferences during onboarding", async () => {
      const userId = createId();

      await ctx.db.insert(schema.users).values({
        id: userId,
        name: "Owner",
        email: "owner@example.com",
      });

      const preferences: WorkspacePreferences = {
        locale: "en-US",
        dateFormat: "MM/DD/YYYY",
        currency: "USD",
        theme: "system",
        onboarding: {
          wizardCompleted: false,
          tourCompleted: false,
          currentStep: 1,
        },
      };

      const [workspace] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "Personal Budget",
          slug: "personal-budget",
          ownerId: userId,
          preferences: JSON.stringify(preferences),
        })
        .returning();

      const storedPrefs = JSON.parse(workspace.preferences || "{}") as WorkspacePreferences;
      expect(storedPrefs.currency).toBe("USD");
      expect(storedPrefs.onboarding?.wizardCompleted).toBe(false);
    });
  });

  describe("initial account setup", () => {
    it("should create checking account", async () => {
      const userId = createId();

      await ctx.db.insert(schema.users).values({
        id: userId,
        name: "Owner",
        email: "owner@example.com",
      });

      const [workspace] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "Personal Budget",
          slug: "personal-budget",
          ownerId: userId,
        })
        .returning();

      const [account] = await ctx.db
        .insert(schema.accounts)
        .values({
          workspaceId: workspace.id,
          name: "Main Checking",
          slug: "main-checking",
          accountType: "checking",
        })
        .returning();

      expect(account.accountType).toBe("checking");
      expect(account.name).toBe("Main Checking");
    });

    it("should create savings account", async () => {
      const userId = createId();

      await ctx.db.insert(schema.users).values({
        id: userId,
        name: "Owner",
        email: "owner@example.com",
      });

      const [workspace] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "Personal Budget",
          slug: "personal-budget",
          ownerId: userId,
        })
        .returning();

      const [account] = await ctx.db
        .insert(schema.accounts)
        .values({
          workspaceId: workspace.id,
          name: "Emergency Fund",
          slug: "emergency-fund",
          accountType: "savings",
        })
        .returning();

      expect(account.accountType).toBe("savings");
    });

    it("should create credit card account", async () => {
      const userId = createId();

      await ctx.db.insert(schema.users).values({
        id: userId,
        name: "Owner",
        email: "owner@example.com",
      });

      const [workspace] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "Personal Budget",
          slug: "personal-budget",
          ownerId: userId,
        })
        .returning();

      const [account] = await ctx.db
        .insert(schema.accounts)
        .values({
          workspaceId: workspace.id,
          name: "Rewards Card",
          slug: "rewards-card",
          accountType: "credit_card",
        })
        .returning();

      expect(account.accountType).toBe("credit_card");
    });
  });

  describe("default categories setup", () => {
    it("should create default expense categories", async () => {
      const userId = createId();

      await ctx.db.insert(schema.users).values({
        id: userId,
        name: "Owner",
        email: "owner@example.com",
      });

      const [workspace] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "Personal Budget",
          slug: "personal-budget",
          ownerId: userId,
        })
        .returning();

      // Create default categories
      const defaultCategories = [
        {name: "Groceries", slug: "groceries"},
        {name: "Restaurants", slug: "restaurants"},
        {name: "Transportation", slug: "transportation"},
        {name: "Utilities", slug: "utilities"},
        {name: "Housing", slug: "housing"},
        {name: "Entertainment", slug: "entertainment"},
        {name: "Shopping", slug: "shopping"},
        {name: "Healthcare", slug: "healthcare"},
      ];

      await ctx.db.insert(schema.categories).values(
        defaultCategories.map((cat) => ({
          workspaceId: workspace.id,
          name: cat.name,
          slug: cat.slug,
        }))
      );

      const categories = await ctx.db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.workspaceId, workspace.id));

      expect(categories).toHaveLength(8);
    });

    it("should create income category", async () => {
      const userId = createId();

      await ctx.db.insert(schema.users).values({
        id: userId,
        name: "Owner",
        email: "owner@example.com",
      });

      const [workspace] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "Personal Budget",
          slug: "personal-budget",
          ownerId: userId,
        })
        .returning();

      const [income] = await ctx.db
        .insert(schema.categories)
        .values({
          workspaceId: workspace.id,
          name: "Income",
          slug: "income",
          categoryType: "income",
        })
        .returning();

      expect(income.categoryType).toBe("income");
    });
  });

  describe("onboarding wizard progression", () => {
    it("should track wizard step progression", async () => {
      const userId = createId();

      await ctx.db.insert(schema.users).values({
        id: userId,
        name: "Owner",
        email: "owner@example.com",
      });

      const initialPrefs: WorkspacePreferences = {
        onboarding: {
          wizardCompleted: false,
          tourCompleted: false,
          currentStep: 1,
        },
      };

      const [workspace] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "Personal Budget",
          slug: "personal-budget",
          ownerId: userId,
          preferences: JSON.stringify(initialPrefs),
        })
        .returning();

      // Advance to step 2
      const updatedPrefs: WorkspacePreferences = {
        onboarding: {
          wizardCompleted: false,
          tourCompleted: false,
          currentStep: 2,
        },
      };

      await ctx.db
        .update(schema.workspaces)
        .set({preferences: JSON.stringify(updatedPrefs)})
        .where(eq(schema.workspaces.id, workspace.id));

      const updated = await ctx.db.query.workspaces.findFirst({
        where: eq(schema.workspaces.id, workspace.id),
      });

      const storedPrefs = JSON.parse(updated?.preferences || "{}") as WorkspacePreferences;
      expect(storedPrefs.onboarding?.currentStep).toBe(2);
    });

    it("should mark wizard as completed", async () => {
      const userId = createId();

      await ctx.db.insert(schema.users).values({
        id: userId,
        name: "Owner",
        email: "owner@example.com",
      });

      const [workspace] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "Personal Budget",
          slug: "personal-budget",
          ownerId: userId,
        })
        .returning();

      const completedPrefs: WorkspacePreferences = {
        onboarding: {
          wizardCompleted: true,
          tourCompleted: false,
          currentStep: 5,
          completedAt: new Date().toISOString(),
        },
      };

      await ctx.db
        .update(schema.workspaces)
        .set({preferences: JSON.stringify(completedPrefs)})
        .where(eq(schema.workspaces.id, workspace.id));

      const updated = await ctx.db.query.workspaces.findFirst({
        where: eq(schema.workspaces.id, workspace.id),
      });

      const storedPrefs = JSON.parse(updated?.preferences || "{}") as WorkspacePreferences;
      expect(storedPrefs.onboarding?.wizardCompleted).toBe(true);
    });

    it("should track tour completion separately", async () => {
      const userId = createId();

      await ctx.db.insert(schema.users).values({
        id: userId,
        name: "Owner",
        email: "owner@example.com",
      });

      const [workspace] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "Personal Budget",
          slug: "personal-budget",
          ownerId: userId,
        })
        .returning();

      const prefs: WorkspacePreferences = {
        onboarding: {
          wizardCompleted: true,
          tourCompleted: true,
          currentStep: 5,
        },
      };

      await ctx.db
        .update(schema.workspaces)
        .set({preferences: JSON.stringify(prefs)})
        .where(eq(schema.workspaces.id, workspace.id));

      const updated = await ctx.db.query.workspaces.findFirst({
        where: eq(schema.workspaces.id, workspace.id),
      });

      const storedPrefs = JSON.parse(updated?.preferences || "{}") as WorkspacePreferences;
      expect(storedPrefs.onboarding?.tourCompleted).toBe(true);
    });
  });

  describe("ML preferences setup", () => {
    it("should set default ML preferences", async () => {
      const userId = createId();

      await ctx.db.insert(schema.users).values({
        id: userId,
        name: "Owner",
        email: "owner@example.com",
      });

      const mlPrefs: MLPreferences = {
        enabled: true,
        features: {
          forecasting: true,
          anomalyDetection: true,
          similarity: true,
          userBehavior: true,
        },
        config: {
          anomalySensitivity: "medium",
          forecastHorizon: 30,
          similarityThreshold: 0.6,
        },
        duplicateDetection: {
          defaultMethod: "ml",
        },
      };

      const preferences: WorkspacePreferences = {
        ml: mlPrefs,
      };

      const [workspace] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "Personal Budget",
          slug: "personal-budget",
          ownerId: userId,
          preferences: JSON.stringify(preferences),
        })
        .returning();

      const storedPrefs = JSON.parse(workspace.preferences || "{}") as WorkspacePreferences;
      expect(storedPrefs.ml?.enabled).toBe(true);
      expect(storedPrefs.ml?.features.forecasting).toBe(true);
    });

    it("should disable ML features when opted out", async () => {
      const userId = createId();

      await ctx.db.insert(schema.users).values({
        id: userId,
        name: "Owner",
        email: "owner@example.com",
      });

      const mlPrefs: MLPreferences = {
        enabled: false,
        features: {
          forecasting: false,
          anomalyDetection: false,
          similarity: false,
          userBehavior: false,
        },
        config: {
          anomalySensitivity: "medium",
          forecastHorizon: 30,
          similarityThreshold: 0.6,
        },
        duplicateDetection: {
          defaultMethod: "simple",
        },
      };

      const preferences: WorkspacePreferences = {
        ml: mlPrefs,
      };

      const [workspace] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "Personal Budget",
          slug: "personal-budget",
          ownerId: userId,
          preferences: JSON.stringify(preferences),
        })
        .returning();

      const storedPrefs = JSON.parse(workspace.preferences || "{}") as WorkspacePreferences;
      expect(storedPrefs.ml?.enabled).toBe(false);
    });
  });

  describe("complete onboarding flow", () => {
    it("should complete full onboarding process", async () => {
      // Step 1: Create user
      const userId = createId();
      const [user] = await ctx.db
        .insert(schema.users)
        .values({
          id: userId,
          name: "Complete User",
          email: "complete@example.com",
          emailVerified: true,
        })
        .returning();

      // Step 2: Create workspace
      const [workspace] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "My Budget",
          slug: "my-budget",
          ownerId: user.id,
          preferences: JSON.stringify({
            locale: "en-US",
            currency: "USD",
            onboarding: {wizardCompleted: false, tourCompleted: false, currentStep: 1},
          }),
        })
        .returning();

      // Step 3: Create workspace membership
      await ctx.db.insert(schema.workspaceMembers).values({
        workspaceId: workspace.id,
        userId: user.id,
        role: "owner",
        isDefault: true,
      });

      // Step 4: Create initial accounts
      const [checking] = await ctx.db
        .insert(schema.accounts)
        .values({
          workspaceId: workspace.id,
          name: "Checking",
          slug: "checking",
          accountType: "checking",
        })
        .returning();

      // Step 5: Create default categories
      await ctx.db.insert(schema.categories).values([
        {workspaceId: workspace.id, name: "Groceries", slug: "groceries"},
        {workspaceId: workspace.id, name: "Income", slug: "income", categoryType: "income"},
      ]);

      // Step 6: Mark onboarding complete
      await ctx.db
        .update(schema.workspaces)
        .set({
          preferences: JSON.stringify({
            locale: "en-US",
            currency: "USD",
            onboarding: {
              wizardCompleted: true,
              tourCompleted: false,
              currentStep: 5,
              completedAt: new Date().toISOString(),
            },
          }),
        })
        .where(eq(schema.workspaces.id, workspace.id));

      // Verify complete setup
      const finalWorkspace = await ctx.db.query.workspaces.findFirst({
        where: eq(schema.workspaces.id, workspace.id),
      });

      const accounts = await ctx.db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.workspaceId, workspace.id));

      const categories = await ctx.db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.workspaceId, workspace.id));

      const members = await ctx.db
        .select()
        .from(schema.workspaceMembers)
        .where(eq(schema.workspaceMembers.workspaceId, workspace.id));

      expect(finalWorkspace).toBeDefined();
      expect(accounts).toHaveLength(1);
      expect(categories).toHaveLength(2);
      expect(members).toHaveLength(1);

      const prefs = JSON.parse(finalWorkspace?.preferences || "{}") as WorkspacePreferences;
      expect(prefs.onboarding?.wizardCompleted).toBe(true);
    });
  });
});
