import { serviceFactory } from "$core/server/shared/container/service-factory";
import { lazyService } from "$core/server/shared/container/lazy-service";
import { publicProcedure, t } from "$core/trpc";
import { translateDomainError } from "$core/trpc/shared/errors";
import { z } from "zod";

const floorPlanService = lazyService(() => serviceFactory.getFloorPlanService());

// Upper bounds on floor-plan data. These exist to block denial-of-service
// (a single save call used to loop unbounded-count inserts) and to stop
// attacker-controlled JSON blobs from ballooning the workspace row.
const MAX_NODES_PER_SAVE = 2_000;
const MAX_DELETED_IDS_PER_SAVE = 2_000;
const MAX_PROPERTIES_BYTES = 8_000;
const MAX_NODE_NAME_LENGTH = 200;
const MAX_NODE_ID_LENGTH = 64;
// Coordinate/geometry bounds: generous but finite so bad input can't overflow.
const COORD_MIN = -1_000_000;
const COORD_MAX = 1_000_000;

/**
 * Safe color allowlist for node fills/strokes. Matches hex (#rgb / #rgba /
 * #rrggbb / #rrggbbaa) or CSS Level 3 named colors (lowercase). Rejects
 * strings like "red; background: url(...)" that would perform CSS injection
 * when interpolated into an inline `style` attribute.
 */
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const NAMED_COLOR = /^[a-z]{3,20}$/;
const colorSchema = z
  .string()
  .max(32)
  .refine((v) => HEX_COLOR.test(v) || NAMED_COLOR.test(v), {
    message: "Color must be a hex code or CSS named color",
  });

/**
 * Validate that `properties` is a JSON string of bounded size and shape.
 * Rejects prototype-pollution keys on any object it contains.
 */
const propertiesSchema = z
  .string()
  .max(MAX_PROPERTIES_BYTES)
  .refine(
    (raw) => {
      try {
        const parsed = JSON.parse(raw);
        if (parsed === null || typeof parsed !== "object") return true;
        const walk = (v: unknown, depth: number): boolean => {
          if (depth > 6) return false;
          if (v === null || typeof v !== "object") return true;
          for (const key of Object.keys(v as object)) {
            if (key === "__proto__" || key === "constructor" || key === "prototype") {
              return false;
            }
            if (!walk((v as Record<string, unknown>)[key], depth + 1)) return false;
          }
          return true;
        };
        return walk(parsed, 0);
      } catch {
        return false;
      }
    },
    { message: "Properties must be valid bounded JSON" }
  );

const nodeSchema = z.object({
  id: z.string().min(1).max(MAX_NODE_ID_LENGTH),
  homeId: z.number().int().positive(),
  floorLevel: z.number().int().min(-20).max(100).default(0),
  parentId: z.string().min(1).max(MAX_NODE_ID_LENGTH).nullable().optional(),
  nodeType: z.enum(["wall", "room", "door", "window", "furniture", "appliance", "annotation"]),
  name: z.string().max(MAX_NODE_NAME_LENGTH).nullable().optional(),
  posX: z.number().min(COORD_MIN).max(COORD_MAX).default(0),
  posY: z.number().min(COORD_MIN).max(COORD_MAX).default(0),
  width: z.number().min(0).max(COORD_MAX).default(0),
  height: z.number().min(0).max(COORD_MAX).default(0),
  rotation: z.number().min(-360).max(360).default(0),
  x2: z.number().min(COORD_MIN).max(COORD_MAX).nullable().optional(),
  y2: z.number().min(COORD_MIN).max(COORD_MAX).nullable().optional(),
  wallHeight: z.number().positive().max(1_000).default(2.5),
  thickness: z.number().positive().max(1_000).default(0.15),
  elevation: z.number().min(-1_000).max(1_000).default(0),
  color: colorSchema.nullable().optional(),
  opacity: z.number().min(0).max(1).default(1),
  linkedLocationId: z.number().int().positive().nullable().optional(),
  linkedItemId: z.number().int().positive().nullable().optional(),
  properties: propertiesSchema.nullable().optional(),
});

export const homeFloorPlansRoutes = t.router({
  get: publicProcedure
    .input(
      z.object({
        homeId: z.number().int().positive(),
        floorLevel: z.number().int().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        return await floorPlanService.getFloorPlan(input.homeId, ctx.workspaceId, input.floorLevel);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  getFloorLevels: publicProcedure
    .input(z.object({ homeId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      try {
        return await floorPlanService.getFloorLevels(input.homeId, ctx.workspaceId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  save: publicProcedure
    .input(
      z.object({
        homeId: z.number().int().positive(),
        floorLevel: z.number().int().min(-20).max(100).default(0),
        nodes: z.array(nodeSchema).max(MAX_NODES_PER_SAVE),
        deletedNodeIds: z
          .array(z.string().min(1).max(MAX_NODE_ID_LENGTH))
          .max(MAX_DELETED_IDS_PER_SAVE),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await floorPlanService.saveFloorPlan(input, ctx.workspaceId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),
});
