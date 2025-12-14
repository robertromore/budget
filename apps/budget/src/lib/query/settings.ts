import { trpc } from "$lib/trpc/client";
import { queryClient } from "./_client";
import { defineMutation } from "./_factory";

interface DeleteAllDataResult {
  deleted: number;
  tables: string[];
}

/**
 * Delete all data from all user tables
 * This is a destructive operation that cannot be undone
 */
export const deleteAllData = defineMutation<void, DeleteAllDataResult>({
  mutationFn: () => trpc().settingsRoutes.deleteAllData.mutate(),
  successMessage: (result) => `Deleted data from ${result.deleted} tables`,
  errorMessage: "Failed to delete data",
  onSuccess: () => {
    // Clear the entire query cache since all data is gone
    queryClient.clear();
  },
});

// Convenience namespace export for organized access
export const Settings = {
  deleteAllData,
};
