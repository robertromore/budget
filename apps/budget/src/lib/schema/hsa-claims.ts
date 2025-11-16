import {sqliteTable, integer, text, real, index} from "drizzle-orm/sqlite-core";
import {sql} from "drizzle-orm";
import {createId} from "@paralleldrive/cuid2";
import {createInsertSchema, createSelectSchema} from "drizzle-zod";
import {z} from "zod/v4";
import {medicalExpenses} from "./medical-expenses";

export const claimStatusEnum = {
  not_submitted: "Not Submitted",
  pending_submission: "Pending Submission",
  submitted: "Submitted",
  in_review: "In Review",
  approved: "Approved",
  partially_approved: "Partially Approved",
  denied: "Denied",
  resubmission_required: "Resubmission Required",
  paid: "Paid",
  withdrawn: "Withdrawn",
} as const;

export type ClaimStatus = keyof typeof claimStatusEnum;
export const claimStatusKeys = [
  "not_submitted",
  "pending_submission",
  "submitted",
  "in_review",
  "approved",
  "partially_approved",
  "denied",
  "resubmission_required",
  "paid",
  "withdrawn",
] as const;

export const hsaClaims = sqliteTable(
  "hsa_claim",
  {
    id: integer("id").primaryKey({autoIncrement: true}),
    cuid: text("cuid").$defaultFn(() => createId()),

    medicalExpenseId: integer("medical_expense_id")
      .references(() => medicalExpenses.id, {onDelete: "restrict"})
      .notNull(),

    // Claim details
    claimNumber: text("claim_number"), // External claim number from HSA administrator
    status: text("status", {enum: claimStatusKeys}).default("not_submitted").notNull(),

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

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
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
  status: (schema) => schema.pipe(z.enum(claimStatusKeys)),
  claimedAmount: (schema) => schema.pipe(z.number().positive().max(1000000)),
  approvedAmount: (schema) => schema.pipe(z.number().min(0).max(1000000)).optional(),
  deniedAmount: (schema) => schema.pipe(z.number().min(0).max(1000000)).optional(),
  paidAmount: (schema) => schema.pipe(z.number().min(0).max(1000000)).optional(),
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
  denialCode: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().max(50))
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
  internalNotes: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().max(1000))
      .optional()
      .nullable(),
});

export type HsaClaim = typeof hsaClaims.$inferSelect;
