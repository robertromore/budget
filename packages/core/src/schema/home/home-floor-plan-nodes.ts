import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workspaces } from "../workspaces";
import { homes } from "./homes";
import { homeLocations } from "./home-locations";
import { homeItems } from "./home-items";

export const floorPlanNodeTypeEnum = [
  "wall",
  "room",
  "door",
  "window",
  "furniture",
  "appliance",
  "annotation",
] as const;

export type FloorPlanNodeType = (typeof floorPlanNodeTypeEnum)[number];

export const homeFloorPlanNodes = sqliteTable(
  "home_floor_plan_node",
  {
    id: text("id").primaryKey(), // nanoid, client-generated for optimistic updates
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    homeId: integer("home_id")
      .notNull()
      .references(() => homes.id, { onDelete: "cascade" }),
    floorLevel: integer("floor_level").notNull().default(0),
    parentId: text("parent_id").references((): AnySQLiteColumn => homeFloorPlanNodes.id, {
      onDelete: "set null",
    }),
    nodeType: text("node_type", { enum: floorPlanNodeTypeEnum }).notNull(),

    // Display name
    name: text("name"),

    // Geometry (2D coordinates)
    posX: real("pos_x").notNull().default(0),
    posY: real("pos_y").notNull().default(0),
    width: real("width").notNull().default(0),
    height: real("height").notNull().default(0),
    rotation: real("rotation").notNull().default(0),

    // For walls: start/end points
    x2: real("x2"),
    y2: real("y2"),

    // 3D properties
    wallHeight: real("wall_height").notNull().default(2.5),
    thickness: real("thickness").notNull().default(0.15),
    elevation: real("elevation").notNull().default(0),

    // Visual
    color: text("color"),
    opacity: real("opacity").notNull().default(1),

    // Linked entities
    linkedLocationId: integer("linked_location_id").references(() => homeLocations.id, {
      onDelete: "set null",
    }),
    linkedItemId: integer("linked_item_id").references(() => homeItems.id, {
      onDelete: "set null",
    }),

    // Type-specific data (JSON)
    properties: text("properties"),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    // Soft-delete tombstone: rows remain on disk so a mistaken bulk delete
    // can be reversed. Reads filter on `IS NULL` by default.
    deletedAt: text("deleted_at"),
  },
  (table) => [
    index("floor_plan_node_workspace_id_idx").on(table.workspaceId),
    index("floor_plan_node_home_id_idx").on(table.homeId),
    index("floor_plan_node_floor_level_idx").on(table.homeId, table.floorLevel),
    index("floor_plan_node_parent_id_idx").on(table.parentId),
    index("floor_plan_node_type_idx").on(table.nodeType),
    // Composite index aligning with every read path: findAllByHome filters
    // on (workspaceId, homeId, floorLevel?) and findIdsInHome filters on
    // (workspaceId, homeId). Avoids full scans on large multi-tenant DBs.
    index("floor_plan_node_lookup_idx").on(
      table.workspaceId,
      table.homeId,
      table.floorLevel
    ),
    index("floor_plan_node_deleted_at_idx").on(table.deletedAt),
  ]
);

export const selectFloorPlanNodeSchema = createSelectSchema(homeFloorPlanNodes);
export const insertFloorPlanNodeSchema = createInsertSchema(homeFloorPlanNodes, {
  id: (schema) => schema.pipe(z.string().min(1, "ID is required")),
  nodeType: (schema) => schema.pipe(z.enum(floorPlanNodeTypeEnum)),
});

export type FloorPlanNode = typeof homeFloorPlanNodes.$inferSelect;
export type NewFloorPlanNode = typeof homeFloorPlanNodes.$inferInsert;
