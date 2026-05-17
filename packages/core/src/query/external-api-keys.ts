/**
 * External Agent API Keys — query layer.
 *
 * Backs the Settings → External Agents page. Lists existing keys,
 * creates new ones (server returns the plaintext exactly once), and
 * revokes.
 */

import type { ExternalApiKeyScope } from "$core/schema/external-api-keys";
import { trpc } from "$core/trpc/client-factory";
import { cachePatterns } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

export const externalApiKeysKeys = createQueryKeys("external-api-keys", {
  list: () => ["external-api-keys", "list"] as const,
});

export interface ExternalApiKeyView {
  id: number;
  name: string;
  keyPrefix: string;
  scope: ExternalApiKeyScope;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export const listApiKeys = () =>
  defineQuery<ExternalApiKeyView[]>({
    queryKey: externalApiKeysKeys.list(),
    queryFn: () => trpc().externalApiKeysRoutes.list.query(),
    options: {
      staleTime: 30 * 1000,
    },
  });

export const createApiKey = () =>
  defineMutation<
    { name: string; scope: ExternalApiKeyScope; expiresAt?: string | null },
    { plaintextKey: string; key: ExternalApiKeyView }
  >({
    mutationFn: (input) => trpc().externalApiKeysRoutes.create.mutate(input),
    onSuccess: () => {
      cachePatterns.invalidatePrefix(externalApiKeysKeys.list());
    },
    successMessage: "API key created. Copy it now — it won't be shown again.",
    errorMessage: "Failed to create key",
  });

export const revokeApiKey = () =>
  defineMutation<{ id: number }, { id: number; revokedAt: string }>({
    mutationFn: (input) => trpc().externalApiKeysRoutes.revoke.mutate(input),
    onSuccess: () => {
      cachePatterns.invalidatePrefix(externalApiKeysKeys.list());
    },
    successMessage: "Key revoked",
    errorMessage: "Failed to revoke key",
  });
