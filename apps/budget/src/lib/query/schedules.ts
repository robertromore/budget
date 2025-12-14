import { trpc } from "$lib/trpc/client";
import { queryClient } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";
import { transactionKeys } from "./transactions";

/**
 * Query Keys for schedule operations
 */
export const scheduleKeys = createQueryKeys("schedules", {
  lists: () => ["schedules", "list"] as const,
  list: () => ["schedules", "list"] as const,
  byAccount: (accountId: number) => ["schedules", "account", accountId] as const,
  details: () => ["schedules", "detail"] as const,
  detail: (id: number) => ["schedules", "detail", id] as const,
  skipHistory: (scheduleId: number) => ["schedules", "skips", scheduleId] as const,
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

/**
 * Get skip history for a schedule
 */
export const getSkipHistory = (scheduleId: number) =>
  defineQuery({
    queryKey: scheduleKeys.skipHistory(scheduleId),
    queryFn: () => trpc().scheduleRoutes.getSkipHistory.query({ scheduleId }),
  });

/**
 * Skip an occurrence (single skip or push forward)
 */
export const skipOccurrence = () =>
  defineMutation({
    mutationFn: (input: {
      scheduleId: number;
      date: string;
      skipType: "single" | "push_forward";
      reason?: string;
    }) => trpc().scheduleRoutes.skipOccurrence.mutate(input),
    onSuccess: (_data, variables) => {
      // Invalidate skip history for this schedule
      queryClient.invalidateQueries({ queryKey: scheduleKeys.skipHistory(variables.scheduleId) });
      // Invalidate schedule detail to refresh upcoming dates
      queryClient.invalidateQueries({ queryKey: scheduleKeys.detail(variables.scheduleId) });
      // Invalidate transaction queries to refresh scheduled transaction preview
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
    },
  });

/**
 * Remove a skip (restore occurrence)
 */
export const removeSkip = () =>
  defineMutation({
    mutationFn: (input: { skipId: number; scheduleId: number }) =>
      trpc().scheduleRoutes.removeSkip.mutate({ skipId: input.skipId }),
    onSuccess: (_data, variables) => {
      // Invalidate skip history for this schedule
      queryClient.invalidateQueries({ queryKey: scheduleKeys.skipHistory(variables.scheduleId) });
      // Invalidate schedule detail to refresh upcoming dates
      queryClient.invalidateQueries({ queryKey: scheduleKeys.detail(variables.scheduleId) });
      // Invalidate transaction queries to refresh scheduled transaction preview
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
    },
  });

/**
 * Toggle schedule status (active/paused)
 */
export const toggleStatus = () =>
  defineMutation({
    mutationFn: (scheduleId: number) =>
      trpc().scheduleRoutes.toggleStatus.mutate({ scheduleId }),
    onSuccess: (updatedSchedule, scheduleId) => {
      queryClient.setQueryData(scheduleKeys.detail(scheduleId), updatedSchedule);
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.detail(scheduleId),
        refetchType: "active",
      });
    },
  });

/**
 * Execute auto-add for schedule (create pending transactions)
 */
export const executeAutoAdd = () =>
  defineMutation({
    mutationFn: (scheduleId: number) =>
      trpc().scheduleRoutes.executeAutoAdd.mutate({ scheduleId }),
    onSuccess: (_result, scheduleId) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.detail(scheduleId) });
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
    },
  });

/**
 * Delete a schedule
 */
export const remove = () =>
  defineMutation({
    mutationFn: (scheduleId: number) =>
      trpc().scheduleRoutes.remove.mutate({ id: scheduleId }),
    onSuccess: (_data, scheduleId) => {
      queryClient.removeQueries({ queryKey: scheduleKeys.detail(scheduleId) });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
    },
  });

/**
 * Duplicate a schedule
 */
export const duplicate = () =>
  defineMutation({
    mutationFn: (scheduleId: number) =>
      trpc().scheduleRoutes.duplicate.mutate({ id: scheduleId }),
    onSuccess: (duplicatedSchedule) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
      queryClient.setQueryData(scheduleKeys.detail(duplicatedSchedule.id), duplicatedSchedule);
    },
  });
