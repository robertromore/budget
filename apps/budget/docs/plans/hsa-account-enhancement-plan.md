# HSA Account Type Enhancement Plan

## Overview

Implement comprehensive Health Savings Account (HSA) functionality with medical expense tracking, receipt management, claim status tracking, and tax compliance features. This builds on the existing account infrastructure while adding specialized capabilities for healthcare expense management.

## Current State

- ✅ Robust account system with multiple account types
- ✅ Transaction tracking with categories, payees, and notes
- ✅ Budget system for expense management
- ✅ Transfer transaction support
- ❌ No HSA account type
- ❌ No medical expense tracking
- ❌ No receipt/document attachment system
- ❌ No claim submission tracking
- ❌ No HSA-specific compliance features (contribution limits, qualified expenses, etc.)

## HSA Account Overview

**What is an HSA?**
A Health Savings Account is a tax-advantaged savings account for medical expenses, paired with high-deductible health plans (HDHPs). Key characteristics:

- **Triple tax advantage**: Tax-deductible contributions, tax-free growth, tax-free withdrawals for qualified medical expenses
- **Annual contribution limits**: $4,150 (individual) / $8,300 (family) for 2024, plus $1,000 catch-up (55+)
- **Qualified medical expenses**: IRS-defined list of eligible healthcare costs
- **Rollover**: Unused funds carry over year to year (unlike FSAs)
- **Portable**: Account follows the individual, not tied to employer
- **Investment option**: Many HSAs allow investing funds for long-term growth

## Tax Year Determination

**IRS Rules for HSA Tax Year:**
Per IRS Publication 969, medical expenses are deducted in the tax year they are **paid**, not when the service was received.

- **Service Date**: When medical care was provided
- **Payment Date**: When you paid for the expense
- **Tax Year**: Based on payment date (not service date)

**Example Scenarios:**

- Expense received in December 2024, paid January 2025 → Tax Year 2025
- Expense received and paid in same year → Use that tax year
- Reimbursement received in different year → Still deductible in payment year

**Implementation:**
The system will default to the payment date's year for `taxYear`, but allow manual override for edge cases.

## Implementation Phases

### Phase 1: Database Schema Enhancements

#### 1.1 Add HSA Account Type

**File**: `src/lib/schema/accounts.ts`

Add `hsa` to the account type enum:

```typescript
export const accountTypeEnum = [
  "checking",
  "savings",
  "investment",
  "credit_card",
  "loan",
  "cash",
  "hsa",  // Add HSA account type
  "other"
] as const;
```

Add HSA-specific fields to accounts table:

```typescript
// HSA-specific fields (only populated for HSA account type)
hsaContributionLimit: real("hsa_contribution_limit"), // Annual contribution limit for current tax year
hsaType: text("hsa_type", { enum: ["individual", "family"] }), // HSA type affects contribution limits
hsaCurrentTaxYear: integer("hsa_current_tax_year"), // Current tax year for tracking
hsaAdministrator: text("hsa_administrator"), // HSA provider (Fidelity, HSA Bank, etc.)
hsaHighDeductiblePlan: text("hsa_high_deductible_plan"), // Associated HDHP name/details
```

**Note**: Employer contributions are tracked as regular transactions (deposits) with a special category, not as an account-level field. This allows:

- Historical tracking of contributions over time
- Accurate balance calculations
- Reconciliation with transaction history

Update helper functions:

```typescript
export function isHealthSavingsAccount(accountType: AccountType): boolean {
  return accountType === 'hsa';
}

export function getAccountNature(accountType: AccountType): 'asset' | 'liability' {
  // HSA is an asset account (like savings)
  if (isDebtAccount(accountType)) return 'liability';
  return 'asset';
}
```

Update account validation schemas:

```typescript
export const formInsertAccountSchema = createInsertSchema(accounts, {
  // ... existing validations ...

  hsaType: (schema) =>
    schema
      .pipe(z.enum(["individual", "family"]))
      .optional()
      .nullable(),
  hsaContributionLimit: (schema) =>
    schema
      .pipe(z.number().min(0).max(100000))
      .optional()
      .nullable(),
  hsaCurrentTaxYear: (schema) =>
    schema
      .pipe(z.number().min(2000).max(2100))
      .optional()
      .nullable(),
  hsaAdministrator: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().max(100))
      .optional()
      .nullable(),
  hsaHighDeductiblePlan: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().max(200))
      .optional()
      .nullable(),
});
```

#### 1.2 Create Medical Expenses Table

**File**: `src/lib/schema/medical-expenses.ts`

```typescript
import { sqliteTable, integer, text, real, index } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { transactions } from "./transactions";
import { accounts } from "./accounts";

// Medical expense categories based on IRS Publication 502
export const medicalExpenseTypeEnum = [
  "doctor_visit",
  "specialist_visit",
  "urgent_care",
  "emergency_room",
  "hospital_stay",
  "surgery",
  "lab_tests",
  "imaging",
  "prescription",
  "otc_medicine", // Over-the-counter (qualified with prescription)
  "dental",
  "vision",
  "mental_health",
  "physical_therapy",
  "chiropractor",
  "medical_equipment",
  "hearing_aids",
  "home_health_care",
  "long_term_care",
  "health_insurance_premiums", // Qualified premiums
  "other_qualified",
  "non_qualified" // Non-qualified expenses (taxable if withdrawn)
] as const;

export type MedicalExpenseType = typeof medicalExpenseTypeEnum[number];

export const medicalExpenses = sqliteTable(
  "medical_expense",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    cuid: text("cuid").$defaultFn(() => createId()),

    // Core expense details
    transactionId: integer("transaction_id")
      .references(() => transactions.id, { onDelete: "restrict" })
      .notNull(),
    hsaAccountId: integer("hsa_account_id")
      .references(() => accounts.id, { onDelete: "restrict" })
      .notNull(),

    // Medical expense classification
    expenseType: text("expense_type", { enum: medicalExpenseTypeEnum }).notNull(),
    isQualified: integer("is_qualified", { mode: "boolean" }).default(true).notNull(),

    // Expense details
    provider: text("provider"), // Doctor, hospital, pharmacy name
    patientName: text("patient_name"), // Who received care
    diagnosis: text("diagnosis"), // ICD codes or description
    treatmentDescription: text("treatment_description"),

    // Financial tracking
    amount: real("amount").notNull(),
    insuranceCovered: real("insurance_covered").default(0).notNull(), // Amount covered by insurance
    outOfPocket: real("out_of_pocket").notNull(), // Amount you paid (amount - insuranceCovered)

    // Dates
    serviceDate: text("service_date").notNull(), // When service was received
    paidDate: text("paid_date"), // When you paid (defaults to transaction date if not specified)

    // Tax tracking (based on PAID date per IRS rules)
    taxYear: integer("tax_year").notNull(), // Tax year for reporting (based on payment date)

    // Additional metadata
    notes: text("notes"),

    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    // Unique index on transactionId - each transaction can only have one medical expense
    // This prevents duplicate medical expenses for the same transaction
    index("medical_expense_transaction_unique_idx").on(table.transactionId).unique(),
    index("medical_expense_hsa_account_idx").on(table.hsaAccountId),
    index("medical_expense_type_idx").on(table.expenseType),
    index("medical_expense_tax_year_idx").on(table.taxYear),
    index("medical_expense_service_date_idx").on(table.serviceDate),
    index("medical_expense_qualified_idx").on(table.isQualified),
    index("medical_expense_deleted_at_idx").on(table.deletedAt),
  ]
);

// Note: Relations will be defined in the schema barrel file to avoid circular dependencies.
// The relations below should be added to src/lib/schema/index.ts AFTER importing all tables.
// DO NOT define these relations in this file, as expenseReceipts and hsaClaims are not imported here.
//
// Example for src/lib/schema/index.ts:
// import { medicalExpenses } from "./medical-expenses";
// import { expenseReceipts } from "./expense-receipts";
// import { hsaClaims } from "./hsa-claims";
// import { transactions } from "./transactions";
// import { accounts } from "./accounts";
//
// export const medicalExpensesRelations = relations(medicalExpenses, ({ one, many }) => ({
//   transaction: one(transactions, {
//     fields: [medicalExpenses.transactionId],
//     references: [transactions.id],
//   }),
//   hsaAccount: one(accounts, {
//     fields: [medicalExpenses.hsaAccountId],
//     references: [accounts.id],
//   }),
//   receipts: many(expenseReceipts),
//   claims: many(hsaClaims),
// }));

// Validation schemas
export const selectMedicalExpenseSchema = createSelectSchema(medicalExpenses);
export const insertMedicalExpenseSchema = createInsertSchema(medicalExpenses);

export const formInsertMedicalExpenseSchema = createInsertSchema(medicalExpenses, {
  expenseType: (schema) =>
    schema.pipe(z.enum(medicalExpenseTypeEnum, {
      message: "Please select a valid expense type"
    })),
  amount: (schema) =>
    schema.pipe(z.number().positive("Amount must be positive").max(1000000)),
  insuranceCovered: (schema) =>
    schema.pipe(z.number().min(0).max(1000000)).optional().nullable(),
  provider: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().max(200))
      .optional()
      .nullable(),
  patientName: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().max(100))
      .optional()
      .nullable(),
  diagnosis: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().max(500))
      .optional()
      .nullable(),
  treatmentDescription: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().max(1000))
      .optional()
      .nullable(),
  notes: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().max(1000))
      .optional()
      .nullable(),
  serviceDate: (schema) =>
    schema.pipe(z.string().datetime()),
  paidDate: (schema) =>
    schema.pipe(z.string().datetime()).optional().nullable(),
  taxYear: (schema) =>
    schema.pipe(z.number().min(2000).max(2100)),
});

export type MedicalExpense = typeof medicalExpenses.$inferSelect;
export type NewMedicalExpense = typeof medicalExpenses.$inferInsert;
```

**Note**: The reverse relation from `transactions` to `medicalExpense` will be added in the schema barrel file (see Section 1.5).

#### 1.3 Create Expense Receipts Table

**File**: `src/lib/schema/expense-receipts.ts`

```typescript
import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { medicalExpenses } from "./medical-expenses";

export const receiptTypeEnum = [
  "receipt",
  "bill",
  "invoice",
  "eob", // Explanation of Benefits
  "statement",
  "prescription",
  "other"
] as const;

export type ReceiptType = typeof receiptTypeEnum[number];

// Allowed MIME types for receipts
export const ALLOWED_RECEIPT_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf"
] as const;

export const MAX_RECEIPT_SIZE = 10 * 1024 * 1024; // 10MB

export const expenseReceipts = sqliteTable(
  "expense_receipt",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    cuid: text("cuid").$defaultFn(() => createId()),

    medicalExpenseId: integer("medical_expense_id")
      .references(() => medicalExpenses.id, { onDelete: "restrict" })
      .notNull(),

    // File metadata
    receiptType: text("receipt_type", { enum: receiptTypeEnum }).default("receipt"),
    fileName: text("file_name").notNull(),
    fileSize: integer("file_size").notNull(), // Size in bytes
    mimeType: text("mime_type").notNull(), // image/jpeg, image/png, application/pdf

    // Storage information
    storagePath: text("storage_path").notNull(), // Relative path from uploads directory
    storageUrl: text("storage_url"), // Public URL if using cloud storage (future)

    // OCR/extraction data (future enhancement)
    extractedText: text("extracted_text"), // OCR text from receipt
    extractedData: text("extracted_data"), // JSON: {amount, date, provider, etc.}

    // Metadata
    description: text("description"),
    uploadedAt: text("uploaded_at").notNull().default(sql`CURRENT_TIMESTAMP`),

    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    index("expense_receipt_medical_expense_idx").on(table.medicalExpenseId),
    index("expense_receipt_type_idx").on(table.receiptType),
    index("expense_receipt_deleted_at_idx").on(table.deletedAt),
  ]
);

// NOTE: Relations are defined in src/lib/schema/index.ts to avoid circular dependencies

// Validation schemas
export const selectExpenseReceiptSchema = createSelectSchema(expenseReceipts);
export const insertExpenseReceiptSchema = createInsertSchema(expenseReceipts);

export const formInsertExpenseReceiptSchema = createInsertSchema(expenseReceipts, {
  receiptType: (schema) =>
    schema.pipe(z.enum(receiptTypeEnum)).optional(),
  fileName: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().min(1).max(255)),
  fileSize: (schema) =>
    schema.pipe(
      z.number()
        .positive()
        .max(MAX_RECEIPT_SIZE, `File size must be less than ${MAX_RECEIPT_SIZE / 1024 / 1024}MB`)
    ),
  mimeType: (schema) =>
    schema.pipe(
      z.string().refine(
        (val) => ALLOWED_RECEIPT_MIMES.includes(val as any),
        "File type must be JPEG, PNG, WebP, or PDF"
      )
    ),
  description: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().max(500))
      .optional()
      .nullable(),
});

export type ExpenseReceipt = typeof expenseReceipts.$inferSelect;
export type NewExpenseReceipt = typeof expenseReceipts.$inferInsert;
```

#### 1.4 Create HSA Claims Table

**File**: `src/lib/schema/hsa-claims.ts`

