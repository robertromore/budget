// An "account" is a disparate representation of a user's allocation of
// resources, with an overall balance, and transactions to and from the account
// that affect the account's balance.

import { isValidIconName } from "../utils/icon-validation";
import { NAME_ALLOWED_PATTERN } from "../utils/string-utilities";
import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import type { Transaction } from "./transactions";
import { workspaces } from "./workspaces";
import type { EncryptionLevel } from "../types/encryption";

// Account type enum for type safety
export const accountTypeEnum = [
  "checking",
  "savings",
  "investment",
  "credit_card",
  "loan",
  "cash",
  "hsa",
  "utility",
  "other",
] as const;

export type AccountType = (typeof accountTypeEnum)[number];

/**
 * Canonical user-facing labels for each account type. Imported by
 * every place that surfaces account types to humans (forms, wizards,
 * bulk-import review cards) so the wording stays in sync as the enum
 * grows.
 */
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: "Checking",
  savings: "Savings",
  investment: "Investment",
  credit_card: "Credit Card",
  loan: "Loan",
  cash: "Cash",
  hsa: "Health Savings Account",
  utility: "Utility",
  other: "Other",
};

/**
 * Per-type default Lucide icon name + brand-ish hex color used when
 * an account is created without an explicit icon/color (e.g. via the
 * bulk-import flow). Single source of truth — `AccountService.createAccount`
 * applies these as fallbacks, and the per-account create form
 * pre-populates from the same map so the wording / palette stays
 * consistent across creation paths.
 */
export const ACCOUNT_TYPE_DEFAULTS: Record<AccountType, { icon: string; color: string }> = {
  checking: { icon: "credit-card", color: "#3B82F6" },
  savings: { icon: "piggy-bank", color: "#10B981" },
  credit_card: { icon: "credit-card", color: "#8B5CF6" },
  investment: { icon: "trending-up", color: "#F59E0B" },
  loan: { icon: "banknote", color: "#EF4444" },
  cash: { icon: "wallet", color: "#6B7280" },
  hsa: { icon: "heart-pulse", color: "#14B8A6" },
  utility: { icon: "zap", color: "#F59E0B" },
  other: { icon: "circle", color: "#6B7280" },
};

// Investment subtype enum for investment accounts
export const investmentSubtypeEnum = [
  "roth_ira",
  "traditional_ira",
  "401k",
  "403b",
  "simple_ira",
  "sep_ira",
  "brokerage",
  "crypto",
  "other_investment",
] as const;

export type InvestmentSubtype = (typeof investmentSubtypeEnum)[number];

export const INVESTMENT_SUBTYPE_LABELS: Record<InvestmentSubtype, string> = {
  roth_ira: "Roth IRA",
  traditional_ira: "Traditional IRA",
  "401k": "401(k)",
  "403b": "403(b)",
  simple_ira: "SIMPLE IRA",
  sep_ira: "SEP-IRA",
  brokerage: "Brokerage",
  crypto: "Crypto",
  other_investment: "Other Investment",
};

// Utility subtype enum for utility accounts
export const utilitySubtypeEnum = [
  "electric",
  "gas",
  "water",
  "internet",
  "sewer",
  "trash",
  "other",
] as const;

export type UtilitySubtype = (typeof utilitySubtypeEnum)[number];

export const UTILITY_SUBTYPE_LABELS: Record<UtilitySubtype, string> = {
  electric: "Electric",
  gas: "Gas",
  water: "Water",
  internet: "Internet",
  sewer: "Sewer",
  trash: "Trash",
  other: "Other",
};

// Loan subtype enum for loan accounts. Mirrors the investmentSubtype /
// utilitySubtype pattern so the UI can drive type-specific fields
// (e.g. an auto loan probably wants a VIN, a mortgage wants an
// escrow balance) without ever inferring from the account name.
export const loanSubtypeEnum = [
  "mortgage",
  "auto",
  "student",
  "personal",
  "heloc",
  "other_loan",
] as const;

export type LoanSubtype = (typeof loanSubtypeEnum)[number];

export const LOAN_SUBTYPE_LABELS: Record<LoanSubtype, string> = {
  mortgage: "Mortgage",
  auto: "Auto",
  student: "Student",
  personal: "Personal",
  heloc: "HELOC",
  other_loan: "Other",
};

