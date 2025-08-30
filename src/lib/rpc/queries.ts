import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { orpcClient } from "$lib/rpc/client";

// Create the TanStack Query integration
export const orpcQuery = createTanstackQueryUtils(orpcClient);

// Export specific query utilities
export const {
  createQuery,
  createMutation,
  createInfiniteQuery,
  getQueryKey,
  getMutationKey,
} = orpcQuery;