```typescript
import { sqliteTable, integer, text, real, index } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { medicalExpenses } from "./medical-expenses";

export const claimStatusEnum = [
  "not_submitted",     // Expense recorded, no claim submitted yet
  "pending_submission", // Preparing to submit
  "submitted",         // Claim submitted to HSA administrator
  "in_review",         // Being reviewed by administrator
  "approved",          // Claim approved
  "partially_approved", // Only part of claim approved
  "denied",            // Claim denied
  "resubmission_required", // Need to resubmit with more info
  "paid",              // Reimbursement received
  "withdrawn"          // Claim withdrawn by user
] as const;

export type ClaimStatus = typeof claimStatusEnum[number];

export const hsaClaims = sqliteTable(
  "hsa_claim",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    cuid: text("cuid").$defaultFn(() => createId()),

    medicalExpenseId: integer("medical_expense_id")
      .references(() => medicalExpenses.id, { onDelete: "restrict" })
      .notNull(),

    // Claim details
    claimNumber: text("claim_number"), // External claim number from HSA administrator
    status: text("status", { enum: claimStatusEnum }).default("not_submitted").notNull(),

    // Financial details
    claimedAmount: real("claimed_amount").notNull(),
    approvedAmount: real("approved_amount").default(0),
    deniedAmount: real("denied_amount").default(0),
    paidAmount: real("paid_amount").default(0),

    // Status tracking
    submittedDate: text("submitted_date"),
    reviewDate: text("review_date"),
    approvalDate: text("approval_date"),
    paymentDate: text("payment_date"),

    // Denial/rejection information
    denialReason: text("denial_reason"),
    denialCode: text("denial_code"),

    // Administrator information
    administratorName: text("administrator_name"), // HSA provider (Fidelity, HSA Bank, etc.)

    // Additional notes
    notes: text("notes"),
    internalNotes: text("internal_notes"), // Private notes not for submission

    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    index("hsa_claim_medical_expense_idx").on(table.medicalExpenseId),
    index("hsa_claim_status_idx").on(table.status),
    index("hsa_claim_submitted_date_idx").on(table.submittedDate),
    index("hsa_claim_payment_date_idx").on(table.paymentDate),
    index("hsa_claim_deleted_at_idx").on(table.deletedAt),
  ]
);

// NOTE: Relations are defined in src/lib/schema/index.ts to avoid circular dependencies

// Validation schemas
export const selectHsaClaimSchema = createSelectSchema(hsaClaims);
export const insertHsaClaimSchema = createInsertSchema(hsaClaims);

export const formInsertHsaClaimSchema = createInsertSchema(hsaClaims, {
  status: (schema) =>
    schema.pipe(z.enum(claimStatusEnum)),
  claimedAmount: (schema) =>
    schema.pipe(z.number().positive().max(1000000)),
  approvedAmount: (schema) =>
    schema.pipe(z.number().min(0).max(1000000)).optional(),
  deniedAmount: (schema) =>
    schema.pipe(z.number().min(0).max(1000000)).optional(),
  paidAmount: (schema) =>
    schema.pipe(z.number().min(0).max(1000000)).optional(),
  claimNumber: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().max(100))
      .optional()
      .nullable(),
  denialReason: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().max(1000))
      .optional()
      .nullable(),
  administratorName: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().max(100))
      .optional()
      .nullable(),
  notes: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().max(1000))
      .optional()
      .nullable(),
});

export type HsaClaim = typeof hsaClaims.$inferSelect;
export type NewHsaClaim = typeof hsaClaims.$inferInsert;
```

#### 1.5 Schema Barrel File & Relations Setup

**CRITICAL**: Due to circular dependencies between tables, all relations MUST be defined in the schema barrel file (`src/lib/schema/index.ts`), not in individual schema files.

**File**: `src/lib/schema/index.ts`

Add the following to the schema barrel file after importing all tables:

```typescript
// Import all HSA-related schemas
export * from "./medical-expenses";
export * from "./expense-receipts";
export * from "./hsa-claims";

// Import table definitions for relations
import { medicalExpenses } from "./medical-expenses";
import { expenseReceipts } from "./expense-receipts";
import { hsaClaims } from "./hsa-claims";
import { transactions } from "./transactions";
import { accounts } from "./accounts";
import { relations } from "drizzle-orm";

// Define all HSA-related relations here to avoid circular dependencies

export const medicalExpensesRelations = relations(medicalExpenses, ({ one, many }) => ({
  transaction: one(transactions, {
    fields: [medicalExpenses.transactionId],
    references: [transactions.id],
  }),
  hsaAccount: one(accounts, {
    fields: [medicalExpenses.hsaAccountId],
    references: [accounts.id],
  }),
  receipts: many(expenseReceipts),
  claims: many(hsaClaims),
}));

export const expenseReceiptsRelations = relations(expenseReceipts, ({ one }) => ({
  medicalExpense: one(medicalExpenses, {
    fields: [expenseReceipts.medicalExpenseId],
    references: [medicalExpenses.id],
  }),
}));

export const hsaClaimsRelations = relations(hsaClaims, ({ one }) => ({
  medicalExpense: one(medicalExpenses, {
    fields: [hsaClaims.medicalExpenseId],
    references: [medicalExpenses.id],
  }),
}));

// Update existing transactionsRelations to include medical expense
export const transactionsRelations = relations(transactions, ({ many, one }) => ({
  // ... existing relations ...

  // Add this new relation
  medicalExpense: one(medicalExpenses, {
    fields: [transactions.id],
    references: [medicalExpenses.transactionId],
  }),
}));

// Update existing accountsRelations to include medical expenses
export const accountsRelations = relations(accounts, ({ many, one }) => ({
  // ... existing relations ...

  // Add this new relation
  medicalExpenses: many(medicalExpenses),
}));
```

**Important Notes:**

1. **Remove any relations defined in individual schema files** - They should only be in the barrel file
2. **The relations must be defined AFTER all table imports** to avoid undefined variable errors
3. **Update existing relations** for `transactions` and `accounts` tables to include the new relationships
4. **Export all relations** so they're available to the Drizzle query builder

### Phase 2: Service Layer Implementation

#### 2.1 Medical Expense Service

**File**: `src/lib/server/domains/medical-expenses/service.ts`

**Important**: For complex operations that involve multiple database writes (e.g., creating a medical expense with receipts), wrap operations in Drizzle transactions to ensure atomicity:

```typescript
// Example of using transactions
await db.transaction(async (tx) => {
  const [expense] = await tx.insert(medicalExpenses).values({...});
  await tx.insert(expenseReceipts).values({...});
  // If any operation fails, all changes are rolled back
});
```

```typescript
import { db } from "$lib/server/db";
import { medicalExpenses, type MedicalExpenseType } from "$lib/schema/medical-expenses";
import { expenseReceipts } from "$lib/schema/expense-receipts";
import { hsaClaims } from "$lib/schema/hsa-claims";
import { eq, and, desc, isNull } from "drizzle-orm";
import { getCurrentTimestamp } from "$lib/utils/dates";

interface CreateMedicalExpenseParams {
  transactionId: number;
  hsaAccountId: number;
  expenseType: MedicalExpenseType;
  isQualified: boolean;
  provider?: string;
  patientName?: string;
  diagnosis?: string;
  treatmentDescription?: string;
  amount: number;
  insuranceCovered?: number;
  serviceDate: string;
  paidDate?: string;
  taxYear: number;
  notes?: string;
}

interface UpdateMedicalExpenseParams {
  // Core fields that can be updated
  expenseType?: MedicalExpenseType;
  isQualified?: boolean;
  provider?: string;
  patientName?: string;
  diagnosis?: string;
  treatmentDescription?: string;
  amount?: number;
  insuranceCovered?: number;
  serviceDate?: string;
  paidDate?: string;
  taxYear?: number;
  notes?: string;
  // Note: transactionId and hsaAccountId are NOT included - they should never be updated
}

export class MedicalExpenseService {
  // Create a new medical expense
  async createMedicalExpense(params: CreateMedicalExpenseParams) {
    // Validate insurance amount
    if (params.insuranceCovered !== undefined && params.insuranceCovered < 0) {
      throw new Error("Insurance covered amount cannot be negative");
    }
    if (params.insuranceCovered !== undefined && params.insuranceCovered > params.amount) {
      throw new Error("Insurance covered amount cannot exceed total amount");
    }

    const outOfPocket = params.amount - (params.insuranceCovered || 0);

    const [expense] = await db.insert(medicalExpenses).values({
      transactionId: params.transactionId,
      hsaAccountId: params.hsaAccountId,
      expenseType: params.expenseType,
      isQualified: params.isQualified,
      provider: params.provider,
      patientName: params.patientName,
      diagnosis: params.diagnosis,
      treatmentDescription: params.treatmentDescription,
      amount: params.amount,
      insuranceCovered: params.insuranceCovered || 0,
      outOfPocket: outOfPocket,
      serviceDate: params.serviceDate,
      paidDate: params.paidDate,
      taxYear: params.taxYear,
      notes: params.notes,
    }).returning();

    return expense;
  }

  // Get medical expenses for an HSA account (excludes soft-deleted by default)
  async getExpensesByHsaAccount(hsaAccountId: number, includeDeleted = false) {
    return await db.query.medicalExpenses.findMany({
      where: includeDeleted
        ? eq(medicalExpenses.hsaAccountId, hsaAccountId)
        : and(
            eq(medicalExpenses.hsaAccountId, hsaAccountId),
            isNull(medicalExpenses.deletedAt)
          ),
      with: {
        transaction: true,
        receipts: {
          where: isNull(expenseReceipts.deletedAt),
        },
        claims: {
          where: isNull(hsaClaims.deletedAt),
        },
      },
      orderBy: [desc(medicalExpenses.serviceDate)],
    });
  }

  // Get a single medical expense by ID
  async getExpenseById(id: number) {
    return await db.query.medicalExpenses.findFirst({
      where: and(
        eq(medicalExpenses.id, id),
        isNull(medicalExpenses.deletedAt)
      ),
      with: {
        transaction: true,
        receipts: {
          where: isNull(expenseReceipts.deletedAt),
        },
        claims: {
          where: isNull(hsaClaims.deletedAt),
        },
      },
    });
  }

  // Get expenses by tax year (excludes soft-deleted)
  async getExpensesByTaxYear(hsaAccountId: number, taxYear: number) {
    return await db.query.medicalExpenses.findMany({
      where: and(
        eq(medicalExpenses.hsaAccountId, hsaAccountId),
        eq(medicalExpenses.taxYear, taxYear),
        isNull(medicalExpenses.deletedAt)
      ),
      with: {
        transaction: true,
        receipts: {
          where: isNull(expenseReceipts.deletedAt),
        },
        claims: {
          where: isNull(hsaClaims.deletedAt),
        },
      },
      orderBy: [desc(medicalExpenses.serviceDate)],
    });
  }

  // Get expenses with pending claims
  async getExpensesWithPendingClaims(hsaAccountId: number) {
    const expenses = await this.getExpensesByHsaAccount(hsaAccountId);

    return expenses.filter(expense =>
      expense.claims.some(claim =>
        claim.status === 'submitted' ||
        claim.status === 'in_review' ||
        claim.status === 'pending_submission'
      )
    );
  }

  // Get unclaimed expenses (qualified expenses with no claims or not_submitted status)
  async getUnclaimedExpenses(hsaAccountId: number) {
    const expenses = await this.getExpensesByHsaAccount(hsaAccountId);

    return expenses.filter(expense =>
      expense.isQualified && (
        expense.claims.length === 0 ||
        expense.claims.every(claim => claim.status === 'not_submitted')
      )
    );
  }

  // Get qualified vs non-qualified expense breakdown
  async getExpenseSummary(hsaAccountId: number, taxYear?: number) {
    const expenses = taxYear
      ? await this.getExpensesByTaxYear(hsaAccountId, taxYear)
      : await this.getExpensesByHsaAccount(hsaAccountId);

    const totalQualified = expenses
      .filter(e => e.isQualified)
      .reduce((sum, e) => sum + e.outOfPocket, 0);

    const totalNonQualified = expenses
      .filter(e => !e.isQualified)
      .reduce((sum, e) => sum + e.outOfPocket, 0);

    const allClaims = expenses.flatMap(e => e.claims);
    const totalClaimed = allClaims.reduce((sum, c) => sum + c.claimedAmount, 0);
    const totalReimbursed = allClaims.reduce((sum, c) => sum + c.paidAmount, 0);
    const pendingClaims = allClaims.filter(c =>
      c.status === 'submitted' || c.status === 'in_review'
    ).length;

    return {
      totalQualifiedExpenses: totalQualified,
      totalNonQualifiedExpenses: totalNonQualified,
      totalClaimed,
      totalReimbursed,
      pendingClaimsCount: pendingClaims,
      totalExpenses: expenses.length,
    };
  }

  // Update medical expense
  async updateMedicalExpense(id: number, params: UpdateMedicalExpenseParams) {
    // Recalculate out-of-pocket if amount or insurance covered changed
    const updates: any = { ...params };
    if (params.amount !== undefined || params.insuranceCovered !== undefined) {
      const current = await db.query.medicalExpenses.findFirst({
        where: eq(medicalExpenses.id, id),
      });
      if (current) {
        const amount = params.amount ?? current.amount;
        const insuranceCovered = params.insuranceCovered ?? current.insuranceCovered;

        // Validate insurance amount
        if (insuranceCovered < 0) {
          throw new Error("Insurance covered amount cannot be negative");
        }
        if (insuranceCovered > amount) {
          throw new Error("Insurance covered amount cannot exceed total amount");
        }

        updates.outOfPocket = amount - insuranceCovered;
      }
    }

    updates.updatedAt = getCurrentTimestamp();

    const [updated] = await db.update(medicalExpenses)
      .set(updates)
      .where(eq(medicalExpenses.id, id))
      .returning();

    return updated;
  }

  // Soft delete medical expense
  async deleteMedicalExpense(id: number) {
    const [deleted] = await db.update(medicalExpenses)
      .set({
        deletedAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      })
      .where(eq(medicalExpenses.id, id))
      .returning();

    return deleted;
  }
}
```

