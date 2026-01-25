import type { CreateMutationOptions, CreateQueryOptions, QueryKey } from "@tanstack/svelte-query";
import { createMutation, createQuery } from "@tanstack/svelte-query";
import { TRPCError } from "@trpc/server";
import { toast } from "$lib/utils/toast-interceptor";
import { queryClient } from "./_client";

/**
 * Notification importance level for filtering based on user verbosity settings
 * - critical: Always shown (e.g., account deletion, bulk operations)
 * - important: Shown in "all" and "important" modes (e.g., transaction created)
 * - normal: Only shown in "all" mode (e.g., view saved, preferences updated)
 */
export type NotificationImportance = "critical" | "important" | "normal";

/**
 * Configuration for defineQuery wrapper
 */
export interface DefineQueryConfig<TData, TError = Error> {
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
  options?: Omit<CreateQueryOptions<TData, TError>, "queryKey" | "queryFn">;
}

/**
 * Configuration for parameterized defineQuery wrapper
 */
export interface DefineParameterizedQueryConfig<TParams, TData, TError = Error> {
  queryKey: (params: TParams) => QueryKey;
  queryFn: (params: TParams) => Promise<TData>;
  enabled?: (params: TParams) => boolean;
  options?: Omit<CreateQueryOptions<TData, TError>, "queryKey" | "queryFn" | "enabled">;
}

/**
 * Configuration for defineMutation wrapper
 */
export interface DefineMutationConfig<TVariables, TData, TError = Error> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  options?: CreateMutationOptions<TData, TError, TVariables>;
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
  onError?: (error: TError, variables: TVariables) => void;
  successMessage?: string | ((data: TData, variables: TVariables) => string);
  errorMessage?: string | ((error: TError, variables: TVariables) => string);
  /** Notification importance for verbosity filtering (defaults to "normal") */
  importance?: NotificationImportance;
}

/**
 * Query wrapper that provides dual interface pattern
 */
export interface QueryWrapper<TData, TError = Error> {
  /**
   * Reactive interface - returns Svelte store for component reactivity
   * Accepts optional function returning additional options to merge with base options
   */
  options(
    additionalOptions?: () => Partial<
      Omit<CreateQueryOptions<TData, TError>, "queryKey" | "queryFn">
    >
  ): ReturnType<typeof createQuery<TData, TError>>;

  /**
   * Imperative interface - executes query and returns promise
   */
  execute(): Promise<TData>;

  /**
   * Access to underlying query key for cache operations
   */
  queryKey: QueryKey;
}

/**
 * Parameterized query wrapper that provides dual interface pattern with parameters
 */
export interface ParameterizedQueryWrapper<TParams, TData, TError = Error> {
  /**
   * Reactive interface - returns Svelte store for component reactivity
   * Accepts optional function returning additional options to merge with base options
   */
  options(
    params: TParams,
    additionalOptions?: () => Partial<
      Omit<CreateQueryOptions<TData, TError>, "queryKey" | "queryFn">
    >
  ): ReturnType<typeof createQuery<TData, TError>>;

  /**
   * Imperative interface - executes query and returns promise
   */
  execute(params: TParams): Promise<TData>;

  /**
   * Access to query key factory for cache operations
   */
  queryKey: (params: TParams) => QueryKey;
}

/**
 * Mutation wrapper that provides dual interface pattern
 */
export interface MutationWrapper<TVariables, TData, TError = Error> {
  /**
   * Reactive interface - returns Svelte store for component reactivity
   */
  options(): ReturnType<typeof createMutation<TData, TError, TVariables>>;

  /**
   * Imperative interface - executes mutation and returns promise
   */
  execute(variables: TVariables): Promise<TData>;

  /**
   * Direct access to mutateAsync for backward compatibility
   */
  mutateAsync(variables: TVariables): Promise<TData>;
}

/**
 * Transforms service errors into TRPCError format for consistent error handling
 */
function transformError(error: unknown): TRPCError {
  if (error instanceof TRPCError) {
    return error;
  }

  if (error instanceof Error) {
    return new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error.message,
      cause: error,
    });
  }

  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred",
    cause: error,
  });
}

/**
 * Creates a query wrapper with dual interface pattern
 */
export function defineQuery<TData, TError = Error>(
  config: DefineQueryConfig<TData, TError>
): QueryWrapper<TData, TError>;

/**
 * Creates a parameterized query wrapper with dual interface pattern
 */
export function defineQuery<TParams, TData, TError = Error>(
  config: DefineParameterizedQueryConfig<TParams, TData, TError>
): ParameterizedQueryWrapper<TParams, TData, TError>;

