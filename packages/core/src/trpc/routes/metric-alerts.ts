import {
  createMetricAlertSchema,
  metricAlertIdSchema,
  updateMetricAlertSchema,
} from "$core/schema/metric-alerts";
import { serviceFactory } from "$core/server/shared/container/service-factory";
import { lazyService } from "$core/server/shared/container/lazy-service";
import { publicProcedure, rateLimitedProcedure, t } from "$core/trpc";
import { withErrorHandler } from "$core/trpc/shared/errors";

const metricAlertService = lazyService(() => serviceFactory.getMetricAlertService());

export const metricAlertRoutes = t.router({
  all: publicProcedure.query(
    withErrorHandler(async ({ ctx }) => metricAlertService.getAllAlerts(ctx.workspaceId))
  ),

  load: publicProcedure
    .input(metricAlertIdSchema)
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        metricAlertService.getAlertById(input.id, ctx.workspaceId)
      )
    ),

  save: rateLimitedProcedure
    .input(createMetricAlertSchema)
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        metricAlertService.createAlert(input, ctx.workspaceId)
      )
    ),

  update: rateLimitedProcedure.input(updateMetricAlertSchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      const { id, ...data } = input;
      return metricAlertService.updateAlert(id, data, ctx.workspaceId);
    })
  ),

  remove: rateLimitedProcedure
    .input(metricAlertIdSchema)
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        metricAlertService.deleteAlert(input.id, ctx.workspaceId)
      )
    ),

  toggle: rateLimitedProcedure
    .input(metricAlertIdSchema)
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        metricAlertService.toggleAlert(input.id, ctx.workspaceId)
      )
    ),

  evaluate: rateLimitedProcedure.mutation(
    withErrorHandler(async ({ ctx }) => metricAlertService.evaluateAlerts(ctx.workspaceId))
  ),
});
