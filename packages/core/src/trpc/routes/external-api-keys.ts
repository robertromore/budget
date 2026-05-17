/**
 * External API Keys tRPC routes
 *
 * Drives the Settings → External Agents UI. Create / list / revoke
 * bearer tokens that external MCP clients (Claude Desktop, Codex)
 * use to authenticate against /api/mcp.
 */

import { externalApiKeyScopeSchema } from "$core/schema/external-api-keys";
import {
  generateApiKey,
  listApiKeys,
  revokeApiKey,
} from "$core/server/external-agents/api-key-service";
import { publicProcedure, secureOperationProcedure, t } from "$core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

export const externalApiKeysRoutes = t.router({
  list: publicProcedure.query(async ({ ctx }) => {
    const rows = await listApiKeys(ctx.workspaceId);
    // Never include keyHash in API responses; the prefix is enough for
    // the UI to identify which key is which.
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      keyPrefix: row.keyPrefix,
      scope: row.scope,
      lastUsedAt: row.lastUsedAt,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt,
      createdAt: row.createdAt,
    }));
  }),

  /**
   * Create a key and return the plaintext exactly once.
   * `secureOperationProcedure` because this is the only moment the
   * plaintext leaves the server.
   */
  create: secureOperationProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        scope: externalApiKeyScopeSchema,
        expiresAt: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}/)
          .optional()
          .nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign-in required." });
      }
      const { plaintextKey, record } = await generateApiKey({
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        name: input.name,
        scope: input.scope,
        expiresAt: input.expiresAt ?? null,
      });
      return {
        plaintextKey,
        key: {
          id: record.id,
          name: record.name,
          keyPrefix: record.keyPrefix,
          scope: record.scope,
          lastUsedAt: record.lastUsedAt,
          expiresAt: record.expiresAt,
          revokedAt: record.revokedAt,
          createdAt: record.createdAt,
        },
      };
    }),

  revoke: secureOperationProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const revoked = await revokeApiKey(input.id, ctx.workspaceId);
      if (!revoked) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Key not found or already revoked.",
        });
      }
      return { id: input.id, revokedAt: new Date().toISOString() };
    }),
});
