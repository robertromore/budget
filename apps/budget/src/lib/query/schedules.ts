import { defineQuery, defineMutation, createQueryKeys } from "./_factory";
import { trpc } from "$lib/trpc/client";

/**
 * Query Keys for schedule operations
 */
export const scheduleKeys = createQueryKeys("schedules", {
  lists: () => ["schedules", "list"] as const,
  list: () => ["schedules", "list"] as const,
  byAccount: (accountId: number) => ["schedules", "account", accountId] as const,
  details: () => ["schedules", "detail"] as const,
  detail: (id: number) => ["schedules", "detail", id] as const,
});

/**
 * Get all schedules
 */
export const getAll = () =>
  defineQuery({
    queryKey: scheduleKeys.list(),
    queryFn: () => trpc().scheduleRoutes.all.query(),
  });

/**
 * Get schedules for a specific account
 */
export const getByAccount = (accountId: number) =>
  defineQuery({
    queryKey: scheduleKeys.byAccount(accountId),
    queryFn: () => trpc().scheduleRoutes.getByAccount.query({ accountId }),
  });

/**
 * Get a single schedule by ID
 */
export const getById = (id: number) =>
  defineQuery({
    queryKey: scheduleKeys.detail(id),
    queryFn: () => trpc().scheduleRoutes.load.query({ id }),
  });