#### 2.2 Receipt Upload Service

**File**: `src/lib/server/domains/medical-expenses/receipt-service.ts`

```typescript
import { db } from "$lib/server/db";
import { expenseReceipts, type ReceiptType, ALLOWED_RECEIPT_MIMES, MAX_RECEIPT_SIZE } from "$lib/schema/expense-receipts";
import { eq, isNull, and } from "drizzle-orm";
import { writeFile, mkdir, readFile, unlink } from "fs/promises";
import { join, resolve } from "path";
import { createId } from "@paralleldrive/cuid2";
import { env } from "$env/dynamic/private";
import { getCurrentTimestamp } from "$lib/utils/dates";

interface UploadReceiptParams {
  medicalExpenseId: number;
  receiptType: ReceiptType;
  fileName: string;
  fileBuffer: ArrayBuffer;
  mimeType: string;
  description?: string;
}

export class ReceiptUploadService {
  // Use environment variable or default to uploads/receipts
  private readonly uploadBaseDir = env.RECEIPT_UPLOAD_DIR || join(process.cwd(), "uploads", "receipts");

  // Validate file before upload
  validateFile(fileName: string, fileSize: number, mimeType: string): { valid: boolean; error?: string } {
    // Check file size
    if (fileSize > MAX_RECEIPT_SIZE) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${MAX_RECEIPT_SIZE / 1024 / 1024}MB`
      };
    }

    // Check MIME type
    if (!ALLOWED_RECEIPT_MIMES.includes(mimeType as any)) {
      return {
        valid: false,
        error: `File type ${mimeType} is not allowed. Allowed types: ${ALLOWED_RECEIPT_MIMES.join(", ")}`
      };
    }

    // Check file extension matches MIME type
    const ext = fileName.toLowerCase().split('.').pop();
    const mimeExt = mimeType.split('/').pop();

    const extensionMap: Record<string, string[]> = {
      'jpeg': ['jpg', 'jpeg'],
      'jpg': ['jpg', 'jpeg'],
      'png': ['png'],
      'webp': ['webp'],
      'pdf': ['pdf'],
    };

    if (mimeExt && extensionMap[mimeExt] && !extensionMap[mimeExt].includes(ext || '')) {
      return {
        valid: false,
        error: 'File extension does not match MIME type'
      };
    }

    return { valid: true };
  }

  async uploadReceipt(params: UploadReceiptParams) {
    // Validate file
    const validation = this.validateFile(
      params.fileName,
      params.fileBuffer.byteLength,
      params.mimeType
    );

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Ensure upload directory exists
    await mkdir(this.uploadBaseDir, { recursive: true });

    // Generate unique filename with original extension
    const fileId = createId();
    const extension = params.fileName.split('.').pop()?.toLowerCase() || 'bin';
    const uniqueFileName = `${fileId}.${extension}`;

    // Create year/month subdirectories for organization
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const subDir = join(year, month);
    const fullDir = join(this.uploadBaseDir, subDir);

    await mkdir(fullDir, { recursive: true });

    // Full storage path
    const storagePath = join(subDir, uniqueFileName);
    const absolutePath = join(this.uploadBaseDir, storagePath);

    // Save file to disk
    const buffer = Buffer.from(params.fileBuffer);
    await writeFile(absolutePath, buffer);

    // Create database record
    const [receipt] = await db.insert(expenseReceipts).values({
      medicalExpenseId: params.medicalExpenseId,
      receiptType: params.receiptType,
      fileName: params.fileName, // Original filename
      fileSize: params.fileBuffer.byteLength,
      mimeType: params.mimeType,
      storagePath: storagePath, // Relative path from uploadBaseDir
      description: params.description,
    }).returning();

    return receipt;
  }

  async getReceipt(receiptId: number) {
    return await db.query.expenseReceipts.findFirst({
      where: and(
        eq(expenseReceipts.id, receiptId),
        isNull(expenseReceipts.deletedAt)
      ),
    });
  }

  async getReceiptFile(receiptId: number): Promise<{ buffer: Buffer; mimeType: string; fileName: string } | null> {
    const receipt = await this.getReceipt(receiptId);
    if (!receipt) return null;

    const absolutePath = join(this.uploadBaseDir, receipt.storagePath);

    try {
      const buffer = await readFile(absolutePath);
      return {
        buffer,
        mimeType: receipt.mimeType,
        fileName: receipt.fileName,
      };
    } catch (error) {
      console.error(`Failed to read receipt file: ${absolutePath}`, error);
      return null;
    }
  }

  async deleteReceipt(receiptId: number, hardDelete = false) {
    const receipt = await this.getReceipt(receiptId);
    if (!receipt) throw new Error('Receipt not found');

    if (hardDelete) {
      // Delete file from filesystem FIRST
      const absolutePath = join(this.uploadBaseDir, receipt.storagePath);
      try {
        await unlink(absolutePath);
      } catch (error) {
        console.error(`Failed to delete receipt file: ${absolutePath}`, error);
        // FAIL the operation if file delete fails - prevents orphaned DB records
        throw new Error('Failed to delete receipt file. Database record preserved.');
      }

      // Only delete from database if file deletion succeeded
      await db.delete(expenseReceipts)
        .where(eq(expenseReceipts.id, receiptId));
    } else {
      // Soft delete (recommended) - preserves both file and record
      await db.update(expenseReceipts)
        .set({
          deletedAt: getCurrentTimestamp(),
          updatedAt: getCurrentTimestamp(),
        })
        .where(eq(expenseReceipts.id, receiptId));
    }
  }

  // Cleanup job to remove orphaned files (files without DB records)
  async cleanupOrphanedFiles(): Promise<{ removed: number; errors: string[] }> {
    const result = {
      removed: 0,
      errors: [] as string[],
    };

    try {
      const { readdir } = await import('fs/promises');
      const { join } = await import('path');

      // Recursively get all files in upload directory
      const getAllFiles = async (dir: string): Promise<string[]> => {
        const entries = await readdir(dir, { withFileTypes: true });
        const files = await Promise.all(
          entries.map(async (entry) => {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
              return getAllFiles(fullPath);
            }
            return [fullPath];
          })
        );
        return files.flat();
      };

      const allFiles = await getAllFiles(this.uploadBaseDir);

      // For each file, check if DB record exists
      for (const filePath of allFiles) {
        try {
          // Get relative path from uploadBaseDir
          const relativePath = filePath.replace(this.uploadBaseDir + '/', '');

          // Check if DB record exists for this file
          const record = await db.query.expenseReceipts.findFirst({
            where: eq(expenseReceipts.storagePath, relativePath),
          });

          // If no record exists, delete the file
          if (!record) {
            await unlink(filePath);
            result.removed++;
            console.log(`Removed orphaned file: ${relativePath}`);
          }
        } catch (error: any) {
          result.errors.push(`Failed to process ${filePath}: ${error.message}`);
          console.error(`Error processing file ${filePath}:`, error);
        }
      }

      return result;
    } catch (error: any) {
      result.errors.push(`Cleanup job failed: ${error.message}`);
      return result;
    }
  }

  async getReceiptsByExpense(medicalExpenseId: number) {
    return await db.query.expenseReceipts.findMany({
      where: and(
        eq(expenseReceipts.medicalExpenseId, medicalExpenseId),
        isNull(expenseReceipts.deletedAt)
      ),
    });
  }
}
```

#### 2.3 HSA Claim Service

**File**: `src/lib/server/domains/medical-expenses/claim-service.ts`

```typescript
import { db } from "$lib/server/db";
import { hsaClaims, type ClaimStatus } from "$lib/schema/hsa-claims";
import { eq, desc, isNull, and } from "drizzle-orm";
import { getCurrentTimestamp } from "$lib/utils/dates";

interface CreateClaimParams {
  medicalExpenseId: number;
  claimedAmount: number;
  administratorName?: string;
  notes?: string;
}

interface UpdateClaimStatusParams {
  claimId: number;
  status: ClaimStatus;
  claimNumber?: string;
  approvedAmount?: number;
  deniedAmount?: number;
  paidAmount?: number;
  denialReason?: string;
  denialCode?: string;
  notes?: string;
}

export class HsaClaimService {
  // Create a new claim
  async createClaim(params: CreateClaimParams) {
    const [claim] = await db.insert(hsaClaims).values({
      medicalExpenseId: params.medicalExpenseId,
      claimedAmount: params.claimedAmount,
      status: "pending_submission",
      administratorName: params.administratorName,
      notes: params.notes,
    }).returning();

    return claim;
  }

  // Submit a claim
  async submitClaim(claimId: number, claimNumber?: string) {
    const [claim] = await db.update(hsaClaims)
      .set({
        status: "submitted",
        claimNumber: claimNumber,
        submittedDate: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      })
      .where(eq(hsaClaims.id, claimId))
      .returning();

    return claim;
  }

  // Update claim status
  async updateClaimStatus(params: UpdateClaimStatusParams) {
    // Get current claim for validation
    const currentClaim = await db.query.hsaClaims.findFirst({
      where: eq(hsaClaims.id, params.claimId),
    });

    if (!currentClaim) {
      throw new Error('Claim not found');
    }

    // Validate claim amounts
    const claimedAmount = currentClaim.claimedAmount;
    const approvedAmount = params.approvedAmount ?? currentClaim.approvedAmount;
    const deniedAmount = params.deniedAmount ?? currentClaim.deniedAmount;
    const paidAmount = params.paidAmount ?? currentClaim.paidAmount;

    // Validate non-negative amounts
    if (approvedAmount < 0) {
      throw new Error("Approved amount cannot be negative");
    }
    if (deniedAmount < 0) {
      throw new Error("Denied amount cannot be negative");
    }
    if (paidAmount < 0) {
      throw new Error("Paid amount cannot be negative");
    }

    // Validate approved + denied = claimed (if both are set)
    if (approvedAmount > 0 || deniedAmount > 0) {
      const total = approvedAmount + deniedAmount;
      if (Math.abs(total - claimedAmount) > 0.01) { // Allow for floating point rounding
        throw new Error(`Approved (${approvedAmount}) + Denied (${deniedAmount}) must equal Claimed (${claimedAmount})`);
      }
    }

    // Validate paid <= approved
    if (paidAmount > approvedAmount) {
      throw new Error(`Paid amount (${paidAmount}) cannot exceed approved amount (${approvedAmount})`);
    }

    const updates: any = {
      status: params.status,
      updatedAt: getCurrentTimestamp(),
    };

    if (params.claimNumber) updates.claimNumber = params.claimNumber;
    if (params.approvedAmount !== undefined) updates.approvedAmount = params.approvedAmount;
    if (params.deniedAmount !== undefined) updates.deniedAmount = params.deniedAmount;
    if (params.paidAmount !== undefined) updates.paidAmount = params.paidAmount;
    if (params.denialReason) updates.denialReason = params.denialReason;
    if (params.denialCode) updates.denialCode = params.denialCode;
    if (params.notes) updates.notes = params.notes;

    // Set dates based on status (only if not already set)
    if (params.status === "in_review" && !currentClaim.reviewDate) {
      updates.reviewDate = getCurrentTimestamp();
    }
    if ((params.status === "approved" || params.status === "partially_approved") && !currentClaim?.approvalDate) {
      updates.approvalDate = getCurrentTimestamp();
    }
    if (params.status === "paid" && !currentClaim?.paymentDate) {
      updates.paymentDate = getCurrentTimestamp();
    }

    const [claim] = await db.update(hsaClaims)
      .set(updates)
      .where(eq(hsaClaims.id, params.claimId))
      .returning();

    return claim;
  }

  // Mark claim as paid
  async markClaimAsPaid(claimId: number, paidAmount: number) {
    return await this.updateClaimStatus({
      claimId,
      status: "paid",
      paidAmount,
    });
  }

  // Get claim history for an expense
  async getClaimsByExpense(medicalExpenseId: number) {
    return await db.query.hsaClaims.findMany({
      where: and(
        eq(hsaClaims.medicalExpenseId, medicalExpenseId),
        isNull(hsaClaims.deletedAt)
      ),
      orderBy: [desc(hsaClaims.createdAt)],
    });
  }

  // Soft delete claim
  async deleteClaim(claimId: number) {
    const [deleted] = await db.update(hsaClaims)
      .set({
        deletedAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      })
      .where(eq(hsaClaims.id, claimId))
      .returning();

    return deleted;
  }
}
```

#### 2.4 HSA Analytics Service

**File**: `src/lib/server/domains/medical-expenses/analytics-service.ts`

```typescript
import { db } from "$lib/server/db";
import { medicalExpenses } from "$lib/schema/medical-expenses";
import { hsaClaims } from "$lib/schema/hsa-claims";
import { expenseReceipts } from "$lib/schema/expense-receipts";
import { accounts } from "$lib/schema/accounts";
import { transactions } from "$lib/schema/transactions";
import { eq, and, sum, count, gte, lte, desc, isNull, sql } from "drizzle-orm";