// HSA coverage tier — currently only individual vs family is supported,
// matching what `accountRoutes.save` already accepts in its zod input.
export const hsaTypeEnum = ["individual", "family"] as const;

export type HsaType = (typeof hsaTypeEnum)[number];

export const HSA_TYPE_LABELS: Record<HsaType, string> = {
  individual: "Individual",
  family: "Family",
};

export const accounts = sqliteTable(
  "account",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    seq: integer("seq"), // Per-workspace sequential ID
    cuid: text("cuid").$defaultFn(() => createId()),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    // @todo maybe change to enum to allow for archiving?
    closed: integer("closed", { mode: "boolean" }).default(false),
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
    accountNumberLast4: text("account_number_last4"), // Last 4 digits for reference (or fuller mask up to 32 chars)
    onBudget: integer("on_budget", { mode: "boolean" }).default(true).notNull(), // Include in budget calculations
    portalUrl: text("portal_url"), // Web portal URL printed on the statement (e.g. https://www.chase.com/amazon)
    statementCycleDay: integer("statement_cycle_day"), // Day of month statements close, 1-31

    // Debt account-specific fields (credit cards & loans)
    debtLimit: real("debt_limit"), // Credit limit (credit cards) or principal amount (loans)
    minimumPayment: real("minimum_payment"), // Minimum monthly payment
    paymentDueDay: integer("payment_due_day"), // Day of month payment is due (1-31)
    interestRate: real("interest_rate"), // APR for credit cards or loan interest rate

    // Loan-specific fields (mortgage, auto, student, etc.)
    loanSubtype: text("loan_subtype", { enum: loanSubtypeEnum }), // mortgage, auto, student, personal, heloc, other_loan
    originalPrincipal: real("original_principal"), // Original loan amount at origination — distinct from current outstanding balance
    escrowBalance: real("escrow_balance"), // For mortgages: tax/insurance escrow held by servicer
    maturityDate: text("maturity_date"), // ISO date string; loan payoff date or term-deposit maturity

    // Investment account-specific fields
    investmentSubtype: text("investment_subtype", { enum: investmentSubtypeEnum }), // roth_ira, 401k, brokerage, etc.
    annualContributionLimit: real("annual_contribution_limit"), // User-set annual contribution limit
    expenseRatio: real("expense_ratio"), // Annual expense ratio as a percentage (e.g., 0.03 for 0.03%)
    benchmarkSymbol: text("benchmark_symbol"), // Ticker symbol for benchmark comparison (e.g., "SPY")
    vestedBalance: real("vested_balance"), // Employer-match-aware vested portion (401k etc.) — total balance lives in transactions

    // HSA-specific fields
    hsaContributionLimit: real("hsa_contribution_limit"), // Annual contribution limit set by the user (IRS limits change yearly)
    hsaType: text("hsa_type", { enum: hsaTypeEnum }), // Coverage tier: individual or family
    hsaCurrentTaxYear: integer("hsa_current_tax_year"), // Tax year the contributions are tracked against
    hsaAdministrator: text("hsa_administrator"), // e.g. "HealthEquity", "Fidelity HSA"
    hsaHighDeductiblePlan: text("hsa_high_deductible_plan"), // HDHP plan identifier the HSA is paired with

    // Cash flow management fields (checking, savings, cash)
    targetBalance: real("target_balance"), // Ideal buffer balance; surplus above this is considered idle

    // Utility account-specific fields
    utilitySubtype: text("utility_subtype", { enum: utilitySubtypeEnum }), // electric, gas, water, internet, etc.
    utilityProvider: text("utility_provider"), // e.g., "Duke Energy", "AT&T"
    utilityAccountNumber: text("utility_account_number"), // Service account number
    utilityServiceAddress: text("utility_service_address"), // Service location address

    // Balance management fields
    // Option 1: Balance Reset Date - transactions before this date are excluded from balance
    balanceResetDate: text("balance_reset_date"), // ISO date string
    balanceAtResetDate: real("balance_at_reset_date"), // Balance as of the reset date
    // Option 3: Reconciliation - standard accounting checkpoint
    reconciledBalance: real("reconciled_balance"), // Last reconciled balance
    reconciledDate: text("reconciled_date"), // Date of last reconciliation

    // Metric preferences - JSON array of enabled metric IDs
    enabledMetrics: text("enabled_metrics"), // JSON array like ["availableCredit", "utilization", "paymentDue"]

    // Per-account encryption settings (for extra-sensitive accounts like medical HSA)
    // "inherit" means use workspace encryption level, explicit level can only INCREASE from workspace
    encryptionLevel: text("encryption_level"), // "inherit" | "0" | "1" | "2" | "3" | "4"
    encryptionKeyId: text("encryption_key_id"), // Reference to separate account-specific key

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
    index("account_workspace_id_idx").on(table.workspaceId),
    index("account_name_idx").on(table.name),
    index("account_slug_idx").on(table.slug),
    index("account_closed_idx").on(table.closed),
    index("account_on_budget_idx").on(table.onBudget),
    index("account_deleted_at_idx").on(table.deletedAt),
  ]
);

