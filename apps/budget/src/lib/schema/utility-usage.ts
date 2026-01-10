// Utility usage records for tracking consumption data (electric, gas, water, etc.)
// Each record represents a billing period with usage and cost information

import { relations, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accounts } from "./accounts";
import { transactions } from "./transactions";
import { workspaces } from "./workspaces";

// Usage unit types for different utilities
export const usageUnitEnum = [
  // Electric
  "kwh", // kilowatt-hours (consumption)
  "kw", // kilowatts (demand)
  // Gas
  "therms",
  "ccf", // hundred cubic feet
  "mcf", // thousand cubic feet
  "cubic_meters_gas",
  // Water
  "gallons",
  "hcf", // hundred cubic feet (water)
  "cubic_feet",
  "cubic_meters_water",
  // Internet
  "mbps", // speed
  "gb", // data usage
  // Generic
  "units",
] as const;

export type UsageUnit = (typeof usageUnitEnum)[number];

// Unit display info for UI
export const USAGE_UNIT_LABELS: Record<UsageUnit, { label: string; shortLabel: string }> = {
  kwh: { label: "Kilowatt-hours", shortLabel: "kWh" },
  kw: { label: "Kilowatts", shortLabel: "kW" },
  therms: { label: "Therms", shortLabel: "therms" },
  ccf: { label: "Hundred Cubic Feet", shortLabel: "CCF" },
  mcf: { label: "Thousand Cubic Feet", shortLabel: "MCF" },
  cubic_meters_gas: { label: "Cubic Meters", shortLabel: "m³" },
  gallons: { label: "Gallons", shortLabel: "gal" },
  hcf: { label: "Hundred Cubic Feet", shortLabel: "HCF" },
  cubic_feet: { label: "Cubic Feet", shortLabel: "cu ft" },
  cubic_meters_water: { label: "Cubic Meters", shortLabel: "m³" },
  mbps: { label: "Megabits per second", shortLabel: "Mbps" },
  gb: { label: "Gigabytes", shortLabel: "GB" },
  units: { label: "Units", shortLabel: "units" },
};

// Default units for each utility subtype
export const DEFAULT_UNITS_BY_SUBTYPE: Record<string, UsageUnit> = {
  electric: "kwh",
  gas: "therms",
  water: "gallons",
  internet: "gb",
  sewer: "gallons",
  trash: "units",
  other: "units",
};

export const utilityUsage = sqliteTable(
  "utility_usage",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    // Optional link to the payment transaction
    transactionId: integer("transaction_id").references(() => transactions.id, {
      onDelete: "set null",
    }),

    // Billing period
    periodStart: text("period_start").notNull(), // ISO date (YYYY-MM-DD)
    periodEnd: text("period_end").notNull(), // ISO date (YYYY-MM-DD)
    dueDate: text("due_date"), // Payment due date
    statementDate: text("statement_date"), // When statement was generated

    // Usage data
    usageAmount: real("usage_amount").notNull(),
    usageUnit: text("usage_unit", { enum: usageUnitEnum }).notNull(),

    // Meter readings (optional - for tracking actual readings)
    meterReadingStart: real("meter_reading_start"),
    meterReadingEnd: real("meter_reading_end"),

    // Rate information
    ratePerUnit: real("rate_per_unit"), // Average or base rate
    rateTierId: integer("rate_tier_id"), // For tiered pricing (future)

    // Cost breakdown
    baseCharge: real("base_charge"), // Fixed monthly charge
    usageCost: real("usage_cost"), // Cost for usage only
    taxes: real("taxes"),
    fees: real("fees"), // Regulatory fees, etc.
    totalAmount: real("total_amount").notNull(),

    // Computed/derived fields
    averageDailyUsage: real("average_daily_usage"),
    daysInPeriod: integer("days_in_period"),

    // Weather data for correlation (optional)
    avgTemperature: real("avg_temperature"), // Average temp during period
    heatingDegreeDays: real("heating_degree_days"), // For gas/electric heating analysis
    coolingDegreeDays: real("cooling_degree_days"), // For electric cooling analysis

    // Notes and import metadata
    notes: text("notes"),
    importedFrom: text("imported_from"), // Source file name
    rawImportData: text("raw_import_data"), // JSON - complete import record

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("utility_usage_workspace_idx").on(table.workspaceId),
    index("utility_usage_account_idx").on(table.accountId),
    index("utility_usage_transaction_idx").on(table.transactionId),
    index("utility_usage_period_idx").on(table.periodStart, table.periodEnd),
    index("utility_usage_period_start_idx").on(table.periodStart),
  ]
);

// Rate tiers for tiered pricing (electric, water - "use more, pay more per unit")
export const utilityRateTiers = sqliteTable(
  "utility_rate_tier",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),

    tierName: text("tier_name").notNull(), // e.g., "Tier 1", "Baseline", "Peak"
    tierOrder: integer("tier_order").notNull(), // Order for display (1, 2, 3...)

    usageMin: real("usage_min").notNull(), // Start of tier (inclusive)
    usageMax: real("usage_max"), // End of tier (null = unlimited)
    ratePerUnit: real("rate_per_unit").notNull(),

    // Rate validity period
    effectiveDate: text("effective_date").notNull(), // When this rate becomes active
    expirationDate: text("expiration_date"), // When this rate expires (null = current)

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("utility_rate_tier_account_idx").on(table.accountId),
    index("utility_rate_tier_effective_idx").on(table.effectiveDate),
  ]
);

