// A "transaction" is a representation of the transfer of an amount of resources
// from one account to another. Transactions can be "split" into multiple
// transactions. Split transactions have the same parent transaction.

import {relations, sql} from "drizzle-orm";
import {sqliteTable, integer, text, index} from "drizzle-orm/sqlite-core";
import {createInsertSchema, createSelectSchema} from "drizzle-zod";
import {transactions} from "./transactions";
import {z} from "zod/v4";

export const payees = sqliteTable(
  "payee",
  {
    id: integer("id").primaryKey({autoIncrement: true}),
    name: text("name"),
    notes: text("notes"),
    dateCreated: text("date_created")
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
    index("payee_name_idx").on(table.name),
    index("payee_deleted_at_idx").on(table.deletedAt),
  ]
);

export const payeesRelations = relations(payees, ({many}) => ({
  transactions: many(transactions),
}));

export const selectPayeeSchema = createSelectSchema(payees);
export const insertPayeeSchema = createInsertSchema(payees);
export const formInsertPayeeSchema = createInsertSchema(payees, {
  name: (schema) =>
    schema
      .min(1, "Payee name is required")
      .max(50, "Payee name must be less than 50 characters")
      .regex(/^[a-zA-Z0-9\s\-_&']+$/, "Payee name contains invalid characters"),
  notes: (schema) =>
    schema.max(500, "Notes must be less than 500 characters").optional().nullable(),
});
export const removePayeeSchema = z.object({id: z.number().nonnegative()});
export const removePayeesSchema = z.object({entities: z.array(z.number().nonnegative())});

export type Payee = typeof payees.$inferSelect;
export type NewPayee = typeof payees.$inferInsert;
export type FormInsertPayeeSchema = typeof formInsertPayeeSchema;
export type RemovePayeeSchema = typeof removePayeeSchema;
export type RemovePayesSchema = typeof removePayeesSchema;
export type HasPayees = {
  payees?: Payee[];
};
