import {sqliteTable, integer, text, real, index, uniqueIndex} from "drizzle-orm/sqlite-core";
import {sql} from "drizzle-orm";
import {createId} from "@paralleldrive/cuid2";
import {createInsertSchema, createSelectSchema} from "drizzle-zod";
import {z} from "zod/v4";
import {transactions} from "./transactions";
import {accounts} from "./accounts";

// Medical expense categories based on IRS Publication 502
// Comprehensive list of HSA-qualified medical expenses organized by category

export const medicalExpenseCategories = {
  // Medical Services
  "Medical Services": [
    {key: "doctor_visit", label: "Doctor Visit (General Practitioner)"},
    {key: "specialist_visit", label: "Specialist Visit"},
    {key: "urgent_care", label: "Urgent Care"},
    {key: "emergency_room", label: "Emergency Room"},
    {key: "hospital_stay", label: "Hospital Stay (Inpatient)"},
    {key: "surgery", label: "Surgery / Surgical Procedures"},
    {key: "lab_tests", label: "Laboratory Tests"},
    {key: "imaging", label: "Imaging (X-ray, MRI, CT Scan, Ultrasound)"},
    {key: "ambulance", label: "Ambulance Services"},
    {key: "telemedicine", label: "Telemedicine / Virtual Visits"},
  ],

  // Dental Care
  "Dental Care": [
    {key: "dental_exam", label: "Dental Exam / Cleaning"},
    {key: "dental_filling", label: "Dental Fillings"},
    {key: "dental_crown", label: "Crowns / Caps"},
    {key: "dental_extraction", label: "Tooth Extraction"},
    {key: "dental_root_canal", label: "Root Canal"},
    {key: "dental_braces", label: "Braces / Orthodontics"},
    {key: "dental_implant", label: "Dental Implants"},
    {key: "dental_dentures", label: "Dentures"},
    {key: "dental_surgery", label: "Oral Surgery"},
  ],

  // Vision Care
  "Vision Care": [
    {key: "eye_exam", label: "Eye Exam / Vision Test"},
    {key: "eyeglasses", label: "Eyeglasses / Prescription Glasses"},
    {key: "contact_lenses", label: "Contact Lenses"},
    {key: "laser_eye_surgery", label: "Laser Eye Surgery (LASIK, PRK)"},
    {key: "vision_therapy", label: "Vision Therapy"},
  ],

  // Medications
  Medications: [
    {key: "prescription", label: "Prescription Medication"},
    {key: "otc_medicine", label: "Over-the-Counter Medicine"},
    {key: "insulin", label: "Insulin"},
  ],

  // Therapy & Rehabilitation
  "Therapy & Rehabilitation": [
    {key: "physical_therapy", label: "Physical Therapy"},
    {key: "occupational_therapy", label: "Occupational Therapy"},
    {key: "speech_therapy", label: "Speech Therapy"},
    {key: "mental_health", label: "Mental Health / Psychiatric Care"},
    {key: "addiction_treatment", label: "Addiction / Substance Abuse Treatment"},
    {key: "chiropractor", label: "Chiropractor"},
    {key: "acupuncture", label: "Acupuncture"},
  ],

  // Medical Equipment & Supplies
  "Medical Equipment & Supplies": [
    {key: "hearing_aids", label: "Hearing Aids"},
    {key: "wheelchair", label: "Wheelchair"},
    {key: "crutches_walker", label: "Crutches / Walker / Cane"},
    {key: "prosthetic", label: "Prosthetic Limbs / Devices"},
    {key: "medical_supplies", label: "Medical Supplies (Bandages, etc.)"},
    {key: "glucose_monitor", label: "Blood Glucose Monitor / Test Strips"},
    {key: "breast_pump", label: "Breast Pump / Lactation Supplies"},
  ],

  // Reproductive Health
  "Reproductive Health": [
    {key: "prenatal_care", label: "Prenatal Care"},
    {key: "childbirth", label: "Childbirth / Delivery"},
    {key: "fertility_treatment", label: "Fertility Treatment / IVF"},
    {key: "birth_control", label: "Birth Control (Prescription)"},
    {key: "pregnancy_test", label: "Pregnancy Test"},
  ],

  // Long-term & Home Care
  "Long-term & Home Care": [
    {key: "home_health_care", label: "Home Health Care"},
    {key: "nursing_home", label: "Nursing Home / Assisted Living (Medical Care)"},
    {key: "long_term_care", label: "Long-term Care Services"},
  ],

  // Insurance & Premiums
  "Insurance & Premiums": [
    {key: "health_insurance_premiums", label: "Health Insurance Premiums"},
    {key: "cobra_premiums", label: "COBRA Premiums"},
    {key: "medicare_premiums", label: "Medicare Premiums (Parts A, B, C, D)"},
    {key: "long_term_care_insurance", label: "Long-term Care Insurance Premiums"},
  ],

  // Preventive Care & Screenings
  "Preventive Care & Screenings": [
    {key: "annual_physical", label: "Annual Physical / Wellness Exam"},
    {key: "immunizations", label: "Immunizations / Vaccinations"},
    {key: "cancer_screening", label: "Cancer Screening (Mammogram, Colonoscopy, etc.)"},
    {key: "diagnostic_tests", label: "Diagnostic Tests / Health Screenings"},
  ],

  // Other Qualified
  Other: [
    {key: "other_qualified", label: "Other Qualified Expense"},
    {key: "non_qualified", label: "Non-Qualified Expense"},
  ],
} as const;