interface HsaAnalytics {
  // Current tax year stats
  currentTaxYear: number;
  accountBalance: number;
  totalExpenses: number;
  totalQualifiedExpenses: number;
  totalNonQualifiedExpenses: number;

  // Claim stats
  totalClaimed: number;
  totalApproved: number;
  totalPaid: number;
  pendingClaims: number;

  // Contribution tracking (based on actual transactions)
  totalContributions: number; // Sum of deposit transactions for the year
  employerContributions: number; // Employer contribution transactions
  personalContributions: number; // Personal contribution transactions

  // Compliance
  contributionLimit: number;
  remainingContribution: number;
  utilizationPercentage: number; // Expenses as % of contributions

  // Expense breakdown by type
  expensesByType: Record<string, number>;

  // Reimbursement tracking
  totalReimbursable: number; // Unclaimed qualified expenses
  reimbursementRate: number; // % of qualified expenses that have been reimbursed

  // Historical
  historicalByYear: Array<{
    year: number;
    expenses: number;
    qualified: number;
    nonQualified: number;
    contributions: number;
    claims: number;
    reimbursements: number;
  }>;
}

export class HsaAnalyticsService {
  async getHsaAnalytics(hsaAccountId: number, taxYear?: number): Promise<HsaAnalytics> {
    const currentYear = taxYear || new Date().getFullYear();

    // Get account details for contribution limits
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.id, hsaAccountId),
    });

    if (!account) {
      throw new Error('HSA account not found');
    }

    // Get expenses for current tax year
    const expenses = await db.query.medicalExpenses.findMany({
      where: and(
        eq(medicalExpenses.hsaAccountId, hsaAccountId),
        eq(medicalExpenses.taxYear, currentYear),
        isNull(medicalExpenses.deletedAt)
      ),
      with: {
        claims: {
          where: isNull(hsaClaims.deletedAt),
        },
      },
    });

    // Calculate totals
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalQualifiedExpenses = expenses
      .filter(e => e.isQualified)
      .reduce((sum, e) => sum + e.outOfPocket, 0);
    const totalNonQualifiedExpenses = expenses
      .filter(e => !e.isQualified)
      .reduce((sum, e) => sum + e.outOfPocket, 0);

    // Calculate claim stats
    const allClaims = expenses.flatMap(e => e.claims);
    const totalClaimed = allClaims.reduce((sum, c) => sum + c.claimedAmount, 0);
    const totalApproved = allClaims.reduce((sum, c) => sum + c.approvedAmount, 0);
    const totalPaid = allClaims.reduce((sum, c) => sum + c.paidAmount, 0);
    const pendingClaims = allClaims.filter(c =>
      c.status === 'submitted' || c.status === 'in_review' || c.status === 'pending_submission'
    ).length;

    // Expense breakdown by type
    const expensesByType: Record<string, number> = {};
    expenses.forEach(expense => {
      expensesByType[expense.expenseType] =
        (expensesByType[expense.expenseType] || 0) + expense.amount;
    });

    // Get contributions for the year (transactions with positive amounts)
    // This is more accurate than trying to infer from balance
    const yearStart = `${currentYear}-01-01T00:00:00`;
    const yearEnd = `${currentYear}-12-31T23:59:59`;

    const contributionTransactions = await db.query.transactions.findMany({
      where: and(
        eq(transactions.accountId, hsaAccountId),
        gte(transactions.date, yearStart),
        lte(transactions.date, yearEnd),
        isNull(transactions.deletedAt)
      ),
    });

    // Sum up deposits (positive amounts) as contributions
    const totalContributions = contributionTransactions
      .filter(t => t.amount > 0 && !t.isTransfer) // Deposits, excluding transfers
      .reduce((sum, t) => sum + t.amount, 0);

    // Could categorize by payee or category to distinguish employer vs personal
    // For now, treat all contributions as personal unless categorized differently
    const employerContributions = 0; // TODO: Implement categorization
    const personalContributions = totalContributions - employerContributions;

    // Calculate contribution compliance
    const contributionLimit = account.hsaContributionLimit || 0;
    const remainingContribution = Math.max(0, contributionLimit - totalContributions);
    const utilizationPercentage = totalContributions > 0
      ? (totalQualifiedExpenses / totalContributions) * 100
      : 0;

    // Calculate reimbursable amount (unclaimed qualified expenses)
    const unclaimedExpenses = expenses.filter(e =>
      e.isQualified && (
        e.claims.length === 0 ||
        e.claims.every(c => c.status === 'not_submitted' || c.status === 'denied')
      )
    );
    const totalReimbursable = unclaimedExpenses.reduce((sum, e) => sum + e.outOfPocket, 0);

    const reimbursementRate = totalQualifiedExpenses > 0
      ? (totalPaid / totalQualifiedExpenses) * 100
      : 0;

    // Get historical data (all years)
    const allExpenses = await db.query.medicalExpenses.findMany({
      where: and(
        eq(medicalExpenses.hsaAccountId, hsaAccountId),
        isNull(medicalExpenses.deletedAt)
      ),
      with: {
        claims: {
          where: isNull(hsaClaims.deletedAt),
        },
      },
    });

    // Group by year
    const yearMap = new Map<number, {
      expenses: number;
      qualified: number;
      nonQualified: number;
      claims: number;
      reimbursements: number;
    }>();

    allExpenses.forEach(expense => {
      const year = expense.taxYear;
      if (!yearMap.has(year)) {
        yearMap.set(year, {
          expenses: 0,
          qualified: 0,
          nonQualified: 0,
          claims: 0,
          reimbursements: 0,
        });
      }
      const yearData = yearMap.get(year)!;
      yearData.expenses += expense.amount;
      if (expense.isQualified) {
        yearData.qualified += expense.outOfPocket;
      } else {
        yearData.nonQualified += expense.outOfPocket;
      }
      yearData.claims += expense.claims.reduce((sum, c) => sum + c.claimedAmount, 0);
      yearData.reimbursements += expense.claims.reduce((sum, c) => sum + c.paidAmount, 0);
    });

    // Get contribution history by year
    // TODO: Query all transactions grouped by year
    const contributionsByYear = new Map<number, number>();

    const historicalByYear = Array.from(yearMap.entries())
      .map(([year, data]) => ({
        year,
        ...data,
        contributions: contributionsByYear.get(year) || 0,
      }))
      .sort((a, b) => b.year - a.year);

    // Calculate current balance from transactions (since balance field may not exist yet)
    // TODO: Once balance field is implemented in accounts table, use account.balance directly
    const allTransactions = await db.query.transactions.findMany({
      where: and(
        eq(transactions.accountId, hsaAccountId),
        isNull(transactions.deletedAt)
      ),
    });
    const accountBalance = allTransactions.reduce((sum, t) => sum + t.amount, 0);

    return {
      currentTaxYear: currentYear,
      accountBalance: accountBalance,
      totalExpenses,
      totalQualifiedExpenses,
      totalNonQualifiedExpenses,
      totalClaimed,
      totalApproved,
      totalPaid,
      pendingClaims,
      totalContributions,
      employerContributions,
      personalContributions,
      contributionLimit,
      remainingContribution,
      utilizationPercentage,
      expensesByType,
      totalReimbursable,
      reimbursementRate,
      historicalByYear,
    };
  }

  async getTaxYearSummary(hsaAccountId: number, taxYear: number) {
    // Generate detailed tax year summary for reporting
    const analytics = await this.getHsaAnalytics(hsaAccountId, taxYear);

    const expenses = await db.query.medicalExpenses.findMany({
      where: and(
        eq(medicalExpenses.hsaAccountId, hsaAccountId),
        eq(medicalExpenses.taxYear, taxYear),
        isNull(medicalExpenses.deletedAt)
      ),
      with: {
        transaction: true,
        receipts: {
          where: isNull(expenseReceipts.deletedAt),
        },
        claims: {
          where: isNull(hsaClaims.deletedAt),
        },
      },
      orderBy: [desc(medicalExpenses.serviceDate)],
    });

    return {
      taxYear,
      analytics,
      expenses,
      generated: getCurrentTimestamp(),
    };
  }
}
```

### Phase 3: tRPC Route Implementation & File Upload

#### 3.1 Receipt Upload API Endpoint

Since tRPC doesn't handle file uploads well, create a dedicated SvelteKit endpoint:

**File**: `src/routes/api/receipts/upload/+server.ts`

```typescript
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ReceiptUploadService } from '$lib/server/domains/medical-expenses/receipt-service';
import type { ReceiptType } from '$lib/schema/expense-receipts';

const receiptService = new ReceiptUploadService();

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();

    const medicalExpenseId = formData.get('medicalExpenseId');
    const receiptType = formData.get('receiptType') as ReceiptType;
    const description = formData.get('description') as string | null;
    const file = formData.get('file') as File | null;

    if (!medicalExpenseId || !file) {
      throw error(400, 'Missing required fields');
    }

    const fileBuffer = await file.arrayBuffer();

    const receipt = await receiptService.uploadReceipt({
      medicalExpenseId: parseInt(medicalExpenseId as string),
      receiptType: receiptType || 'receipt',
      fileName: file.name,
      fileBuffer,
      mimeType: file.type,
      description: description || undefined,
    });

    return json({ success: true, receipt });
  } catch (err: any) {
    console.error('Receipt upload error:', err);
    throw error(500, err.message || 'Failed to upload receipt');
  }
};
```

**File**: `src/routes/api/receipts/[id]/+server.ts`

```typescript
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ReceiptUploadService } from '$lib/server/domains/medical-expenses/receipt-service';

const receiptService = new ReceiptUploadService();

// GET: Download receipt file
export const GET: RequestHandler = async ({ params }) => {
  try {
    const receiptId = parseInt(params.id);
    const fileData = await receiptService.getReceiptFile(receiptId);

    if (!fileData) {
      throw error(404, 'Receipt not found');
    }

    return new Response(fileData.buffer, {
      headers: {
        'Content-Type': fileData.mimeType,
        'Content-Disposition': `attachment; filename="${fileData.fileName}"`,
      },
    });
  } catch (err: any) {
    console.error('Receipt download error:', err);
    throw error(500, err.message || 'Failed to download receipt');
  }
};

// DELETE: Delete receipt
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const receiptId = parseInt(params.id);
    await receiptService.deleteReceipt(receiptId);

    return json({ success: true });
  } catch (err: any) {
    console.error('Receipt deletion error:', err);
    throw error(500, err.message || 'Failed to delete receipt');
  }
};
```

#### 3.2 Medical Expenses tRPC Routes

**File**: `src/lib/trpc/routes/medical-expenses.ts`

```typescript
import { z } from "zod";
import { publicProcedure, rateLimitedProcedure, t } from "$lib/trpc";
import { TRPCError } from "@trpc/server";
import { MedicalExpenseService } from "$lib/server/domains/medical-expenses/service";
import { ReceiptUploadService } from "$lib/server/domains/medical-expenses/receipt-service";
import { HsaClaimService } from "$lib/server/domains/medical-expenses/claim-service";
import { HsaAnalyticsService } from "$lib/server/domains/medical-expenses/analytics-service";
import { medicalExpenseTypeEnum } from "$lib/schema/medical-expenses";
import { receiptTypeEnum } from "$lib/schema/expense-receipts";
import { claimStatusEnum } from "$lib/schema/hsa-claims";

const medicalExpenseService = new MedicalExpenseService();
const receiptService = new ReceiptUploadService();
const claimService = new HsaClaimService();
const analyticsService = new HsaAnalyticsService();