// Implementation
export function defineQuery<TParams, TData, TError = Error>(
  config: DefineQueryConfig<TData, TError> | DefineParameterizedQueryConfig<TParams, TData, TError>
): QueryWrapper<TData, TError> | ParameterizedQueryWrapper<TParams, TData, TError> {
  // Check if this is a parameterized query
  if (typeof config.queryKey === "function") {
    const paramConfig = config as DefineParameterizedQueryConfig<TParams, TData, TError>;
    return {
      queryKey: paramConfig.queryKey,

      options(
        params: TParams,
        additionalOptions?: () => Partial<
          Omit<CreateQueryOptions<TData, TError>, "queryKey" | "queryFn">
        >
      ) {
        const queryKey = paramConfig.queryKey(params);
        const enabled = paramConfig.enabled ? paramConfig.enabled(params) : true;

        return createQuery(() => ({
          queryKey,
          queryFn: async () => {
            try {
              return await paramConfig.queryFn(params);
            } catch (error) {
              throw transformError(error);
            }
          },
          enabled,
          ...paramConfig.options,
          ...(additionalOptions ? additionalOptions() : {}),
        }));
      },

      async execute(params: TParams) {
        const queryKey = paramConfig.queryKey(params);
        try {
          // Try to get from cache first
          const cachedData = queryClient.getQueryData<TData>(queryKey);
          if (cachedData) {
            return cachedData;
          }

          // Execute and cache the result
          const result = await paramConfig.queryFn(params);
          queryClient.setQueryData(queryKey, result);
          return result;
        } catch (error) {
          throw transformError(error);
        }
      },
    };
  }

  // Non-parameterized query
  const simpleConfig = config as DefineQueryConfig<TData, TError>;
  const { queryKey, queryFn, options = {} } = simpleConfig;

  return {
    queryKey,

    options(
      additionalOptions?: () => Partial<
        Omit<CreateQueryOptions<TData, TError>, "queryKey" | "queryFn">
      >
    ) {
      return createQuery(() => ({
        queryKey,
        queryFn: async () => {
          try {
            return await queryFn();
          } catch (error) {
            throw transformError(error);
          }
        },
        ...options,
        ...(additionalOptions ? additionalOptions() : {}),
      }));
    },

    async execute() {
      try {
        // Try to get from cache first
        const cachedData = queryClient.getQueryData<TData>(queryKey);
        if (cachedData) {
          return cachedData;
        }

        // Execute and cache the result
        const result = await queryFn();
        queryClient.setQueryData(queryKey, result);
        return result;
      } catch (error) {
        throw transformError(error);
      }
    },
  };
}

/**
 * Creates a mutation wrapper with dual interface pattern
 */
export function defineMutation<TVariables, TData, TError = Error>(
  config: DefineMutationConfig<TVariables, TData, TError>
): MutationWrapper<TVariables, TData, TError> {
  const { mutationFn, options = {}, onSuccess, onError, successMessage, errorMessage, importance = "normal" } = config;

  // Create the mutation with enhanced error handling and notifications
  const createMutationWithConfig = () =>
    createMutation(() => ({
      mutationFn: async (variables: TVariables) => {
        try {
          return await mutationFn(variables);
        } catch (error) {
          throw transformError(error);
        }
      },
      onSuccess: (data: TData, variables: TVariables, context: unknown, queryClient: any) => {
        // Call custom onSuccess if provided
        if (onSuccess) {
          onSuccess(data, variables);
        }

        // Show success toast if message provided
        if (successMessage) {
          const message =
            typeof successMessage === "function" ? successMessage(data, variables) : successMessage;
          toast.success(message, { importance });
        }

        // Call original onSuccess from options
        if (options.onSuccess) {
          options.onSuccess(data, variables, context, queryClient);
        }
      },
      onError: (error: TError, variables: TVariables, context: unknown, queryClient: any) => {
        // Call custom onError if provided
        if (onError) {
          onError(error, variables);
        }

        // Show error toast
        const message = errorMessage
          ? typeof errorMessage === "function"
            ? errorMessage(error, variables)
            : errorMessage
          : error instanceof Error
            ? error.message
            : "An error occurred";
        toast.error(message);

        // Call original onError from options
        if (options.onError) {
          options.onError(error, variables, context, queryClient);
        }
      },
      ...options,
    }));

  return {
    options() {
      return createMutationWithConfig();
    },

    async execute(variables: TVariables) {
      // Directly call mutationFn without createMutation to avoid context issues
      // This allows execute() to be called from event handlers outside component init
      try {
        const result = await mutationFn(variables);

        // Call custom onSuccess if provided
        if (onSuccess) {
          await onSuccess(result, variables);
        }

        // Show success toast if message provided
        if (successMessage) {
          const message =
            typeof successMessage === "function" ? successMessage(result, variables) : successMessage;
          toast.success(message, { importance });
        }

        return result;
      } catch (error) {
        const transformedError = transformError(error) as TError;

        // Call custom onError if provided
        if (onError) {
          onError(transformedError, variables);
        }

        // Show error toast
        const message = errorMessage
          ? typeof errorMessage === "function"
            ? errorMessage(transformedError, variables)
            : errorMessage
          : transformedError instanceof Error
            ? transformedError.message
            : "An error occurred";
        toast.error(message);

        throw transformedError;
      }
    },

    async mutateAsync(variables: TVariables) {
      // Alias for execute() for backward compatibility
      return this.execute(variables);
    },
  };
}

/**
 * Helper to create query key factories for consistent key management
 */
export function createQueryKeys<T extends Record<string, (...args: any[]) => QueryKey>>(
  domain: string,
  keys: T
): T & { all: () => QueryKey } {
  return {
    all: () => [domain] as const,
    ...keys,
  };
}

/**
 * Helper to create mutation key factories
 */
export function createMutationKeys(domain: string) {
  return {
    create: () => [domain, "create"] as const,
    update: () => [domain, "update"] as const,
    delete: () => [domain, "delete"] as const,
    bulkDelete: () => [domain, "bulk-delete"] as const,
  };
}
