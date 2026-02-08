import {
  createMetricAlertSchema,
  metricAlertIdSchema,
  updateMetricAlertSchema,
} from "$lib/schema/metric-alerts";
import { serviceFactory } from "$lib/server/shared/container/service-factory";
import { publicProcedure, rateLimitedProcedure, t } from "$lib/trpc";
import { withErrorHandler } from "$lib/trpc/shared/errors";

const metricAlertService = serviceFactory.getMetricAlertService();

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

  save: rateLimitedProcedure.input(createMetricAlertSchema).mutation(
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
    withErrorHandler(async ({ ctx }) =>
      metricAlertService.evaluateAlerts(ctx.workspaceId)
    )
  ),
});