// Flatten into a single enum for backwards compatibility
export const medicalExpenseTypeEnum = Object.values(medicalExpenseCategories)
  .flat()
  .reduce(
    (acc, item) => {
      acc[item.key] = item.label;
      return acc;
    },
    {} as Record<string, string>
  );

export type MedicalExpenseType = keyof typeof medicalExpenseTypeEnum;
export const medicalExpenseTypeKeys = Object.values(medicalExpenseCategories)
  .flat()
  .map((item) => item.key) as [string, ...string[]];

export const medicalExpenses = sqliteTable(
  "medical_expense",
  {
    id: integer("id").primaryKey({autoIncrement: true}),
    cuid: text("cuid").$defaultFn(() => createId()),

    // Core expense details
    transactionId: integer("transaction_id")
      .references(() => transactions.id, {onDelete: "restrict"})
      .notNull(),
    hsaAccountId: integer("hsa_account_id")
      .references(() => accounts.id, {onDelete: "restrict"})
      .notNull(),

    // Medical expense classification
    expenseType: text("expense_type", {enum: medicalExpenseTypeKeys}).notNull(),
    isQualified: integer("is_qualified", {mode: "boolean"}).default(true).notNull(),

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

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    // Unique index on transactionId - each transaction can only have one medical expense
    // This prevents duplicate medical expenses for the same transaction
    uniqueIndex("medical_expense_transaction_unique_idx").on(table.transactionId),
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
    schema.pipe(
      z.enum(medicalExpenseTypeKeys, {
        message: "Please select a valid expense type",
      })
    ),
  amount: (schema) => schema.pipe(z.number().positive("Amount must be positive").max(1000000)),
  insuranceCovered: (schema) => schema.pipe(z.number().min(0).max(1000000)).optional().nullable(),
  outOfPocket: (schema) =>
    schema.pipe(z.number().positive("Out of pocket amount must be positive").max(1000000)),
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
  serviceDate: (schema) => schema.pipe(z.string().datetime()),
  paidDate: (schema) => schema.pipe(z.string().datetime()).optional().nullable(),
  taxYear: (schema) => schema.pipe(z.number().min(2000).max(2100)),
});

export type MedicalExpense = typeof medicalExpenses.$inferSelect;