export const medicalExpensesRoutes = t.router({
  // IMPORTANT: All routes need user authentication and authorization checks
  // Verify that the user owns the HSA account before allowing access
  // TODO: Add middleware or checks to verify ctx.user.id owns the hsaAccountId

  // Create medical expense
  create: rateLimitedProcedure
    .input(z.object({
      transactionId: z.number().positive(),
      hsaAccountId: z.number().positive(),
      expenseType: z.enum(medicalExpenseTypeEnum),
      isQualified: z.boolean().default(true),
      provider: z.string().max(200).optional(),
      patientName: z.string().max(100).optional(),
      diagnosis: z.string().max(500).optional(),
      treatmentDescription: z.string().max(1000).optional(),
      amount: z.number().positive().max(1000000),
      insuranceCovered: z.number().min(0).max(1000000).optional(),
      serviceDate: z.string().datetime(),
      paidDate: z.string().datetime().optional(),
      taxYear: z.number().min(2000).max(2100),
      notes: z.string().max(1000).optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        return await medicalExpenseService.createMedicalExpense(input);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to create medical expense",
        });
      }
    }),

  // Update medical expense
  update: rateLimitedProcedure
    .input(z.object({
      id: z.number().positive(),
      expenseType: z.enum(medicalExpenseTypeEnum).optional(),
      isQualified: z.boolean().optional(),
      provider: z.string().max(200).optional(),
      patientName: z.string().max(100).optional(),
      diagnosis: z.string().max(500).optional(),
      treatmentDescription: z.string().max(1000).optional(),
      amount: z.number().positive().max(1000000).optional(),
      insuranceCovered: z.number().min(0).max(1000000).optional(),
      serviceDate: z.string().datetime().optional(),
      paidDate: z.string().datetime().optional(),
      taxYear: z.number().min(2000).max(2100).optional(),
      notes: z.string().max(1000).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      return await medicalExpenseService.updateMedicalExpense(id, updates);
    }),

  // Delete medical expense
  delete: rateLimitedProcedure
    .input(z.object({
      id: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      return await medicalExpenseService.deleteMedicalExpense(input.id);
    }),

  // Get expenses by HSA account
  getByAccount: publicProcedure
    .input(z.object({
      hsaAccountId: z.number().positive(),
      includeDeleted: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      return await medicalExpenseService.getExpensesByHsaAccount(
        input.hsaAccountId,
        input.includeDeleted
      );
    }),

  // Get expenses by tax year
  getByTaxYear: publicProcedure
    .input(z.object({
      hsaAccountId: z.number().positive(),
      taxYear: z.number().min(2000).max(2100),
    }))
    .query(async ({ input }) => {
      return await medicalExpenseService.getExpensesByTaxYear(
        input.hsaAccountId,
        input.taxYear
      );
    }),

  // Get unclaimed expenses
  getUnclaimed: publicProcedure
    .input(z.object({
      hsaAccountId: z.number().positive(),
    }))
    .query(async ({ input }) => {
      return await medicalExpenseService.getUnclaimedExpenses(input.hsaAccountId);
    }),

  // Get expense summary
  getSummary: publicProcedure
    .input(z.object({
      hsaAccountId: z.number().positive(),
      taxYear: z.number().min(2000).max(2100).optional(),
    }))
    .query(async ({ input }) => {
      return await medicalExpenseService.getExpenseSummary(
        input.hsaAccountId,
        input.taxYear
      );
    }),

  // Receipt operations (metadata only - file upload via API endpoint)
  getReceipts: publicProcedure
    .input(z.object({
      medicalExpenseId: z.number().positive(),
    }))
    .query(async ({ input }) => {
      return await receiptService.getReceiptsByExpense(input.medicalExpenseId);
    }),

  deleteReceipt: rateLimitedProcedure
    .input(z.object({
      receiptId: z.number().positive(),
      hardDelete: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      return await receiptService.deleteReceipt(input.receiptId, input.hardDelete);
    }),

  // Claim operations
  createClaim: rateLimitedProcedure
    .input(z.object({
      medicalExpenseId: z.number().positive(),
      claimedAmount: z.number().positive().max(1000000),
      administratorName: z.string().max(100).optional(),
      notes: z.string().max(1000).optional(),
    }))
    .mutation(async ({ input }) => {
      return await claimService.createClaim(input);
    }),

  submitClaim: rateLimitedProcedure
    .input(z.object({
      claimId: z.number().positive(),
      claimNumber: z.string().max(100).optional(),
    }))
    .mutation(async ({ input }) => {
      return await claimService.submitClaim(input.claimId, input.claimNumber);
    }),

  updateClaimStatus: rateLimitedProcedure
    .input(z.object({
      claimId: z.number().positive(),
      status: z.enum(claimStatusEnum),
      claimNumber: z.string().max(100).optional(),
      approvedAmount: z.number().min(0).max(1000000).optional(),
      deniedAmount: z.number().min(0).max(1000000).optional(),
      paidAmount: z.number().min(0).max(1000000).optional(),
      denialReason: z.string().max(1000).optional(),
      denialCode: z.string().max(50).optional(),
      notes: z.string().max(1000).optional(),
    }))
    .mutation(async ({ input }) => {
      return await claimService.updateClaimStatus(input);
    }),

  deleteClaim: rateLimitedProcedure
    .input(z.object({
      claimId: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      return await claimService.deleteClaim(input.claimId);
    }),

  getClaimsByExpense: publicProcedure
    .input(z.object({
      medicalExpenseId: z.number().positive(),
    }))
    .query(async ({ input }) => {
      return await claimService.getClaimsByExpense(input.medicalExpenseId);
    }),

  // Analytics
  getAnalytics: publicProcedure
    .input(z.object({
      hsaAccountId: z.number().positive(),
      taxYear: z.number().min(2000).max(2100).optional(),
    }))
    .query(async ({ input }) => {
      return await analyticsService.getHsaAnalytics(
        input.hsaAccountId,
        input.taxYear
      );
    }),

  getTaxYearSummary: publicProcedure
    .input(z.object({
      hsaAccountId: z.number().positive(),
      taxYear: z.number().min(2000).max(2100),
    }))
    .query(async ({ input }) => {
      return await analyticsService.getTaxYearSummary(
        input.hsaAccountId,
        input.taxYear
      );
    }),
});
```

**Integration Steps:**

**1. Export from routes barrel file** - Add to `src/lib/trpc/routes/index.ts`:

```typescript
export { medicalExpensesRoutes } from "./medical-expenses";
```

**2. Add to main router** - Update `src/lib/trpc/router.ts`:

```typescript
import { medicalExpensesRoutes } from "$lib/trpc/routes/medical-expenses";

export const router = t.router({
  // ... existing routes ...
  medicalExpensesRoutes,
});
```

**3. Export schema files** - Add to `src/lib/schema/index.ts`:

```typescript
export * from "./medical-expenses";
export * from "./expense-receipts";
export * from "./hsa-claims";
```

### Phase 4: Query Layer Integration

Following the codebase's three-layer architecture (services → query → UI), create query definitions using the project's custom `defineQuery` and `defineMutation` wrappers.

**File**: `src/lib/query/medical-expenses.ts`

```typescript
import { defineQuery, defineMutation, createQueryKeys } from "./_factory";
import { cachePatterns } from "./_client";
import { trpc } from "$lib/trpc/client";
import type { MedicalExpense } from "$lib/schema/medical-expenses";
import type { HsaClaim } from "$lib/schema/hsa-claims";
import type { ExpenseReceipt } from "$lib/schema/expense-receipts";

/**
 * Query Keys for medical expense operations
 */
export const medicalExpenseKeys = createQueryKeys("medicalExpenses", {
  lists: () => ["medicalExpenses", "list"] as const,
  byAccount: (hsaAccountId: number, includeDeleted?: boolean) =>
    ["medicalExpenses", "account", hsaAccountId, { includeDeleted }] as const,
  byTaxYear: (hsaAccountId: number, taxYear: number) =>
    ["medicalExpenses", "taxYear", hsaAccountId, taxYear] as const,
  unclaimed: (hsaAccountId: number) =>
    ["medicalExpenses", "unclaimed", hsaAccountId] as const,
  summary: (hsaAccountId: number, taxYear?: number) =>
    ["medicalExpenses", "summary", hsaAccountId, { taxYear }] as const,
  analytics: (hsaAccountId: number, taxYear?: number) =>
    ["medicalExpenses", "analytics", hsaAccountId, { taxYear }] as const,
  taxYearSummary: (hsaAccountId: number, taxYear: number) =>
    ["medicalExpenses", "taxYearSummary", hsaAccountId, taxYear] as const,
  receipts: (medicalExpenseId: number) =>
    ["medicalExpenses", "receipts", medicalExpenseId] as const,
  claims: (medicalExpenseId: number) =>
    ["medicalExpenses", "claims", medicalExpenseId] as const,
});

/**
 * Get medical expenses by HSA account
 */
export const getMedicalExpensesByAccount = defineQuery<
  { hsaAccountId: number; includeDeleted?: boolean },
  MedicalExpense[]
>({
  queryKey: (params) => medicalExpenseKeys.byAccount(params.hsaAccountId, params.includeDeleted),
  queryFn: (params) =>
    trpc().medicalExpensesRoutes.getByAccount.query({
      hsaAccountId: params.hsaAccountId,
      includeDeleted: params.includeDeleted,
    }),
  options: {
    staleTime: 5 * 60 * 1000, // 5 minutes
  },
});

/**
 * Get medical expenses by tax year
 */
export const getMedicalExpensesByTaxYear = defineQuery<
  { hsaAccountId: number; taxYear: number },
  MedicalExpense[]
>({
  queryKey: (params) => medicalExpenseKeys.byTaxYear(params.hsaAccountId, params.taxYear),
  queryFn: (params) =>
    trpc().medicalExpensesRoutes.getByTaxYear.query({
      hsaAccountId: params.hsaAccountId,
      taxYear: params.taxYear,
    }),
  options: {
    staleTime: 5 * 60 * 1000, // 5 minutes
  },
});

/**
 * Get unclaimed medical expenses
 */
export const getUnclaimedExpenses = defineQuery<{ hsaAccountId: number }, MedicalExpense[]>({
  queryKey: (params) => medicalExpenseKeys.unclaimed(params.hsaAccountId),
  queryFn: (params) =>
    trpc().medicalExpensesRoutes.getUnclaimed.query({ hsaAccountId: params.hsaAccountId }),
  options: {
    staleTime: 60 * 1000, // 1 minute
  },
});

/**
 * Get medical expense summary
 */
export const getMedicalExpenseSummary = defineQuery<
  { hsaAccountId: number; taxYear?: number },
  any
>({
  queryKey: (params) => medicalExpenseKeys.summary(params.hsaAccountId, params.taxYear),
  queryFn: (params) =>
    trpc().medicalExpensesRoutes.getSummary.query({
      hsaAccountId: params.hsaAccountId,
      taxYear: params.taxYear,
    }),
  options: {
    staleTime: 60 * 1000, // 1 minute
  },
});

/**
 * Get HSA analytics
 */
export const getHsaAnalytics = defineQuery<{ hsaAccountId: number; taxYear?: number }, any>({
  queryKey: (params) => medicalExpenseKeys.analytics(params.hsaAccountId, params.taxYear),
  queryFn: (params) =>
    trpc().medicalExpensesRoutes.getAnalytics.query({
      hsaAccountId: params.hsaAccountId,
      taxYear: params.taxYear,
    }),
  options: {
    staleTime: 60 * 1000, // 1 minute
  },
});

/**
 * Get tax year summary
 */
export const getTaxYearSummary = defineQuery<
  { hsaAccountId: number; taxYear: number },
  any
>({
  queryKey: (params) => medicalExpenseKeys.taxYearSummary(params.hsaAccountId, params.taxYear),
  queryFn: (params) =>
    trpc().medicalExpensesRoutes.getTaxYearSummary.query({
      hsaAccountId: params.hsaAccountId,
      taxYear: params.taxYear,
    }),
  options: {
    staleTime: 10 * 60 * 1000, // 10 minutes
  },
});

/**
 * Get receipts for a medical expense
 */
export const getMedicalExpenseReceipts = defineQuery<
  { medicalExpenseId: number },
  ExpenseReceipt[]
>({
  queryKey: (params) => medicalExpenseKeys.receipts(params.medicalExpenseId),
  queryFn: (params) =>
    trpc().medicalExpensesRoutes.getReceipts.query({ medicalExpenseId: params.medicalExpenseId }),
  options: {
    staleTime: 5 * 60 * 1000, // 5 minutes
  },
});

/**
 * Get claims for a medical expense
 */
export const getMedicalExpenseClaims = defineQuery<{ medicalExpenseId: number }, HsaClaim[]>({
  queryKey: (params) => medicalExpenseKeys.claims(params.medicalExpenseId),
  queryFn: (params) =>
    trpc().medicalExpensesRoutes.getClaimsByExpense.query({
      medicalExpenseId: params.medicalExpenseId,
    }),
  options: {
    staleTime: 60 * 1000, // 1 minute
  },
});

/**
 * Create a new medical expense
 */
export const createMedicalExpense = defineMutation<any, MedicalExpense>({
  mutationFn: (data) => trpc().medicalExpensesRoutes.create.mutate(data),
  onSuccess: (_newExpense, variables) => {
    // Invalidate all medical expense queries for this account
    cachePatterns.invalidatePrefix(["medicalExpenses", "account", variables.hsaAccountId]);
    cachePatterns.invalidatePrefix(["medicalExpenses", "summary", variables.hsaAccountId]);
    cachePatterns.invalidatePrefix(["medicalExpenses", "analytics", variables.hsaAccountId]);
  },
  successMessage: "Medical expense created successfully",
  errorMessage: (error) => `Failed to create medical expense: ${error.message}`,
});

/**
 * Update a medical expense
 */
export const updateMedicalExpense = defineMutation<{ id: number; data: any }, MedicalExpense>({
  mutationFn: ({ id, data }) => trpc().medicalExpensesRoutes.update.mutate({ id, ...data }),
  onSuccess: (updatedExpense) => {
    // Invalidate related queries
    cachePatterns.invalidatePrefix(["medicalExpenses", "account"]);
    cachePatterns.invalidatePrefix(["medicalExpenses", "summary"]);
    cachePatterns.invalidatePrefix(["medicalExpenses", "analytics"]);
  },
  successMessage: "Medical expense updated successfully",
  errorMessage: (error) => `Failed to update medical expense: ${error.message}`,
});

/**
 * Delete a medical expense
 */
export const deleteMedicalExpense = defineMutation<number, void>({
  mutationFn: (id) => trpc().medicalExpensesRoutes.delete.mutate({ id }),
  onSuccess: () => {
    // Invalidate all medical expense queries
    cachePatterns.invalidatePrefix(["medicalExpenses"]);
  },
  successMessage: "Medical expense deleted successfully",
  errorMessage: (error) => `Failed to delete medical expense: ${error.message}`,
});

/**
 * Create a new HSA claim
 */
export const createHsaClaim = defineMutation<any, HsaClaim>({
  mutationFn: (data) => trpc().medicalExpensesRoutes.createClaim.mutate(data),
  onSuccess: (_newClaim, variables) => {
    // Invalidate claims for this expense
    cachePatterns.invalidatePrefix(["medicalExpenses", "claims", variables.medicalExpenseId]);
    // Invalidate summary queries
    cachePatterns.invalidatePrefix(["medicalExpenses", "summary"]);
    cachePatterns.invalidatePrefix(["medicalExpenses", "analytics"]);
  },
  successMessage: "Claim created successfully",
  errorMessage: (error) => `Failed to create claim: ${error.message}`,
});

/**
 * Submit an HSA claim
 */
export const submitHsaClaim = defineMutation<{ claimId: number; claimNumber?: string }, HsaClaim>({
  mutationFn: ({ claimId, claimNumber }) =>
    trpc().medicalExpensesRoutes.submitClaim.mutate({ claimId, claimNumber }),
  onSuccess: () => {
    // Invalidate claims and summary queries
    cachePatterns.invalidatePrefix(["medicalExpenses", "claims"]);
    cachePatterns.invalidatePrefix(["medicalExpenses", "summary"]);
  },
  successMessage: "Claim submitted successfully",
  errorMessage: (error) => `Failed to submit claim: ${error.message}`,
});

/**
 * Update HSA claim status
 */
export const updateHsaClaimStatus = defineMutation<any, HsaClaim>({
  mutationFn: (data) => trpc().medicalExpensesRoutes.updateClaimStatus.mutate(data),
  onSuccess: () => {
    // Invalidate claims and summary queries
    cachePatterns.invalidatePrefix(["medicalExpenses", "claims"]);
    cachePatterns.invalidatePrefix(["medicalExpenses", "summary"]);
    cachePatterns.invalidatePrefix(["medicalExpenses", "analytics"]);
  },
  successMessage: "Claim status updated successfully",
  errorMessage: (error) => `Failed to update claim status: ${error.message}`,
});

/**
 * Delete an HSA claim
 */
export const deleteHsaClaim = defineMutation<number, void>({
  mutationFn: (claimId) => trpc().medicalExpensesRoutes.deleteClaim.mutate({ claimId }),
  onSuccess: () => {
    // Invalidate claims and summary queries
    cachePatterns.invalidatePrefix(["medicalExpenses", "claims"]);
    cachePatterns.invalidatePrefix(["medicalExpenses", "summary"]);
  },
  successMessage: "Claim deleted successfully",
  errorMessage: (error) => `Failed to delete claim: ${error.message}`,
});

/**
 * Delete a receipt
 */
export const deleteReceipt = defineMutation<{ receiptId: number; hardDelete?: boolean }, void>({
  mutationFn: ({ receiptId, hardDelete }) =>
    trpc().medicalExpensesRoutes.deleteReceipt.mutate({ receiptId, hardDelete }),
  onSuccess: () => {
    // Invalidate receipt queries
    cachePatterns.invalidatePrefix(["medicalExpenses", "receipts"]);
  },
  successMessage: "Receipt deleted successfully",
  errorMessage: (error) => `Failed to delete receipt: ${error.message}`,
});
```

**Usage Examples:**

```typescript
// In a Svelte component - Reactive interface
const expensesQuery = getMedicalExpensesByAccount.options({ hsaAccountId: 1 });
// Access data: $expensesQuery.data

// Imperative interface (for programmatic calls)
const expenses = await getMedicalExpensesByAccount.execute({ hsaAccountId: 1 });

// Mutations - Reactive interface
const createExpense = createMedicalExpense.options();
await $createExpense.mutateAsync({ hsaAccountId: 1, amount: 100, ... });

// Mutations - Imperative interface
await createMedicalExpense.execute({ hsaAccountId: 1, amount: 100, ... });
```

### Phase 5: UI Components

#### 5.1 HSA Account Dashboard

**File**: `src/routes/accounts/[slug]/(hsa)/hsa-dashboard.svelte`

Features:

- Current balance display with HSA-specific formatting
- Contribution tracking (current year vs limit) with progress bar
- Quick stats cards: eligible expenses, pending claims, total reimbursements
- Recent transactions filtered for HSA account
- Tax year selector dropdown
- Compliance alerts:
  - Approaching contribution limit warning
  - Non-qualified expense notifications
  - Unclaimed expense reminders
- Charts showing expense trends

#### 5.2 Medical Expense Form

**File**: `src/routes/accounts/[slug]/(hsa)/medical-expense-form.svelte`

Features:

- Expense type dropdown with IRS Publication 502 guidance
- Qualified expense toggle with help tooltip explaining IRS rules
- Provider autocomplete (from previous entries)
- Patient name field (for family HSAs)
- Amount breakdown:
  - Total charge
  - Insurance covered amount
  - Out-of-pocket (calculated)
- Service date picker
- Payment date picker (defaults to transaction date)
- Tax year auto-calculated from payment date
- Receipt upload widget:
  - Drag-drop zone
  - File picker button
  - Preview uploaded files
  - Multi-file support
- Notes/description textarea
- Link to existing transaction or create new transaction

#### 5.3 Receipt Viewer

**File**: `src/routes/accounts/[slug]/(hsa)/receipt-viewer.svelte`

Features:

- Thumbnail gallery view of all receipts
- Lightbox modal for full-size viewing
- PDF viewer integration
- Download individual receipts
- Delete receipt with confirmation
- Add additional receipts to existing expense
- Receipt metadata display:
  - Upload date
  - File size
  - File type
  - Description
- OCR status (future: show extracted text)

#### 5.4 Claim Status Tracker

**File**: `src/routes/accounts/[slug]/(hsa)/claim-tracker.svelte`

Features:

- Visual pipeline/stepper showing claim progression
- Status badges with color coding:
  - Gray: Not Submitted, Pending
  - Blue: Submitted, In Review
  - Green: Approved, Paid
  - Yellow: Partially Approved
  - Red: Denied
- Timeline view with date stamps for each status change
- Claim amount breakdown:
  - Claimed amount
  - Approved amount
  - Denied amount
  - Paid amount
- Status update form (with validation for allowed transitions)
- Denial reason display with re-submission workflow
- Payment tracking with transaction linkage
- Claim number display
- Administrator information

#### 5.5 Expense List/Table

**File**: `src/routes/accounts/[slug]/(hsa)/expense-list.svelte`

Features:

- Sortable columns:
  - Service Date
  - Provider
  - Type
  - Amount
  - Out-of-Pocket
  - Qualified (Yes/No badge)
  - Claim Status
  - Receipts (count with icon)
- Advanced filtering:
  - Tax year dropdown
  - Expense type multi-select
  - Qualified/Non-qualified toggle
  - Claim status multi-select
  - Date range picker
- Search functionality:
  - Provider name
  - Patient name
  - Description/notes
- Bulk actions:
  - Submit multiple claims
  - Mark as paid
  - Export selected
- Row actions:
  - View details
  - Edit expense
  - Add receipt
  - Create/view claim
  - Delete (with confirmation)
- Export to CSV for tax reporting
- Print-friendly view

#### 5.6 Tax Year Summary

**File**: `src/routes/accounts/[slug]/(hsa)/tax-year-summary.svelte`

Features:

- Tax year selector with current year default
- Summary cards:
  - Total contributions
  - Total qualified expenses
  - Total non-qualified expenses (with tax warning)
  - Total reimbursements
  - Unclaimed expenses
- Breakdown by expense category with bar chart
- Monthly expense trend line chart
- Unclaimed expenses alert with "Create Claims" action
- Export summary as:
  - PDF for tax filing
  - CSV for spreadsheet
- Print-friendly tax documentation view
- IRS Form 8889 helper (pre-filled values)

#### 5.7 Contribution Tracker

**File**: `src/routes/accounts/[slug]/(hsa)/contribution-tracker.svelte`

Features:

- Annual contribution limit display (with individual/family toggle)
- Current contributions breakdown:
  - Employee contributions
  - Employer contributions (if categorized)
  - Total
- Remaining contribution room calculator
- Progress bar visualization
- Contribution history table by month
- Catch-up contribution indicator (age 55+)
- Monthly contribution recommendations:
  - To max out limit
  - Based on expense patterns
- Tax benefit calculator:
  - Input marginal tax rate
  - Show tax savings from contributions
- Projected year-end balance

### Phase 6: Account Wizard Updates

**File**: `src/lib/components/wizard/account-wizard.svelte`

Update the wizard to support HSA accounts:

**1. Add HSA to account type detection:**

```typescript
function detectAccountTypeFromName(name: string): string | null {
  const lowerName = name.toLowerCase();

  const typeKeywords: Record<string, string> = {
    // ... existing keywords ...
    'hsa': 'hsa',
    'health savings': 'hsa',
    'health saving': 'hsa',
  };
  // ... rest of function
}
```

**2. Add HSA notes examples:**

```typescript
const exampleNotesByCategory = {
  // ... existing categories ...
  hsa: [
    'HSA with Fidelity. High-deductible health plan. Family contribution limit $8,300.',
    'Individual HSA. Contribution limit $4,150. Investing excess for long-term growth.',
    'Employer HSA with $1,500 annual employer contribution. Used for prescriptions and copays.',
    'HSA investment account. Monthly contribution $350. Administrator: HSA Bank.'
  ]
};
```

**3. Add conditional HSA details step:**

Since the current wizard doesn't support conditional steps, add the HSA fields to the "Enhanced" step and show/hide based on account type:

```svelte
<!-- In account-enhanced step -->
{#if formData['accountType'] === 'hsa'}
  <div class="space-y-4">
    <div class="space-y-2">
      <h3 class="text-lg font-semibold">HSA Details</h3>
      <p class="text-sm text-muted-foreground">
        Configure your Health Savings Account settings for contribution tracking and tax compliance.
      </p>
    </div>

    <!-- HSA Type -->
    <div class="space-y-2">
      <Label for="hsa-type">HSA Type</Label>
      <Select.Root
        value={formData['hsaType']}
        onValueChange={(value) => {
          updateField('hsaType', value);
          // Auto-set contribution limit based on type
          const limits = { individual: 4150, family: 8300 };
          updateField('hsaContributionLimit', limits[value]);
        }}
      >
        <Select.Trigger>
          <span>{formData['hsaType'] === 'family' ? 'Family' : 'Individual'}</span>
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="individual">Individual</Select.Item>
          <Select.Item value="family">Family</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>

    <!-- Contribution Limit -->
    <div class="space-y-2">
      <Label for="hsa-contribution-limit">Annual Contribution Limit</Label>
      <Input
        id="hsa-contribution-limit"
        type="number"
        step="0.01"
        value={formData['hsaContributionLimit'] || ''}
        oninput={(e) => updateField('hsaContributionLimit', parseFloat(e.currentTarget.value))}
        placeholder="4150"
      />
      <p class="text-xs text-muted-foreground">
        2024 limits: $4,150 (individual) / $8,300 (family). Add $1,000 if age 55+.
      </p>
    </div>

    <!-- HSA Administrator -->
    <div class="space-y-2">
      <Label for="hsa-administrator">HSA Administrator</Label>
      <Input
        id="hsa-administrator"
        value={formData['hsaAdministrator'] || ''}
        oninput={(e) => updateField('hsaAdministrator', e.currentTarget.value)}
        placeholder="e.g., Fidelity, HSA Bank, Lively"
      />
    </div>

    <!-- High Deductible Plan -->
    <div class="space-y-2">
      <Label for="hsa-hdhp">High Deductible Health Plan</Label>
      <Input
        id="hsa-hdhp"
        value={formData['hsaHighDeductiblePlan'] || ''}
        oninput={(e) => updateField('hsaHighDeductiblePlan', e.currentTarget.value)}
        placeholder="e.g., Blue Cross HDHP 2024"
      />
    </div>

    <!-- Tax Year -->
    <div class="space-y-2">
      <Label for="hsa-tax-year">Current Tax Year</Label>
      <Input
        id="hsa-tax-year"
        type="number"
        value={formData['hsaCurrentTaxYear'] || new Date().getFullYear()}
        oninput={(e) => updateField('hsaCurrentTaxYear', parseInt(e.currentTarget.value))}
      />
    </div>

    <!-- HSA Benefits Info Box -->
    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
      <div class="flex items-start gap-2">
        <Info class="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div class="space-y-1">
          <p class="text-xs font-medium text-blue-900 dark:text-blue-100">
            HSA Triple Tax Advantage
          </p>
          <ul class="text-xs text-blue-700 dark:text-blue-200 space-y-0.5 list-disc list-inside">
            <li>Tax-deductible contributions</li>
            <li>Tax-free growth</li>
            <li>Tax-free withdrawals for qualified medical expenses</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
{/if}
```

### Phase 7: Database Migration

**File**: `drizzle/migrations/XXXX_add_hsa_functionality.sql`

```sql
-- Add HSA-specific fields to accounts table
ALTER TABLE account ADD COLUMN hsa_contribution_limit REAL;
ALTER TABLE account ADD COLUMN hsa_type TEXT CHECK(hsa_type IN ('individual', 'family'));
ALTER TABLE account ADD COLUMN hsa_current_tax_year INTEGER;
ALTER TABLE account ADD COLUMN hsa_administrator TEXT;
ALTER TABLE account ADD COLUMN hsa_high_deductible_plan TEXT;

-- Note: SQLite doesn't support modifying CHECK constraints directly.
-- If your account_type column has a CHECK constraint, you have two options:
-- Option 1: If no CHECK constraint exists, no action needed (schema will enforce via Drizzle)
-- Option 2: If CHECK constraint exists, drop and recreate it:
--   1. Create new table with updated constraint
--   2. Copy data
--   3. Drop old table
--   4. Rename new table
-- For most cases, Drizzle schema validation is sufficient without database-level CHECK constraints.

-- Create medical_expense table
CREATE TABLE medical_expense (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cuid TEXT NOT NULL,
  transaction_id INTEGER NOT NULL REFERENCES transaction(id) ON DELETE RESTRICT,
  hsa_account_id INTEGER NOT NULL REFERENCES account(id) ON DELETE RESTRICT,
  expense_type TEXT NOT NULL,
  is_qualified INTEGER NOT NULL DEFAULT 1,
  provider TEXT,
  patient_name TEXT,
  diagnosis TEXT,
  treatment_description TEXT,
  amount REAL NOT NULL,
  insurance_covered REAL NOT NULL DEFAULT 0,
  out_of_pocket REAL NOT NULL,
  service_date TEXT NOT NULL,
  paid_date TEXT,
  tax_year INTEGER NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE UNIQUE INDEX medical_expense_transaction_unique_idx ON medical_expense(transaction_id);
CREATE INDEX medical_expense_hsa_account_idx ON medical_expense(hsa_account_id);
CREATE INDEX medical_expense_type_idx ON medical_expense(expense_type);
CREATE INDEX medical_expense_tax_year_idx ON medical_expense(tax_year);
CREATE INDEX medical_expense_service_date_idx ON medical_expense(service_date);
CREATE INDEX medical_expense_qualified_idx ON medical_expense(is_qualified);
CREATE INDEX medical_expense_deleted_at_idx ON medical_expense(deleted_at);

-- Create expense_receipt table
CREATE TABLE expense_receipt (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cuid TEXT NOT NULL,
  medical_expense_id INTEGER NOT NULL REFERENCES medical_expense(id) ON DELETE RESTRICT,
  receipt_type TEXT DEFAULT 'receipt',
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_url TEXT,
  extracted_text TEXT,
  extracted_data TEXT,
  description TEXT,
  uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE INDEX expense_receipt_medical_expense_idx ON expense_receipt(medical_expense_id);
CREATE INDEX expense_receipt_type_idx ON expense_receipt(receipt_type);
CREATE INDEX expense_receipt_deleted_at_idx ON expense_receipt(deleted_at);

-- Create hsa_claim table
CREATE TABLE hsa_claim (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cuid TEXT NOT NULL,
  medical_expense_id INTEGER NOT NULL REFERENCES medical_expense(id) ON DELETE RESTRICT,
  claim_number TEXT,
  status TEXT NOT NULL DEFAULT 'not_submitted',
  claimed_amount REAL NOT NULL,
  approved_amount REAL DEFAULT 0,
  denied_amount REAL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  submitted_date TEXT,
  review_date TEXT,
  approval_date TEXT,
  payment_date TEXT,
  denial_reason TEXT,
  denial_code TEXT,
  administrator_name TEXT,
  notes TEXT,
  internal_notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE INDEX hsa_claim_medical_expense_idx ON hsa_claim(medical_expense_id);
CREATE INDEX hsa_claim_status_idx ON hsa_claim(status);
CREATE INDEX hsa_claim_submitted_date_idx ON hsa_claim(submitted_date);
CREATE INDEX hsa_claim_payment_date_idx ON hsa_claim(payment_date);
CREATE INDEX hsa_claim_deleted_at_idx ON hsa_claim(deleted_at);
```

### Phase 8: Data Migration & Conversion Tools

#### 8.1 Existing Transaction Conversion

**File**: `src/lib/server/domains/medical-expenses/migration-service.ts`

```typescript
import { db } from "$lib/server/db";
import { transactions } from "$lib/schema/transactions";
import { medicalExpenses } from "$lib/schema/medical-expenses";
import { categories } from "$lib/schema/categories";
import { eq, and, isNull, like } from "drizzle-orm";

export class MedicalExpenseMigrationService {
  // Convert existing transactions to medical expenses
  async convertTransactionsToMedicalExpenses(
    hsaAccountId: number,
    transactionIds: number[],
    defaultExpenseType: string = 'other_qualified'
  ) {
    const converted: any[] = [];
    const errors: any[] = [];

    for (const transactionId of transactionIds) {
      try {
        const transaction = await db.query.transactions.findFirst({
          where: and(
            eq(transactions.id, transactionId),
            eq(transactions.accountId, hsaAccountId)
          ),
          with: {
            category: true,
          },
        });

        if (!transaction) {
          errors.push({ transactionId, error: 'Transaction not found' });
          continue;
        }

        // Try to determine expense type from category name
        const expenseType = this.inferExpenseType(transaction.category?.name);

        // Extract tax year from transaction date
        const transactionDate = new Date(transaction.date);
        const taxYear = transactionDate.getFullYear();

        // Create medical expense
        const [medicalExpense] = await db.insert(medicalExpenses).values({
          transactionId: transaction.id,
          hsaAccountId: hsaAccountId,
          expenseType: expenseType || defaultExpenseType,
          isQualified: true, // Assume qualified unless marked otherwise
          amount: Math.abs(transaction.amount),
          insuranceCovered: 0,
          outOfPocket: Math.abs(transaction.amount),
          serviceDate: transaction.date,
          paidDate: transaction.date,
          taxYear: taxYear,
          notes: transaction.notes || undefined,
        }).returning();

        converted.push(medicalExpense);
      } catch (error: any) {
        errors.push({ transactionId, error: error.message });
      }
    }

    return { converted, errors };
  }

  // Infer expense type from category name
  private inferExpenseType(categoryName?: string): string | null {
    if (!categoryName) return null;

    const name = categoryName.toLowerCase();

    const typeMap: Record<string, string> = {
      'doctor': 'doctor_visit',
      'physician': 'doctor_visit',
      'specialist': 'specialist_visit',
      'urgent care': 'urgent_care',
      'emergency': 'emergency_room',
      'hospital': 'hospital_stay',
      'surgery': 'surgery',
      'lab': 'lab_tests',
      'imaging': 'imaging',
      'x-ray': 'imaging',
      'mri': 'imaging',
      'ct scan': 'imaging',
      'prescription': 'prescription',
      'pharmacy': 'prescription',
      'medication': 'prescription',
      'dental': 'dental',
      'dentist': 'dental',
      'vision': 'vision',
      'optometry': 'vision',
      'glasses': 'vision',
      'contacts': 'vision',
      'therapy': 'physical_therapy',
      'chiropractor': 'chiropractor',
      'mental health': 'mental_health',
      'counseling': 'mental_health',
      'equipment': 'medical_equipment',
      'hearing aid': 'hearing_aids',
    };

    for (const [keyword, type] of Object.entries(typeMap)) {
      if (name.includes(keyword)) {
        return type;
      }
    }

    return null;
  }

  // Bulk import from CSV
  async importFromCsv(hsaAccountId: number, csvData: string) {
    const results: {
      success: any[];
      errors: Array<{ row: number; error: string; data: any }>;
    } = {
      success: [],
      errors: [],
    };

    // Parse CSV (expects header row)
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must contain header row and at least one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    // Validate required columns
    const requiredColumns = ['service_date', 'amount', 'expense_type'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        // Skip empty rows
        if (!row.service_date && !row.amount) continue;

        // Parse and validate data
        const amount = parseFloat(row.amount);
        if (isNaN(amount) || amount <= 0) {
          throw new Error(`Invalid amount: ${row.amount}`);
        }

        const insuranceCovered = row.insurance_covered
          ? parseFloat(row.insurance_covered)
          : 0;

        if (isNaN(insuranceCovered) || insuranceCovered < 0) {
          throw new Error(`Invalid insurance_covered: ${row.insurance_covered}`);
        }

        const expenseType = this.inferExpenseType(row.expense_type) || 'other_qualified';

        // Parse date (expects YYYY-MM-DD format)
        const serviceDate = new Date(row.service_date);
        if (isNaN(serviceDate.getTime())) {
          throw new Error(`Invalid service_date: ${row.service_date}`);
        }

        const taxYear = row.tax_year
          ? parseInt(row.tax_year)
          : serviceDate.getFullYear();

        // Check if transaction already exists (by looking for matching date/amount)
        // Or create a new transaction
        let transactionId: number;

        if (row.transaction_id) {
          transactionId = parseInt(row.transaction_id);
        } else {
          // Create new transaction for this expense
          const [transaction] = await db.insert(transactions).values({
            accountId: hsaAccountId,
            date: serviceDate.toISOString(),
            amount: -amount, // Negative for expense
            notes: row.notes || `${row.provider || 'Medical expense'} - Imported from CSV`,
            // Add other transaction fields as needed
          }).returning();
          transactionId = transaction.id;
        }

        // Create medical expense directly
        const [medicalExpense] = await db.insert(medicalExpenses).values({
          transactionId: transactionId,
          hsaAccountId: hsaAccountId,
          expenseType: expenseType,
          isQualified: row.is_qualified ? row.is_qualified.toLowerCase() === 'true' : true,
          provider: row.provider || undefined,
          patientName: row.patient_name || undefined,
          diagnosis: row.diagnosis || undefined,
          treatmentDescription: row.treatment_description || undefined,
          amount: amount,
          insuranceCovered: insuranceCovered,
          outOfPocket: amount - insuranceCovered,
          serviceDate: row.service_date,
          paidDate: row.paid_date || row.service_date,
          taxYear: taxYear,
          notes: row.notes || undefined,
        }).returning();

        results.success.push({
          row: i + 1,
          expense: medicalExpense,
        });

      } catch (error: any) {
        results.errors.push({
          row: i + 1,
          error: error.message,
          data: lines[i],
        });
      }
    }

    return results;
  }
}
```

### Phase 9: Security & Privacy Considerations

#### 9.1 Authentication & Authorization

**CRITICAL**: Before implementing any of the features in this plan, proper authentication and authorization must be in place.

**Current Status**: Authentication is NOT yet implemented in this codebase. The `App.Locals` interface is commented out in `app.d.ts` and the tRPC context only includes `db`.

**Implementation Requirements:**

##### Step 1: Set Up User Authentication System

First, you need to implement a user authentication system. The codebase has authentication configuration at [src/lib/server/config/auth.ts](../../../src/lib/server/config/auth.ts) but no actual implementation.

**Recommended Approach**: Use [Better Auth](https://better-auth.com) or similar SvelteKit-compatible auth library.

1. **Install Auth Library**:

   ```bash
   bun add better-auth
   ```

2. **Create Auth Schema**:

   ```typescript
   // src/lib/schema/users.ts
   import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
   import { getCurrentTimestamp } from "$lib/utils/dates";

   export const users = sqliteTable("user", {
     id: integer("id").primaryKey({ autoIncrement: true }),
     email: text("email").unique().notNull(),
     name: text("name"),
     passwordHash: text("password_hash").notNull(),
     createdAt: text("created_at")
       .notNull()
       .$defaultFn(() => getCurrentTimestamp()),
     updatedAt: text("updated_at")
       .notNull()
       .$defaultFn(() => getCurrentTimestamp()),
   });

   export const sessions = sqliteTable("session", {
     id: text("id").primaryKey(),
     userId: integer("user_id")
       .references(() => users.id, { onDelete: "cascade" })
       .notNull(),
     expiresAt: integer("expires_at").notNull(),
     createdAt: text("created_at")
       .notNull()
       .$defaultFn(() => getCurrentTimestamp()),
   });
   ```

3. **Update Accounts Schema** to include userId:

   ```typescript
   // In src/lib/schema/accounts.ts - add this field
   export const accounts = sqliteTable("account", {
     // ... existing fields ...
     userId: integer("user_id")
       .references(() => users.id, { onDelete: "cascade" })
       .notNull(),
     // ... existing fields ...
   });
   ```

4. **Configure App Locals**:

   ```typescript
   // src/app.d.ts
   import type { User } from "$lib/schema/users";

   declare global {
     namespace App {
       interface Locals {
         user: User | null;
         session: { id: string; expiresAt: number } | null;
       }
     }
   }
   ```

5. **Create Auth Hooks**:

   ```typescript
   // src/hooks.server.ts
   import type { Handle } from "@sveltejs/kit";
   import { db } from "$lib/server/db";
   import { sessions, users } from "$lib/schema/users";
   import { eq } from "drizzle-orm";

   export const handle: Handle = async ({ event, resolve }) => {
     const sessionId = event.cookies.get("session");

     if (sessionId) {
       const session = await db.query.sessions.findFirst({
         where: eq(sessions.id, sessionId),
         with: { user: true },
       });

       if (session && session.expiresAt > Date.now()) {
         event.locals.session = { id: session.id, expiresAt: session.expiresAt };
         event.locals.user = session.user;
       } else if (session) {
         // Session expired, clean up
         await db.delete(sessions).where(eq(sessions.id, sessionId));
         event.cookies.delete("session", { path: "/" });
       }
     }

     return resolve(event);
   };
   ```

##### Step 2: Update tRPC Context

Update the tRPC context to include user and session:

```typescript
// src/lib/trpc/context.ts
import { db } from "$lib/server/db";
import type { RequestEvent } from "@sveltejs/kit";

export async function createContext(event: RequestEvent) {
  return {
    db,
    user: event.locals.user,
    session: event.locals.session,
    event,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>> & {
  isTest?: boolean | undefined;
};
```

Update the tRPC handler to pass the event:

```typescript
// src/routes/api/trpc/[...trpc]/+server.ts
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { router } from "$lib/trpc/router";
import { createContext } from "$lib/trpc/context";
import type { RequestEvent } from "@sveltejs/kit";

export const GET = (event: RequestEvent) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: event.request,
    router,
    createContext: () => createContext(event),
  });
};

export const POST = GET;
```

##### Step 3: Create Authorization Helpers

Create reusable authorization helper functions:

```typescript
// src/lib/server/auth/authorization.ts
import { TRPCError } from "@trpc/server";
import type { Context } from "$lib/trpc/context";
import { db } from "$lib/server/db";
import { accounts } from "$lib/schema/accounts";
import { medicalExpenses } from "$lib/schema/medical-expenses";
import { eq, and } from "drizzle-orm";

/**
 * Ensures the user is authenticated
 * @throws UNAUTHORIZED if user is not authenticated
 */
export function requireAuth(ctx: Context): asserts ctx is Context & { user: NonNullable<Context["user"]> } {
  if (!ctx.user?.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action",
    });
  }
}

/**
 * Verifies user owns the specified HSA account
 * @throws FORBIDDEN if user does not own the account
 */
export async function verifyHsaAccountOwnership(
  ctx: Context,
  hsaAccountId: number
): Promise<void> {
  requireAuth(ctx);

  const account = await db.query.accounts.findFirst({
    where: and(
      eq(accounts.id, hsaAccountId),
      eq(accounts.userId, ctx.user.id)
    ),
  });

  if (!account) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this HSA account",
    });
  }

  // Optional: Verify it's actually an HSA account
  if (account.type !== "hsa") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Account is not an HSA account",
    });
  }
}

