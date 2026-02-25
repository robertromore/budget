import {
  formInsertCategoryGroupSchema,
  formUpdateCategoryGroupSchema,
  formUpdateCategoryGroupSettingsSchema,
} from "$lib/schema/category-groups";
import { serviceFactory } from "$lib/server/shared/container/service-factory";
import { lazyService } from "$lib/server/shared/container/lazy-service";
import { publicProcedure, rateLimitedProcedure, t } from "$lib/trpc";
import { withErrorHandler } from "$lib/trpc/shared/errors";
import { z } from "zod";

const categoryGroupService = lazyService(() => serviceFactory.getCategoryGroupService());
const recommendationService = lazyService(() =>
  serviceFactory.getCategoryGroupRecommendationService()
);
const settingsService = lazyService(() => serviceFactory.getCategoryGroupSettingsService());

export const categoryGroupsRoutes = t.router({
  // ================================================================================
  // Category Group Query Procedures
  // ================================================================================

  list: publicProcedure.query(
    withErrorHandler(async ({ ctx }) => {
      return await categoryGroupService.listGroupsWithCounts(ctx.workspaceId);
    })
  ),

  getBySlug: publicProcedure.input(z.object({ slug: z.string() })).query(
    withErrorHandler(async ({ input, ctx }) => {
      return await categoryGroupService.getGroupBySlug(input.slug, ctx.workspaceId);
    })
  ),

  getGroupCategories: publicProcedure.input(z.object({ groupId: z.number() })).query(
    withErrorHandler(async ({ input, ctx }) => {
      return await categoryGroupService.getCategoriesForGroup(input.groupId, ctx.workspaceId);
    })
  ),

  // ================================================================================
  // Category Group Mutation Procedures
  // ================================================================================

  create: rateLimitedProcedure.input(formInsertCategoryGroupSchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      return await categoryGroupService.createGroup(input as any, ctx.workspaceId);
    })
  ),

  update: rateLimitedProcedure.input(formUpdateCategoryGroupSchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      const { id, ...updates } = input;
      return await categoryGroupService.updateGroup(id, updates as any, ctx.workspaceId);
    })
  ),

  delete: rateLimitedProcedure.input(z.object({ id: z.number() })).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      await categoryGroupService.deleteGroup(input.id, ctx.workspaceId);
      return { success: true };
    })
  ),

  addCategories: rateLimitedProcedure
    .input(
      z.object({
        groupId: z.number(),
        categoryIds: z.array(z.number()),
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) => {
        await categoryGroupService.addCategoriesToGroup(
          input.groupId,
          input.categoryIds,
          ctx.workspaceId
        );
        return { success: true };
      })
    ),

  removeCategory: rateLimitedProcedure
    .input(
      z.object({
        categoryId: z.number(),
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) => {
        await categoryGroupService.removeCategoryFromGroup(input.categoryId, ctx.workspaceId);
        return { success: true };
      })
    ),

  moveCategory: rateLimitedProcedure
    .input(
      z.object({
        categoryId: z.number(),
        newGroupId: z.number(),
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) => {
        await categoryGroupService.moveCategoryToGroup(
          input.categoryId,
          input.newGroupId,
          ctx.workspaceId
        );
        return { success: true };
      })
    ),

  reorderGroups: rateLimitedProcedure
    .input(
      z.object({
        updates: z.array(
          z.object({
            id: z.number(),
            sortOrder: z.number(),
          })
        ),
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) => {
        await categoryGroupService.reorderGroups(input.updates, ctx.workspaceId);
        return { success: true };
      })
    ),

  // ================================================================================
  // Recommendation Procedures (flat structure, not nested)
  // ================================================================================

  recommendationsList: publicProcedure.query(
    withErrorHandler(async ({ ctx }) => {
      return await recommendationService.getPendingRecommendations(ctx.workspaceId);
    })
  ),

  recommendationsGenerate: rateLimitedProcedure.mutation(
    withErrorHandler(async ({ ctx }) => {
      return await recommendationService.generateRecommendations(ctx.workspaceId);
    })
  ),

  recommendationsApprove: rateLimitedProcedure.input(z.object({ id: z.number() })).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      await recommendationService.approveRecommendation(input.id, ctx.workspaceId);
      return { success: true };
    })
  ),

  recommendationsDismiss: rateLimitedProcedure.input(z.object({ id: z.number() })).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      await recommendationService.dismissRecommendation(input.id, ctx.workspaceId);
      return { success: true };
    })
  ),

  recommendationsReject: rateLimitedProcedure.input(z.object({ id: z.number() })).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      await recommendationService.rejectRecommendation(input.id, ctx.workspaceId);
      return { success: true };
    })
  ),

  // ================================================================================
  // Settings Procedures (flat structure, not nested)
  // ================================================================================

  settingsGet: publicProcedure.query(
    withErrorHandler(async () => {
      return await settingsService.getSettings();
    })
  ),

  settingsUpdate: rateLimitedProcedure.input(formUpdateCategoryGroupSettingsSchema).mutation(
    withErrorHandler(async ({ input }) => {
      return await settingsService.updateSettings(input as any);
    })
  ),
});
