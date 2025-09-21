import {createQuery, createMutation, useQueryClient} from "@tanstack/svelte-query";
import {trpc} from "$lib/trpc/client";
import {toast} from "svelte-sonner";

/**
 * Query Keys
 */
export const scheduleKeys = {
  all: ["schedules"] as const,
  lists: () => [...scheduleKeys.all, "list"] as const,
  list: () => [...scheduleKeys.lists()] as const,
  details: () => [...scheduleKeys.all, "detail"] as const,
  detail: (id: number) => [...scheduleKeys.details(), id] as const,
};

/**
 * Query: Get schedule by ID with full details
 */
export function createScheduleDetailQuery(
  scheduleId: number,
  options?: {
    enabled?: boolean;
  }
) {
  return createQuery({
    queryKey: scheduleKeys.detail(scheduleId),
    queryFn: () => trpc().scheduleRoutes.load.query({ id: scheduleId }),
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Mutation: Toggle schedule status
 */
export function createToggleScheduleStatusMutation() {
  const queryClient = useQueryClient();

  return createMutation({
    mutationFn: (scheduleId: number) =>
      trpc().scheduleRoutes.toggleStatus.mutate({ scheduleId }),
    onSuccess: (updatedSchedule, scheduleId) => {
      // Update the detail query cache
      queryClient.setQueryData(
        scheduleKeys.detail(scheduleId),
        updatedSchedule
      );

      // Optionally invalidate to ensure fresh data
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.detail(scheduleId)
      });

      toast.success(
        `Schedule ${updatedSchedule.status === 'active' ? 'activated' : 'paused'} successfully`
      );
    },
    onError: (error) => {
      console.error('Failed to toggle schedule status:', error);
      toast.error('Failed to update schedule status');
    },
  });
}

/**
 * Mutation: Execute auto-add for schedule
 */
export function createExecuteAutoAddMutation() {
  const queryClient = useQueryClient();

  return createMutation({
    mutationFn: (scheduleId: number) =>
      trpc().scheduleRoutes.executeAutoAdd.mutate({ scheduleId }),
    onSuccess: (result, scheduleId) => {
      // Invalidate the schedule detail to refresh transaction data
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.detail(scheduleId)
      });

      if (result.transactionsCreated > 0) {
        toast.success(
          `Created ${result.transactionsCreated} transaction${result.transactionsCreated === 1 ? '' : 's'}`
        );
      } else {
        toast.info("No new transactions needed");
      }
    },
    onError: (error) => {
      console.error('Auto-add failed:', error);
      toast.error('Failed to create transactions');
    },
  });
}

/**
 * Mutation: Delete schedule
 */
export function createDeleteScheduleMutation() {
  const queryClient = useQueryClient();

  return createMutation({
    mutationFn: (scheduleId: number) =>
      trpc().scheduleRoutes.remove.mutate({ id: scheduleId }),
    onSuccess: (_, scheduleId) => {
      // Remove the schedule from all caches
      queryClient.removeQueries({
        queryKey: scheduleKeys.detail(scheduleId)
      });

      // Invalidate the schedules list to refresh
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.lists()
      });

      toast.success('Schedule deleted successfully');
    },
    onError: (error) => {
      console.error('Failed to delete schedule:', error);
      toast.error('Failed to delete schedule');
    },
  });
}

/**
 * Mutation: Duplicate schedule
 */
export function createDuplicateScheduleMutation() {
  const queryClient = useQueryClient();

  return createMutation({
    mutationFn: (scheduleId: number) =>
      trpc().scheduleRoutes.duplicate.mutate({ id: scheduleId }),
    onSuccess: (duplicatedSchedule) => {
      // Invalidate the schedules list to show the new duplicate
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.lists()
      });

      // Add the new schedule to the detail cache
      queryClient.setQueryData(
        scheduleKeys.detail(duplicatedSchedule.id),
        duplicatedSchedule
      );

      toast.success(`Schedule duplicated as "${duplicatedSchedule.name}"`);
    },
    onError: (error) => {
      console.error('Failed to duplicate schedule:', error);
      toast.error('Failed to duplicate schedule');
    },
  });
}