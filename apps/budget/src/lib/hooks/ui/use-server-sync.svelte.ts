/**
 * Server synchronization hook for optimistic updates
 * Handles common patterns of optimistic UI updates with server sync
 */

interface UseServerSyncOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error, rollback: () => void) => void;
  optimistic?: boolean;
}

interface UseServerSyncReturn<T> {
  isLoading: boolean;
  error: Error | null;
  execute: (optimisticUpdate: () => void, serverAction: () => Promise<T>) => Promise<void>;
  clearError: () => void;
}

export function useServerSync<T>(options: UseServerSyncOptions<T> = {}): UseServerSyncReturn<T> {
  const {onSuccess, onError, optimistic = true} = options;

  let isLoading = $state(false);
  let error = $state<Error | null>(null);

  async function execute(
    optimisticUpdate: () => void,
    serverAction: () => Promise<T>
  ): Promise<void> {
    // Clear previous error
    error = null;
    isLoading = true;

    let rollbackState: (() => void) | null = null;

    try {
      if (optimistic) {
        // Store rollback function before making optimistic update
        const beforeState = createRollbackPoint();
        rollbackState = beforeState;
        optimisticUpdate();
      }

      // Execute server action
      const result = await serverAction();

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      const syncError = err instanceof Error ? err : new Error("Unknown error");
      error = syncError;

      // Rollback optimistic update on error
      if (rollbackState) {
        rollbackState();
      }

      if (onError) {
        onError(syncError, rollbackState || (() => {}));
      } else {
        throw syncError;
      }
    } finally {
      isLoading = false;
    }
  }

  function clearError() {
    error = null;
  }

  // Helper to create rollback points
  function createRollbackPoint(): () => void {
    // This would need to be implemented based on specific state management
    // For now, return a no-op function
    return () => {
      console.warn("Rollback not implemented for this state");
    };
  }

  return {
    get isLoading() {
      return isLoading;
    },
    get error() {
      return error;
    },
    execute,
    clearError,
  };
}

/**
 * Specialized server sync hook for entity operations
 */
interface UseEntitySyncOptions<T> {
  entityName: string;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export function useEntitySync<T>(options: UseEntitySyncOptions<T>): UseServerSyncReturn<T> {
  return useServerSync({
    onSuccess: options.onSuccess,
    onError: (error, rollback) => {
      console.error(`${options.entityName} operation failed:`, error);
      rollback();
      if (options.onError) {
        options.onError(error);
      }
    },
    optimistic: true,
  });
}
