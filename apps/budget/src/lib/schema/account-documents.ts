import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accounts } from "./accounts";

// Inline formatFileSize to avoid importing from formatters.ts which has SvelteKit dependencies
// that break drizzle-kit migrations
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export const documentTypeEnum = {
  tax_1099_int: "1099-INT",
  tax_1099_div: "1099-DIV",
  tax_1099_b: "1099-B",
  tax_1099_misc: "1099-MISC",
  tax_1099_r: "1099-R",
  tax_1099_sa: "1099-SA",
  tax_1098: "1098",
  tax_1098_e: "1098-E",
  tax_w2: "W-2",
  tax_5498: "5498",
  bank_statement: "Bank Statement",
  investment_statement: "Investment Statement",
  credit_card_statement: "Credit Card Statement",
  brokerage_statement: "Brokerage Statement",
  receipt: "Receipt",
  contract: "Contract",
  other: "Other",
} as const;

export type DocumentType = keyof typeof documentTypeEnum;
export const documentTypeKeys = [
  "tax_1099_int",
  "tax_1099_div",
  "tax_1099_b",
  "tax_1099_misc",
  "tax_1099_r",
  "tax_1099_sa",
  "tax_1098",
  "tax_1098_e",
  "tax_w2",
  "tax_5498",
  "bank_statement",
  "investment_statement",
  "credit_card_statement",
  "brokerage_statement",
  "receipt",
  "contract",
  "other",
] as const;

// Allowed MIME types for documents
export const ALLOWED_DOCUMENT_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

// Extraction status enum
export const extractionStatusKeys = [
  "pending",
  "processing",
  "completed",
  "failed",
  "skipped",
] as const;
export type ExtractionStatus = (typeof extractionStatusKeys)[number];

// Extraction method enum
export const extractionMethodKeys = [
  "pdf-parse",
  "tesseract",
  "ai-vision",
  "none",
] as const;
export type ExtractionMethod = (typeof extractionMethodKeys)[number];

export const accountDocuments = sqliteTable(
  "account_document",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    cuid: text("cuid").$defaultFn(() => createId()),

    // Account relationship
    accountId: integer("account_id")
      .references(() => accounts.id, { onDelete: "cascade" })
      .notNull(),

    // Tax year organization
    taxYear: integer("tax_year").notNull(),

    // Document metadata
    documentType: text("document_type", { enum: documentTypeKeys }).default("other"),
    fileName: text("file_name").notNull(),
    fileSize: integer("file_size").notNull(), // Size in bytes
    mimeType: text("mime_type").notNull(), // image/jpeg, image/png, application/pdf

    // Storage information
    storagePath: text("storage_path").notNull(), // Relative path from uploads directory
    storageUrl: text("storage_url"), // Public URL if using cloud storage (future)

    // User-provided metadata
    title: text("title"), // Optional user-friendly title
    description: text("description"),

    // OCR/extraction data
    extractedText: text("extracted_text"), // OCR text from document
    extractedData: text("extracted_data"), // JSON: {date, amount, etc.}

    // Extraction status tracking
    extractionStatus: text("extraction_status", { enum: extractionStatusKeys }).default("pending"),
    extractionMethod: text("extraction_method", { enum: extractionMethodKeys }),
    extractionError: text("extraction_error"), // Error message if extraction failed
    extractedAt: text("extracted_at"), // Timestamp of extraction completion

    // Timestamps
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
    index("account_document_account_idx").on(table.accountId),
    index("account_document_tax_year_idx").on(table.taxYear),
    index("account_document_type_idx").on(table.documentType),
    index("account_document_deleted_at_idx").on(table.deletedAt),
    index("account_document_extraction_status_idx").on(table.extractionStatus),
  ]
);

// Relations
export const accountDocumentsRelations = relations(accountDocuments, ({ one }) => ({
  account: one(accounts, {
    fields: [accountDocuments.accountId],
    references: [accounts.id],
  }),
}));

// Validation schemas
export const selectAccountDocumentSchema = createSelectSchema(accountDocuments);
export const insertAccountDocumentSchema = createInsertSchema(accountDocuments);

export const formInsertAccountDocumentSchema = createInsertSchema(accountDocuments, {
  accountId: (schema) => schema.pipe(z.number().positive()),
  taxYear: (schema) =>
    schema.pipe(
      z
        .number()
        .int()
        .min(2000, "Tax year must be 2000 or later")
        .max(2100, "Tax year must be before 2100")
    ),
  documentType: (schema) => schema.pipe(z.enum(documentTypeKeys)).optional(),
  fileName: (schema) => schema.transform((val) => val?.trim()).pipe(z.string().min(1).max(255)),
  fileSize: (schema) =>
    schema.pipe(
      z
        .number()
        .positive()
        .max(MAX_DOCUMENT_SIZE, `File size must be less than ${formatFileSize(MAX_DOCUMENT_SIZE)}`)
    ),
  mimeType: (schema) =>
    schema.pipe(
      z
        .string()
        .refine(
          (val) => ALLOWED_DOCUMENT_MIMES.includes(val as any),
          "File type must be JPEG, PNG, WebP, or PDF"
        )
    ),
  title: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().max(100))
      .optional()
      .nullable(),
  description: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().max(500))
      .optional()
      .nullable(),
});

export type AccountDocument = typeof accountDocuments.$inferSelect;
export type NewAccountDocument = typeof accountDocuments.$inferInsert;