/**
 * Verifies user owns the medical expense
 * @throws FORBIDDEN if user does not own the expense
 */
export async function verifyMedicalExpenseOwnership(
  ctx: Context,
  expenseId: number
): Promise<void> {
  requireAuth(ctx);

  const expense = await db.query.medicalExpenses.findFirst({
    where: eq(medicalExpenses.id, expenseId),
    with: {
      hsaAccount: true,
    },
  });

  if (!expense) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Medical expense not found",
    });
  }

  if (expense.hsaAccount.userId !== ctx.user.id) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this medical expense",
    });
  }
}

/**
 * Verifies user owns the HSA claim
 * @throws FORBIDDEN if user does not own the claim
 */
export async function verifyClaimOwnership(
  ctx: Context,
  claimId: number
): Promise<void> {
  requireAuth(ctx);

  const claim = await db.query.hsaClaims.findFirst({
    where: eq(hsaClaims.id, claimId),
    with: {
      expense: {
        with: {
          hsaAccount: true,
        },
      },
    },
  });

  if (!claim) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "HSA claim not found",
    });
  }

  if (claim.expense.hsaAccount.userId !== ctx.user.id) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this HSA claim",
    });
  }
}
```

##### Step 4: Apply Authorization to All Routes

Update all tRPC routes to include authorization checks:

```typescript
// src/lib/trpc/routes/medical-expenses.ts
import { publicProcedure, router } from "$lib/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { medicalExpenseService } from "$lib/services/medical-expense-service";
import {
  requireAuth,
  verifyHsaAccountOwnership,
  verifyMedicalExpenseOwnership,
} from "$lib/server/auth/authorization";

