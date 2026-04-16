import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workspaces } from "../workspaces";
import { homes } from "./homes";
import { homeLocations } from "./home-locations";

export const homeItems = sqliteTable(
  "home_item",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    cuid: text("cuid")
      .notNull()
      .$defaultFn(() => createId()),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    homeId: integer("home_id")
      .notNull()
      .references(() => homes.id, { onDelete: "cascade" }),
    locationId: integer("location_id").references(() => homeLocations.id, {
      onDelete: "set null",
    }),
    parentItemId: integer("parent_item_id").references((): AnySQLiteColumn => homeItems.id, {
      onDelete: "set null",
    }),
    assetId: integer("asset_id"),

    // Core fields
    name: text("name").notNull(),
    description: text("description"),
    notes: text("notes"),

    // Identification
    serialNumber: text("serial_number"),
    modelNumber: text("model_number"),
    manufacturer: text("manufacturer"),

    // Status
    quantity: integer("quantity").notNull().default(1),
    isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
    isInsured: integer("is_insured", { mode: "boolean" }).notNull().default(false),

    // Purchase info
    purchaseDate: text("purchase_date"),
    purchaseVendor: text("purchase_vendor"),
    purchasePrice: real("purchase_price"),

    // Warranty info
    warrantyExpires: text("warranty_expires"),
    warrantyNotes: text("warranty_notes"),
    lifetimeWarranty: integer("lifetime_warranty", { mode: "boolean" }).notNull().default(false),

    // Value
    currentValue: real("current_value"),

    // Custom fields (JSON array of {key, value, type})
    customFields: text("custom_fields"),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    index("home_item_workspace_id_idx").on(table.workspaceId),
    index("home_item_home_id_idx").on(table.homeId),
    index("home_item_location_id_idx").on(table.locationId),
    index("home_item_parent_item_id_idx").on(table.parentItemId),
    index("home_item_asset_id_idx").on(table.homeId, table.assetId),
    index("home_item_deleted_at_idx").on(table.deletedAt),
    index("home_item_name_idx").on(table.name),
  ]
);

export const selectHomeItemSchema = createSelectSchema(homeItems);
export const insertHomeItemSchema = createInsertSchema(homeItems, {
  name: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(
        z
          .string()
          .min(1, "Name is required")
          .max(200, "Name must be less than 200 characters")
      ),
  description: (schema) =>
    schema.pipe(z.string().max(2000, "Description must be less than 2000 characters")).optional().nullable(),
  quantity: (schema) => schema.pipe(z.number().int().min(0, "Quantity must be non-negative")),
  purchasePrice: (schema) => schema.pipe(z.number().min(0, "Purchase price must be non-negative")).optional().nullable(),
  currentValue: (schema) => schema.pipe(z.number().min(0, "Current value must be non-negative")).optional().nullable(),
});

export type HomeItem = typeof homeItems.$inferSelect;
export type NewHomeItem = typeof homeItems.$inferInsert;
