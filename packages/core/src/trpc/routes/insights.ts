import { PeriodBriefService } from "$core/server/domains/insights";
import { publicProcedure, t } from "$core/trpc";
import { withErrorHandler } from "$core/trpc/shared/errors";
import { z } from "zod";

let serviceSingleton: PeriodBriefService | null = null;
function getService(): PeriodBriefService {
  if (!serviceSingleton) serviceSingleton = new PeriodBriefService();
  return serviceSingleton;
}

const periodBriefInput = z.object({
  period: z.enum(["week", "month"]).default("week"),
  asOf: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const insightsRoutes = t.router({
  getPeriodBrief: publicProcedure.input(periodBriefInput).query(
    withErrorHandler(async ({ ctx, input }) => {
      return getService().getPeriodBrief(ctx.workspaceId, {
        period: input.period,
        asOf: input.asOf,
      });
    })
  ),
});
