import { serviceFactory } from "$core/server/shared/container/service-factory";
import { lazyService } from "$core/server/shared/container/lazy-service";
import { publicProcedure, t } from "$core/trpc";
import { translateDomainError } from "$core/trpc/shared/errors";
import { z } from "zod";

const floorPlanService = lazyService(() => serviceFactory.getFloorPlanService());

const nodeSchema = z.object({
  id: z.string().min(1),
  homeId: z.number().int().positive(),
  floorLevel: z.number().int().default(0),
  parentId: z.string().nullable().optional(),
  nodeType: z.enum(["wall", "room", "door", "window", "furniture", "appliance", "annotation"]),
  name: z.string().nullable().optional(),
  posX: z.number().default(0),
  posY: z.number().default(0),
  width: z.number().default(0),
  height: z.number().default(0),
  rotation: z.number().default(0),
  x2: z.number().nullable().optional(),
  y2: z.number().nullable().optional(),
  color: z.string().nullable().optional(),
  opacity: z.number().min(0).max(1).default(1),
  linkedLocationId: z.number().int().positive().nullable().optional(),
  linkedItemId: z.number().int().positive().nullable().optional(),
  properties: z.string().nullable().optional(),
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
        floorLevel: z.number().int().default(0),
        nodes: z.array(nodeSchema),
        deletedNodeIds: z.array(z.string()),
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