export const medicalExpensesRoutes = router({
  getByAccount: publicProcedure
    .input(z.object({ hsaAccountId: z.number().positive() }))
    .query(async ({ input, ctx }) => {
      await verifyHsaAccountOwnership(ctx, input.hsaAccountId);
      return await medicalExpenseService.getExpensesByHsaAccount(input.hsaAccountId);
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number().positive() }))
    .query(async ({ input, ctx }) => {
      await verifyMedicalExpenseOwnership(ctx, input.id);
      return await medicalExpenseService.getExpenseById(input.id);
    }),

  create: publicProcedure
    .input(createMedicalExpenseSchema)
    .mutation(async ({ input, ctx }) => {
      await verifyHsaAccountOwnership(ctx, input.hsaAccountId);

      try {
        return await medicalExpenseService.createMedicalExpense(input);
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to create medical expense",
        });
      }
    }),

  update: publicProcedure
    .input(updateMedicalExpenseSchema)
    .mutation(async ({ input, ctx }) => {
      await verifyMedicalExpenseOwnership(ctx, input.id);

      try {
        return await medicalExpenseService.updateMedicalExpense(input);
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to update medical expense",
        });
      }
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().positive() }))
    .mutation(async ({ input, ctx }) => {
      await verifyMedicalExpenseOwnership(ctx, input.id);
      return await medicalExpenseService.deleteMedicalExpense(input.id);
    }),

  // Apply same pattern to all other routes...
});
```

##### Step 5: Secure API Endpoints

Apply authentication to SvelteKit API endpoints (e.g., receipt uploads):

```typescript
// src/routes/api/receipts/upload/+server.ts
import type { RequestEvent } from "@sveltejs/kit";
import { json, error } from "@sveltejs/kit";
import { receiptService } from "$lib/services/receipt-service";
import { verifyMedicalExpenseOwnership } from "$lib/server/auth/authorization";

