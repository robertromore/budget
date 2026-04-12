import { captureSnapshot, getHistory, getOrCreateTodaySnapshot } from "$core/server/domains/net-worth";
import { publicProcedure, rateLimitedProcedure, t } from "$core/trpc";
import { translateDomainError } from "$core/trpc/shared/errors";
import { z } from "zod";

export const netWorthRoutes = t.router({
  // Returns net worth history for the last N months.
  // Lazily captures today's snapshot before fetching, ensuring the current
  // day is always represented without a background job.
  history: publicProcedure
    .input(z.object({ months: z.number().int().min(1).max(60).default(12) }))
    .query(async ({ input, ctx }) => {
      try {
        await getOrCreateTodaySnapshot(ctx.workspaceId);
        return await getHistory(ctx.workspaceId, input.months);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  // Manually re-capture today's snapshot (e.g., after bulk account changes).
  captureSnapshot: rateLimitedProcedure.mutation(async ({ ctx }) => {
    try {
      return await captureSnapshot(ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),
});