// Relations
export const utilityUsageRelations = relations(utilityUsage, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [utilityUsage.workspaceId],
    references: [workspaces.id],
  }),
  account: one(accounts, {
    fields: [utilityUsage.accountId],
    references: [accounts.id],
  }),
  transaction: one(transactions, {
    fields: [utilityUsage.transactionId],
    references: [transactions.id],
  }),
}));

export const utilityRateTiersRelations = relations(utilityRateTiers, ({ one }) => ({
  account: one(accounts, {
    fields: [utilityRateTiers.accountId],
    references: [accounts.id],
  }),
}));

// Zod schemas
export const selectUtilityUsageSchema = createSelectSchema(utilityUsage);
export const insertUtilityUsageSchema = createInsertSchema(utilityUsage);

export const selectUtilityRateTierSchema = createSelectSchema(utilityRateTiers);
export const insertUtilityRateTierSchema = createInsertSchema(utilityRateTiers);

// Form schema for creating/updating utility usage records
export const formUtilityUsageSchema = createInsertSchema(utilityUsage, {
  workspaceId: (schema) => schema.optional(),
  periodStart: (schema) =>
    schema.pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date (YYYY-MM-DD)")),
  periodEnd: (schema) =>
    schema.pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date (YYYY-MM-DD)")),
  usageAmount: (schema) => schema.pipe(z.number().min(0, "Usage amount must be non-negative")),
  usageUnit: (schema) =>
    schema.pipe(
      z.enum(usageUnitEnum, {
        message: "Please select a valid usage unit",
      })
    ),
  totalAmount: (schema) => schema.pipe(z.number().min(0, "Total amount must be non-negative")),
  ratePerUnit: (schema) =>
    schema.pipe(z.number().positive("Rate must be positive")).optional().nullable(),
  baseCharge: (schema) =>
    schema.pipe(z.number().min(0, "Base charge must be non-negative")).optional().nullable(),
  usageCost: (schema) =>
    schema.pipe(z.number().min(0, "Usage cost must be non-negative")).optional().nullable(),
  taxes: (schema) =>
    schema.pipe(z.number().min(0, "Taxes must be non-negative")).optional().nullable(),
  fees: (schema) =>
    schema.pipe(z.number().min(0, "Fees must be non-negative")).optional().nullable(),
  daysInPeriod: (schema) =>
    schema.pipe(z.number().int().positive("Days must be positive")).optional().nullable(),
  notes: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().max(500, "Notes must be less than 500 characters"))
      .optional()
      .nullable(),
});

// Types
export type UtilityUsage = typeof utilityUsage.$inferSelect;
export type NewUtilityUsage = typeof utilityUsage.$inferInsert;
export type UtilityRateTier = typeof utilityRateTiers.$inferSelect;
export type NewUtilityRateTier = typeof utilityRateTiers.$inferInsert;

// Helper functions

/**
 * Calculate usage from meter readings
 */
export function calculateUsageFromReadings(
  startReading: number,
  endReading: number
): number {
  return Math.abs(endReading - startReading);
}

/**
 * Calculate average daily usage
 */
export function calculateAverageDailyUsage(
  usageAmount: number,
  periodStart: string,
  periodEnd: string
): number {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return days > 0 ? usageAmount / days : 0;
}

/**
 * Calculate cost per unit from total and usage
 */
export function calculateCostPerUnit(
  totalAmount: number,
  baseCharge: number | null,
  usageAmount: number
): number | null {
  if (usageAmount <= 0) return null;
  const usageCost = totalAmount - (baseCharge || 0);
  return usageCost / usageAmount;
}

/**
 * Convert between common units
 */
export function convertUsageUnits(
  amount: number,
  fromUnit: UsageUnit,
  toUnit: UsageUnit
): number | null {
  // Same unit, no conversion needed
  if (fromUnit === toUnit) return amount;

  // Water conversions
  if (fromUnit === "gallons" && toUnit === "hcf") return amount / 748;
  if (fromUnit === "hcf" && toUnit === "gallons") return amount * 748;
  if (fromUnit === "gallons" && toUnit === "cubic_feet") return amount / 7.48;
  if (fromUnit === "cubic_feet" && toUnit === "gallons") return amount * 7.48;
  if (fromUnit === "hcf" && toUnit === "cubic_feet") return amount * 100;
  if (fromUnit === "cubic_feet" && toUnit === "hcf") return amount / 100;

  // Gas conversions
  if (fromUnit === "ccf" && toUnit === "therms") return amount * 1.024; // approximate
  if (fromUnit === "therms" && toUnit === "ccf") return amount / 1.024;
  if (fromUnit === "mcf" && toUnit === "therms") return amount * 10.24; // approximate
  if (fromUnit === "therms" && toUnit === "mcf") return amount / 10.24;
  if (fromUnit === "ccf" && toUnit === "mcf") return amount / 10;
  if (fromUnit === "mcf" && toUnit === "ccf") return amount * 10;

  // No conversion available
  return null;
}
