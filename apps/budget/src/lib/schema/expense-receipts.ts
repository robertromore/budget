import {sqliteTable, integer, text, index} from "drizzle-orm/sqlite-core";
import {sql} from "drizzle-orm";
import {createId} from "@paralleldrive/cuid2";
import {createInsertSchema, createSelectSchema} from "drizzle-zod";
import {z} from "zod/v4";
import {medicalExpenses} from "./medical-expenses";

export const receiptTypeEnum = {
  receipt: "Receipt",
  bill: "Bill",
  invoice: "Invoice",
  eob: "Explanation of Benefits (EOB)",
  statement: "Statement",
  prescription: "Prescription",
  other: "Other",
} as const;

export type ReceiptType = keyof typeof receiptTypeEnum;
export const receiptTypeKeys = [
  "receipt",
  "bill",
  "invoice",
  "eob",
  "statement",
  "prescription",
  "other",
] as const;

// Allowed MIME types for receipts
export const ALLOWED_RECEIPT_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const MAX_RECEIPT_SIZE = 10 * 1024 * 1024; // 10MB

export const expenseReceipts = sqliteTable(
  "expense_receipt",
  {
    id: integer("id").primaryKey({autoIncrement: true}),
    cuid: text("cuid").$defaultFn(() => createId()),

    medicalExpenseId: integer("medical_expense_id")
      .references(() => medicalExpenses.id, {onDelete: "restrict"})
      .notNull(),

    // File metadata
    receiptType: text("receipt_type", {enum: receiptTypeKeys}).default("receipt"),
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
    uploadedAt: text("uploaded_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
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
  receiptType: (schema) => schema.pipe(z.enum(receiptTypeKeys)).optional(),
  fileName: (schema) => schema.transform((val) => val?.trim()).pipe(z.string().min(1).max(255)),
  fileSize: (schema) =>
    schema.pipe(
      z
        .number()
        .positive()
        .max(MAX_RECEIPT_SIZE, `File size must be less than ${MAX_RECEIPT_SIZE / 1024 / 1024}MB`)
    ),
  mimeType: (schema) =>
    schema.pipe(
      z
        .string()
        .refine(
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
