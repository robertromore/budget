// An "account" is a disparate representation of a user's allocation of
// resources, with an overall balance, and transactions to and from the account
// that affect the account's balance.

import {createId} from "@paralleldrive/cuid2";
import {relations, sql} from "drizzle-orm";
import {sqliteTable, integer, text, index, real} from "drizzle-orm/sqlite-core";
import {createInsertSchema, createSelectSchema} from "drizzle-zod";
import {transactions} from "./transactions";
import type {Transaction} from "./transactions";
import {z} from "zod/v4";
import { isValidIconName } from "$lib/utils/icon-validation";

// Account type enum for type safety
export const accountTypeEnum = [
  "checking",
  "savings",
  "investment",
  "credit_card",
  "loan",
  "cash",
  "other"
] as const;

export type AccountType = typeof accountTypeEnum[number];

export const accounts = sqliteTable(
  "account",
  {
    id: integer("id").primaryKey({autoIncrement: true}),
    cuid: text("cuid").$defaultFn(() => createId()),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    // @todo maybe change to enum to allow for archiving?
    closed: integer("closed", {mode: "boolean"}).default(false),
    // @todo decide if it's better to calculate and store this value or aggregate
    // the value based on the transaction rows.
    // balance: real('balance').default(0.0).notNull(),
    notes: text("notes"),

    // Enhanced account fields
    accountType: text("account_type", { enum: accountTypeEnum }).default("checking"),
    institution: text("institution"), // Bank/institution name
    accountIcon: text("account_icon"), // Lucide icon name
    accountColor: text("account_color"), // Hex color code
    initialBalance: real("initial_balance").default(0.0), // Starting balance
    accountNumberLast4: text("account_number_last4"), // Last 4 digits for reference

    dateOpened: text("date_opened")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    // @todo only useful if allowing account archival?
    // dateClosed: integer('date_closed', { mode: 'timestamp' })
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    index("account_name_idx").on(table.name),
    index("account_slug_idx").on(table.slug),
    index("account_closed_idx").on(table.closed),
    index("account_deleted_at_idx").on(table.deletedAt),
  ]
);

export const accountsRelations = relations(accounts, ({many}) => ({
  transactions: many(transactions),
}));

export const selectAccountSchema = createSelectSchema(accounts);
export const insertAccountSchema = createInsertSchema(accounts);
// Schema for creating new accounts (name is required)
export const formInsertAccountSchema = createInsertSchema(accounts, {
  name: (schema) =>
    schema
      .transform((val) => val?.trim()) // Trim whitespace
      .pipe(
        z
          .string()
          .min(1, "Account name is required")
          .min(2, "Account name must be at least 2 characters")
          .max(50, "Account name must be less than 50 characters")
          .regex(/^[a-zA-Z0-9\s\-_.'&()]+$/, "Account name contains invalid characters")
      ),
  slug: (schema) =>
    schema
      .transform((val) => val?.trim()?.toLowerCase()) // Trim and lowercase
      .pipe(
        z
          .string()
          .min(2, "Slug must be at least 2 characters")
          .max(30, "Slug must be less than 30 characters")
          .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
      )
      .optional(),
  notes: (schema) =>
    schema
      .transform((val) => val?.trim()) // Trim notes too
      .pipe(z.string().max(500, "Notes must be less than 500 characters"))
      .optional()
      .nullable(),
  accountType: (schema) =>
    schema.pipe(z.enum(accountTypeEnum, {
      message: "Please select a valid account type"
    })).default("checking"),
  institution: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().max(100, "Institution name must be less than 100 characters"))
      .optional()
      .nullable(),
  accountIcon: (schema) =>
    schema
      .pipe(z.string().refine(
        (val) => !val || isValidIconName(val),
        "Invalid icon selection"
      ))
      .optional()
      .nullable(),
  accountColor: (schema) =>
    schema
      .pipe(z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex code"))
      .optional()
      .nullable(),
  initialBalance: (schema) =>
    schema.pipe(z.number()).default(0.0),
  accountNumberLast4: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().regex(/^\d{4}$/, "Account number must be exactly 4 digits"))
      .optional()
      .nullable(),
});

// Schema for updates (all fields optional, but with validation when provided)
export const formUpdateAccountSchema = z.object({
  id: z.number().positive(),
  name: z
    .string()
    .transform((val) => val?.trim())
    .pipe(
      z
        .string()
        .min(2, "Account name must be at least 2 characters")
        .max(50, "Account name must be less than 50 characters")
        .regex(/^[a-zA-Z0-9\s\-_.'&()]+$/, "Account name contains invalid characters")
    )
    .optional(),
  slug: z
    .string()
    .transform((val) => val?.trim()?.toLowerCase())
    .pipe(
      z
        .string()
        .min(2, "Slug must be at least 2 characters")
        .max(30, "Slug must be less than 30 characters")
        .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
    )
    .optional(),
  notes: z
    .string()
    .transform((val) => val?.trim())
    .pipe(z.string().max(500, "Notes must be less than 500 characters"))
    .optional()
    .nullable(),
  closed: z.boolean().optional(),
  accountType: z.enum(accountTypeEnum).optional(),
  institution: z
    .string()
    .transform((val) => val?.trim())
    .pipe(z.string().max(100, "Institution name must be less than 100 characters"))
    .optional()
    .nullable(),
  accountIcon: z
    .string()
    .refine(
      (val) => !val || isValidIconName(val),
      "Invalid icon selection"
    )
    .optional()
    .nullable(),
  accountColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex code")
    .optional()
    .nullable(),
  initialBalance: z.number().optional(),
  accountNumberLast4: z
    .string()
    .transform((val) => val?.trim())
    .pipe(z.string().regex(/^\d{4}$/, "Account number must be exactly 4 digits"))
    .optional()
    .nullable(),
});

// Combined schema that handles both create and update
export const formAccountSchema = z.union([formInsertAccountSchema, formUpdateAccountSchema]);
export const removeAccountSchema = z.object({id: z.number().nonnegative()});

type WithTransactions = {
  transactions: Transaction[];
};
type WithBalance = {
  balance: number;
};

interface AccountExtraFields extends WithTransactions, WithBalance {}

export type Account = typeof accounts.$inferSelect & AccountExtraFields;
export type NewAccount = typeof accounts.$inferInsert;
export type InsertAccountSchema = typeof insertAccountSchema;
export type FormInsertAccountSchema = typeof formInsertAccountSchema;
export type RemoveAccountSchema = typeof removeAccountSchema;
