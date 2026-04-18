import { serviceFactory } from "$core/server/shared/container/service-factory";
import { floorPlanNodeTypeEnum } from "$core/schema/home/home-floor-plan-nodes";
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
const SEGMENT_NODE_TYPES = new Set(["wall", "fence", "roof-segment", "stair-segment"]);
const AREA_NODE_TYPES = new Set([
  "room",
  "zone",
  "slab",
  "ceiling",
  "roof",
  "stair",
  "door",
  "window",
  "furniture",
  "item",
  "appliance",
]);
const PARENT_REQUIRED_NODE_TYPES = new Set([
  "level",
  "slab",
  "ceiling",
  "roof",
  "stair",
  "roof-segment",
  "stair-segment",
]);

/**
 * Safe color shape-check for node fills/strokes. Matches either:
 *   - hex: `#rgb` / `#rgba` / `#rrggbb` / `#rrggbbaa`
 *   - a bare 3-20 character lowercase alphabetic token that CSS will
 *     interpret as a named color (unknown names silently resolve to
 *     `currentColor`; no injection path)
 *
 * This is deliberately NOT a CSS3 named-color allowlist — a regex-based
 * shape check is sufficient because the only security concern is
 * preventing strings like `"red; background: url(...)"` from landing
 * in an inline `style` attribute. The inline `style` interpolation
 * path strips / rejects anything with punctuation (`;`, `{`, `(`); the
 * regex enforces that property at the API boundary.
 *
 * Non-existent named colors (e.g. `debug`, `fake`) are accepted by the
 * regex and render as `currentColor` in practice — acceptable fallback,
 * and cheaper than maintaining a drift-prone 150-entry CSS3 allowlist.
 */
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const NAMED_COLOR_SHAPE = /^[a-z]{3,20}$/;
const colorSchema = z
  .string()
  .max(32)
  .refine((v) => HEX_COLOR.test(v) || NAMED_COLOR_SHAPE.test(v), {
    message: "Color must be a hex code or a CSS-safe named-color token",
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

const nodeSchema = z
  .object({
    id: z.string().min(1).max(MAX_NODE_ID_LENGTH),
    homeId: z.number().int().positive(),
    floorLevel: z.number().int().min(-20).max(100).default(0),
    parentId: z.string().min(1).max(MAX_NODE_ID_LENGTH).nullable().optional(),
    nodeType: z.enum(floorPlanNodeTypeEnum),
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
  })
  .superRefine((node, ctx) => {
    if (SEGMENT_NODE_TYPES.has(node.nodeType)) {
      if (node.x2 === null || node.x2 === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["x2"],
          message: `${node.nodeType} nodes require x2`,
        });
      }
      if (node.y2 === null || node.y2 === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["y2"],
          message: `${node.nodeType} nodes require y2`,
        });
      }
    }

    if (AREA_NODE_TYPES.has(node.nodeType)) {
      if (node.width <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["width"],
          message: `${node.nodeType} nodes require width > 0`,
        });
      }
      if (node.height <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["height"],
          message: `${node.nodeType} nodes require height > 0`,
        });
      }
    }

    if (node.nodeType === "site" && node.parentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["parentId"],
        message: "Site nodes cannot have a parent",
      });
    }

    if (
      PARENT_REQUIRED_NODE_TYPES.has(node.nodeType) &&
      (node.parentId === null || node.parentId === undefined)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["parentId"],
        message: `${node.nodeType} nodes require a parent`,
      });
    }
  });

export const homeFloorPlansRoutes = t.router({
  get: publicProcedure
    .input(
      z.object({
        homeId: z.number().int().positive(),
        // Required at the API boundary. The service still accepts `undefined`
        // for internal use ("all floors"), but external callers must pick a
        // floor so per-floor cache keys stay aligned between get and save.
        floorLevel: z.number().int(),
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
