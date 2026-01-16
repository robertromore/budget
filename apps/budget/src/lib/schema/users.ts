import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import type { EncryptionKeyType, EncryptionLevel, RiskFactorSettings } from "../types/encryption";
import { accounts } from "./accounts";
import { budgetAutomationSettings } from "./budget-automation-settings";
import { budgets } from "./budgets";
import { categories } from "./categories";
import { categoryGroups } from "./category-groups";
import { detectedPatterns } from "./detected-patterns";
import { payeeCategoryCorrections } from "./payee-category-corrections";
import { payees } from "./payees";
import { schedules } from "./schedules";
import { views } from "./views";

export const users = sqliteTable(
  "user",
  {
    id: text("id").primaryKey(), // Text ID for Better Auth compatibility
    cuid: text("cuid").$defaultFn(() => createId()),

    // Basic Info
    name: text("name").notNull(), // Required by Better Auth
    displayName: text("display_name"), // Optional, can be derived from name
    slug: text("slug").unique(), // Optional, generated from name
    email: text("email").unique(), // Optional for now, required when auth is added

    // Authentication fields (Better Auth)
    emailVerified: integer("email_verified", { mode: "boolean" }).default(false),
    passwordHash: text("password_hash"),
    image: text("image"), // Profile image URL
    role: text("role").default("user"), // Global app role: "user" | "admin" | "readonly"

    // User Preferences (stored as JSON)
    preferences: text("preferences"), // {locale, dateFormat, currency, theme, etc.}

    // Metadata - Using integer timestamps for Better Auth compatibility
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    deletedAt: integer("deleted_at", { mode: "timestamp" }), // Soft delete support
  },
  (table) => [
    index("user_slug_idx").on(table.slug),
    index("user_email_idx").on(table.email),
    index("user_deleted_at_idx").on(table.deletedAt),
  ]
);

// User encryption preferences (stored in user.preferences)
export interface UserEncryptionPreferences {
  /** Default encryption level for new workspaces (0-4) */
  defaultLevel: EncryptionLevel;
  /** Type of encryption key used */
  keyType: EncryptionKeyType;
  /** Reference to stored encryption key */
  keyId?: string;
  /** Whether risk-based authentication is enabled */
  riskFactorsEnabled: boolean;
  /** Risk factor settings */
  riskFactors?: RiskFactorSettings;
  /** Challenge threshold (0-100) - higher = more challenges */
  challengeThreshold?: number;
  /** Client-side key storage preference */
  keyStoragePreference?: "never" | "session" | "device";
}

// Default user encryption preferences
export const DEFAULT_USER_ENCRYPTION_PREFERENCES: UserEncryptionPreferences = {
  defaultLevel: 0, // No encryption by default
  keyType: "token",
  riskFactorsEnabled: false,
  keyStoragePreference: "session",
};

// Preferences type - synced to database for cross-device persistence
export interface UserPreferences {
  // Display preferences
  dateFormat?: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
  currencySymbol?: string;
  numberFormat?: "en-US" | "de-DE" | "fr-FR";
  showCents?: boolean;
  tableDisplayMode?: "popover" | "sheet";
  borderRadius?: "none" | "sm" | "md" | "lg" | "xl";

  // Notification preferences
  notificationMode?: "toast" | "popover";

  // Theme preferences
  theme?: string; // Preset name or 'custom'
  customThemeColor?: string;

  // Chart preferences
  chartPalette?: string; // Palette preset name

  // Font size
  fontSize?: "small" | "normal" | "large";

  // Legacy/future fields
  locale?: string;
  currency?: string;
  timezone?: string;

  // Security/Encryption preferences
  encryption?: UserEncryptionPreferences;
}

// Zod schemas
export const selectUserSchema = createSelectSchema(users);
export const insertUserSchema = createInsertSchema(users, {
  displayName: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(
        z
          .string()
          .min(1, "Display name is required")
          .min(2, "Display name must be at least 2 characters")
          .max(50, "Display name must be less than 50 characters")
      ),
  slug: (schema) =>
    schema
      .transform((val) => val?.trim()?.toLowerCase())
      .pipe(
        z
          .string()
          .min(2, "Slug must be at least 2 characters")
          .max(30, "Slug must be less than 30 characters")
          .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
      ),
  email: (schema) =>
    schema
      .transform((val) => val?.trim()?.toLowerCase())
      .pipe(z.string().email("Invalid email address"))
      .optional()
      .nullable(),
  preferences: (schema) =>
    schema
      .transform((val) => {
        if (typeof val === "string") return val;
        if (typeof val === "object") return JSON.stringify(val);
        return null;
      })
      .optional()
      .nullable(),
});

export const formInsertUserSchema = insertUserSchema.omit({
  id: true,
  cuid: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  categories: many(categories),
  categoryGroups: many(categoryGroups),
  payees: many(payees),
  budgets: many(budgets),
  schedules: many(schedules),
  views: many(views),
  budgetAutomationSettings: many(budgetAutomationSettings),
  detectedPatterns: many(detectedPatterns),
  payeeCategoryCorrections: many(payeeCategoryCorrections),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type InsertUserSchema = typeof insertUserSchema;
export type FormInsertUserSchema = z.infer<typeof formInsertUserSchema>;