export async function POST(event: RequestEvent) {
  // Check authentication
  if (!event.locals.user?.id) {
    throw error(401, "Unauthorized");
  }

  const formData = await event.request.formData();
  const file = formData.get("file") as File;
  const expenseIdStr = formData.get("expenseId") as string;

  if (!file || !expenseIdStr) {
    throw error(400, "Missing file or expenseId");
  }

  const expenseId = parseInt(expenseIdStr);

  // Verify ownership using tRPC context structure
  const ctx = {
    db: (await import("$lib/server/db")).db,
    user: event.locals.user,
    session: event.locals.session,
    event,
  };

  try {
    await verifyMedicalExpenseOwnership(ctx, expenseId);
  } catch (err: any) {
    if (err.code === "FORBIDDEN") {
      throw error(403, err.message);
    }
    if (err.code === "NOT_FOUND") {
      throw error(404, err.message);
    }
    throw error(500, "Authorization check failed");
  }

  // Proceed with upload
  const receipt = await receiptService.uploadReceipt({
    expenseId,
    file,
  });

  return json({ receipt });
}
```

##### Step 6: Database Migration

Generate and run migration to add userId to accounts:

```bash
bun drizzle-kit generate
bun drizzle-kit push
```

Then run a data migration to assign existing accounts to a user (if any exist):

```typescript
// scripts/migrate-accounts-to-user.ts
import { db } from "$lib/server/db";
import { accounts } from "$lib/schema/accounts";
import { users } from "$lib/schema/users";
import { eq } from "drizzle-orm";

async function migrateAccountsToUser() {
  // Create a default user or prompt for user ID
  const defaultUser = await db.query.users.findFirst();

  if (!defaultUser) {
    console.error("No users found. Please create a user first.");
    return;
  }

  // Update all accounts without a userId
  const result = await db
    .update(accounts)
    .set({ userId: defaultUser.id })
    .where(eq(accounts.userId, null));

  console.log(`Migrated accounts to user ${defaultUser.id}`);
}

migrateAccountsToUser();
```

##### Security Checklist

Before deploying HSA features, verify:

- [ ] User authentication system implemented (Better Auth or equivalent)
- [ ] Sessions stored securely with expiration
- [ ] tRPC context includes user and session
- [ ] All tRPC routes call `requireAuth()` or `verifyHsaAccountOwnership()`
- [ ] All API endpoints check `event.locals.user`
- [ ] Receipt downloads verify ownership before serving files
- [ ] Account schema includes `userId` foreign key
- [ ] Database migration completed for existing accounts
- [ ] Authorization helpers properly throw TRPCError
- [ ] Error messages don't leak sensitive information
- [ ] Rate limiting applied to sensitive routes
- [ ] HIPAA compliance requirements reviewed (if applicable)

#### 9.2 Receipt File Security

**Implemented Security Measures:**

1. **File Validation**:
   - MIME type whitelist
   - File size limits (10MB max)
   - Extension verification
   - Malicious filename sanitization

2. **Storage Security**:
   - Files stored outside web root
   - Non-guessable filenames (CUID)
   - Directory traversal prevention
   - Access control via authenticated endpoints

3. **Privacy**:
   - Soft delete support (HIPAA compliance)
   - No public URLs by default
   - Server-side access control
   - PHI (Protected Health Information) handling

**Recommended Enhancements:**

1. **Encryption at Rest**:
   - Encrypt receipt files using AES-256
   - Store encryption keys securely (environment variables)
   - Implement key rotation

2. **Virus Scanning**:
   - Integrate ClamAV or cloud service (Cloudflare, AWS GuardDuty)
   - Scan on upload before storage
   - Quarantine suspicious files

3. **Audit Logging**:
   - Log all receipt access (who, when, what)
   - Log medical expense modifications
   - Retention policy compliance

4. **Cloud Storage Migration Path**:
   - S3-compatible storage (AWS S3, Cloudflare R2)
   - Pre-signed URLs for secure access
   - Automatic backup and versioning

#### 9.2 HIPAA Compliance Considerations

If handling PHI (Protected Health Information):

1. **Data Encryption**:
   - TLS for data in transit
   - Encryption for data at rest
   - Encrypted backups

2. **Access Controls**:
   - User authentication required
   - Role-based access control
   - Session management

3. **Audit Trail**:
   - Track all access to medical records
   - Record modifications
   - Report generation capability

4. **Data Retention**:
   - Configurable retention policies
   - Secure deletion procedures
   - Backup and recovery procedures

## Implementation Order

1. ✅ **Phase 1**: Database schema (foundation) - **Week 1-2**
2. ✅ **Phase 2**: Service layer (business logic) - **Week 2-3**
3. ✅ **Phase 3**: tRPC routes & file upload - **Week 3-4**
4. ✅ **Phase 4**: Query layer integration - **Week 4**
5. **Phase 5**: Basic UI components (expense form, list, dashboard) - **Week 5-6**
6. **Phase 6**: Account wizard HSA support - **Week 6**
7. **Phase 7**: Database migration - **Week 7**
8. **Phase 8**: Data migration tools - **Week 7**
9. **Phase 9**: Security hardening - **Week 8**

## Success Metrics

- ✅ Users can create HSA accounts with proper configuration
- ✅ Users can record medical expenses with full metadata
- ✅ Users can upload and view receipts (images and PDFs)
- ✅ Users can track claim status from submission to payment
- ✅ Users can view tax year summaries for IRS reporting
- ✅ Users can monitor contribution limits and compliance
- ✅ Receipt upload handles errors gracefully
- ✅ Claim status updates reflect in real-time
- ✅ All queries properly filtered to exclude soft-deleted records
- ✅ File uploads validated for security

## Benefits

- **Complete HSA Management**: Track all aspects of HSA in one centralized place
- **Tax Compliance**: Easily generate tax reports and IRS-ready documentation
- **Receipt Organization**: Never lose a medical receipt again with cloud storage
- **Claim Tracking**: Know exactly where reimbursements stand with real-time status
- **Financial Planning**: Optimize contributions and plan medical expenses
- **IRS Compliance**: Ensure expenses are qualified and properly documented
- **Audit Protection**: Complete documentation package for IRS audits
- **Tax Year Clarity**: Proper tracking based on IRS payment date rules
- **Security**: HIPAA-aware design with encryption and access controls

## Future Enhancements

### Phase 10+: Advanced Features

- **Multi-account HSA support**: Track rollovers between HSA providers
- **FSA Integration**: Support Flexible Spending Accounts with use-it-or-lose-it rules
- **Dependent Care FSA**: Track childcare and dependent care expenses
- **Health App Integration**: Sync with Apple Health, Google Fit for wellness tracking
- **Prescription Tracking**: Medication reminders and refill notifications
- **Provider Network**: Lookup in-network providers and cost estimates
- **Medical Expense Forecasting**: ML-based prediction of future expenses
- **Family Member Tracking**: Individual expense tracking within family HSA
- **Tax Software Export**: Direct export to TurboTax, H&R Block, etc.
- **OCR Enhancement**: Automatic receipt data extraction and form pre-fill
- **Mobile App**: Dedicated iOS/Android app for on-the-go receipt capture
- **Insurance Integration**: Auto-import EOBs from insurance portals
- **Deductible Tracking**: Monitor progress toward annual deductible
- **Out-of-Pocket Max**: Track progress toward out-of-pocket maximum
- **Investment Tracking**: Monitor HSA investment performance and growth
- **Retirement Planning**: HSA as retirement vehicle calculator

---

**Status**: 📋 NOT IMPLEMENTED
**Priority**: Medium
**Estimated Effort**: 6-8 weeks
**Dependencies**: None (builds on existing infrastructure)
**Security Level**: High (PHI/HIPAA considerations)

---

*Last Updated: January 2025*