// NOTE: accountsRelations is defined in src/lib/schema/index.ts to avoid
// circular dependency with transactions.ts (accounts ↔ transactions)

export const selectAccountSchema = createSelectSchema(accounts);
export const insertAccountSchema = createInsertSchema(accounts);
// Schema for creating new accounts (name is required)
export const formInsertAccountSchema = createInsertSchema(accounts, {
  workspaceId: (schema) => schema.optional(),
  name: (schema) =>
    schema
      .transform((val) => val?.trim()) // Trim whitespace
      .pipe(
        z
          .string()
          .min(1, "Account name is required")
          .min(2, "Account name must be at least 2 characters")
          .max(50, "Account name must be less than 50 characters")
          .regex(NAME_ALLOWED_PATTERN, "Account name contains invalid characters")
      ),
  slug: (schema) =>
    schema
      .optional()
      .transform((val) => val?.trim()?.toLowerCase() || undefined)
      .refine(
        (val) => val === undefined || (val.length >= 2 && val.length <= 30),
        "Slug must be between 2 and 30 characters"
      )
      .refine(
        (val) => val === undefined || /^[a-z0-9-]+$/.test(val),
        "Slug must contain only lowercase letters, numbers, and hyphens"
      ),
  notes: (schema) =>
    schema
      .transform((val) => val?.trim()) // Trim notes too
      .pipe(z.string().max(500, "Notes must be less than 500 characters"))
      .optional()
      .nullable(),
  accountType: (schema) =>
    schema
      .pipe(
        z.enum(accountTypeEnum, {
          message: "Please select a valid account type",
        })
      )
      .default("checking"),
  institution: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().max(100, "Institution name must be less than 100 characters"))
      .optional()
      .nullable(),
  accountIcon: (schema) =>
    schema
      .pipe(z.string().refine((val) => !val || isValidIconName(val), "Invalid icon selection"))
      .optional()
      .nullable(),
  accountColor: (schema) =>
    schema
      .pipe(z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex code"))
      .optional()
      .nullable(),
  initialBalance: (schema) => schema.pipe(z.number()).default(0.0),
  accountNumberLast4: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().min(1).max(32, "Account number reference must be 32 characters or fewer"))
      .optional()
      .nullable(),
  onBudget: (schema) => schema.pipe(z.boolean()).default(true),
  portalUrl: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().max(200, "Portal URL must be 200 characters or fewer"))
      .optional()
      .nullable(),
  statementCycleDay: (schema) =>
    schema
      .pipe(z.number().int().min(1).max(31, "Statement cycle day must be 1-31"))
      .optional()
      .nullable(),
  debtLimit: (schema) =>
    schema
      .pipe(z.number().positive("Credit limit must be a positive number"))
      .optional()
      .nullable(),
  minimumPayment: (schema) =>
    schema
      .pipe(z.number().positive("Minimum payment must be a positive number"))
      .optional()
      .nullable(),
  paymentDueDay: (schema) =>
    schema
      .pipe(z.number().int().min(1).max(31, "Payment due day must be between 1 and 31"))
      .optional()
      .nullable(),
  interestRate: (schema) =>
    schema
      .pipe(z.number().min(0).max(100, "Interest rate must be between 0 and 100"))
      .optional()
      .nullable(),
  // Loan-specific fields
  loanSubtype: (schema) =>
    schema
      .pipe(
        z.enum(loanSubtypeEnum, {
          message: "Please select a valid loan type",
        })
      )
      .optional()
      .nullable(),
  originalPrincipal: (schema) =>
    schema
      .pipe(z.number().positive("Original principal must be a positive number"))
      .optional()
      .nullable(),
  escrowBalance: (schema) =>
    schema.pipe(z.number().min(0)).optional().nullable(),
  maturityDate: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Maturity date must be YYYY-MM-DD"))
      .optional()
      .nullable(),
  // HSA-specific fields
  hsaContributionLimit: (schema) =>
    schema.pipe(z.number().min(0)).optional().nullable(),
  hsaType: (schema) =>
    schema
      .pipe(z.enum(hsaTypeEnum, { message: "HSA type must be 'individual' or 'family'" }))
      .optional()
      .nullable(),
  hsaCurrentTaxYear: (schema) =>
    schema.pipe(z.number().int().min(2000).max(2100)).optional().nullable(),
  hsaAdministrator: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().max(100, "HSA administrator must be 100 characters or fewer"))
      .optional()
      .nullable(),
  hsaHighDeductiblePlan: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().max(200, "HDHP description must be 200 characters or fewer"))
      .optional()
      .nullable(),
  // Investment performance tracking fields
  vestedBalance: (schema) =>
    schema.pipe(z.number().min(0)).optional().nullable(),
  expenseRatio: (schema) =>
    schema
      .pipe(z.number().min(0).max(5, "Expense ratios above 5% are unusual — double-check your value"))
      .optional()
      .nullable(),
  benchmarkSymbol: (schema) =>
    schema
      .transform((val) => val?.trim()?.toUpperCase())
      .pipe(z.string().max(10, "Benchmark symbol must be less than 10 characters"))
      .optional()
      .nullable(),
  // Cash flow management fields
  targetBalance: (schema) =>
    schema
      .pipe(z.number().min(0).max(100_000_000))
      .optional()
      .nullable(),
  // Utility account fields
  utilitySubtype: (schema) =>
    schema
      .pipe(
        z.enum(utilitySubtypeEnum, {
          message: "Please select a valid utility type",
        })
      )
      .optional()
      .nullable(),
  utilityProvider: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().max(100, "Provider name must be less than 100 characters"))
      .optional()
      .nullable(),
  utilityAccountNumber: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().max(50, "Account number must be less than 50 characters"))
      .optional()
      .nullable(),
  utilityServiceAddress: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().max(200, "Service address must be less than 200 characters"))
      .optional()
      .nullable(),
  encryptionLevel: (schema) =>
    schema
      .pipe(
        z.enum(["inherit", "0", "1", "2", "3", "4"], {
          message: "Invalid encryption level",
        })
      )
      .default("inherit"),
  encryptionKeyId: (schema) => schema.optional().nullable(),
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
        .regex(NAME_ALLOWED_PATTERN, "Account name contains invalid characters")
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
    .refine((val) => !val || isValidIconName(val), "Invalid icon selection")
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
    .pipe(z.string().min(1).max(32, "Account number reference must be 32 characters or fewer"))
    .optional()
    .nullable(),
  onBudget: z.boolean().optional(),
  portalUrl: z
    .string()
    .transform((val) => val?.trim())
    .pipe(z.string().max(200, "Portal URL must be 200 characters or fewer"))
    .optional()
    .nullable(),
  statementCycleDay: z
    .number()
    .int()
    .min(1)
    .max(31, "Statement cycle day must be 1-31")
    .optional()
    .nullable(),
  debtLimit: z.number().positive("Credit limit must be a positive number").optional().nullable(),
  minimumPayment: z
    .number()
    .positive("Minimum payment must be a positive number")
    .optional()
    .nullable(),
  paymentDueDay: z
    .number()
    .int()
    .min(1)
    .max(31, "Payment due day must be between 1 and 31")
    .optional()
    .nullable(),
  interestRate: z
    .number()
    .min(0)
    .max(100, "Interest rate must be between 0 and 100")
    .optional()
    .nullable(),
  // Loan-specific fields
  loanSubtype: z.enum(loanSubtypeEnum).optional().nullable(),
  originalPrincipal: z.number().positive("Original principal must be a positive number").optional().nullable(),
  escrowBalance: z.number().min(0).optional().nullable(),
  maturityDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Maturity date must be YYYY-MM-DD")
    .optional()
    .nullable(),
  // HSA-specific fields
  hsaContributionLimit: z.number().min(0).optional().nullable(),
  hsaType: z.enum(hsaTypeEnum).optional().nullable(),
  hsaCurrentTaxYear: z.number().int().min(2000).max(2100).optional().nullable(),
  hsaAdministrator: z
    .string()
    .transform((val) => val?.trim())
    .pipe(z.string().max(100, "HSA administrator must be 100 characters or fewer"))
    .optional()
    .nullable(),
  hsaHighDeductiblePlan: z
    .string()
    .transform((val) => val?.trim())
    .pipe(z.string().max(200, "HDHP description must be 200 characters or fewer"))
    .optional()
    .nullable(),
  // Investment account fields
  investmentSubtype: z.enum(investmentSubtypeEnum).optional().nullable(),
  annualContributionLimit: z.number().positive("Contribution limit must be a positive number").optional().nullable(),
  expenseRatio: z.number().min(0).max(5, "Expense ratios above 5% are unusual — double-check your value").optional().nullable(),
  benchmarkSymbol: z.string().max(10, "Benchmark symbol must be less than 10 characters").optional().nullable(),
  vestedBalance: z.number().min(0).optional().nullable(),
  // Cash flow management fields
  targetBalance: z.number().min(0).max(100_000_000).optional().nullable(),
  // Utility account fields
  utilitySubtype: z.enum(utilitySubtypeEnum).optional().nullable(),
  utilityProvider: z
    .string()
    .transform((val) => val?.trim())
    .pipe(z.string().max(100, "Provider name must be less than 100 characters"))
    .optional()
    .nullable(),
  utilityAccountNumber: z
    .string()
    .transform((val) => val?.trim())
    .pipe(z.string().max(50, "Account number must be less than 50 characters"))
    .optional()
    .nullable(),
  utilityServiceAddress: z
    .string()
    .transform((val) => val?.trim())
    .pipe(z.string().max(200, "Service address must be less than 200 characters"))
    .optional()
    .nullable(),
  // Balance management fields
  balanceResetDate: z.string().optional().nullable(), // ISO date string
  balanceAtResetDate: z.number().optional().nullable(),
  reconciledBalance: z.number().optional().nullable(),
  reconciledDate: z.string().optional().nullable(), // ISO date string
  encryptionLevel: z.enum(["inherit", "0", "1", "2", "3", "4"]).optional(),
  encryptionKeyId: z.string().optional().nullable(),
});

// Combined schema that handles both create and update
export const formAccountSchema = z.union([formInsertAccountSchema, formUpdateAccountSchema]);
export const removeAccountSchema = z.object({ id: z.number().nonnegative() });

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
export type RemoveAccountData = z.infer<typeof removeAccountSchema>;

// Helper functions for account classification
export function isDebtAccount(accountType: AccountType): boolean {
  return accountType === "credit_card" || accountType === "loan";
}

export function isInvestmentAccount(accountType: AccountType): boolean {
  return accountType === "investment";
}

export function isHealthSavingsAccount(accountType: AccountType): boolean {
  return accountType === "hsa";
}

export function isUtilityAccount(accountType: AccountType): boolean {
  return accountType === "utility";
}

export function getAccountNature(accountType: AccountType): "asset" | "liability" {
  return isDebtAccount(accountType) ? "liability" : "asset";
}

/**
 * Parse account encryption level from database string to typed value
 */
export function parseAccountEncryptionLevel(
  level: string | null | undefined
): EncryptionLevel | "inherit" {
  if (!level || level === "inherit") return "inherit";
  const numLevel = parseInt(level, 10);
  if (numLevel >= 0 && numLevel <= 4) return numLevel as EncryptionLevel;
  return "inherit";
}
