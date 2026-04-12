import {
  deleteSnapshot,
  listSnapshots,
  saveSnapshot,
} from "$core/server/domains/investment-snapshots";
import { publicProcedure, rateLimitedProcedure, t } from "$core/trpc";
import { translateDomainError } from "$core/trpc/shared/errors";
import { z } from "zod/v4";

export const investmentSnapshotsRoutes = t.router({
  // List all value snapshots for an investment account, ordered by date ascending.
  list: publicProcedure
    .input(z.object({ accountId: z.number().positive() }))
    .query(async ({ input, ctx }) => {
      try {
        return await listSnapshots(input.accountId, ctx.workspaceId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  // Upsert a value snapshot for an investment account on a specific date.
  save: rateLimitedProcedure
    .input(
      z.object({
        accountId: z.number().positive(),
        snapshotDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
        value: z.number().min(0, "Value cannot be negative"),
        notes: z.string().max(500).optional().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await saveSnapshot(
          input.accountId,
          ctx.workspaceId,
          input.snapshotDate,
          input.value,
          input.notes
        );
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  // Delete a value snapshot by id.
  delete: rateLimitedProcedure
    .input(
      z.object({
        id: z.number().positive(),
        accountId: z.number().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await deleteSnapshot(input.id, input.accountId, ctx.workspaceId);
        return { success: true };
      } catch (error) {
        throw translateDomainError(error);
      }
    }),
});
