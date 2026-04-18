import type { CreateMutationOptions, CreateQueryOptions, QueryKey } from "@tanstack/svelte-query";
import { createMutation, createQuery } from "@tanstack/svelte-query";
import { TRPCError } from "@trpc/server";
import { toast } from "./_toast";
import { queryClient } from "./_client";

// Svelte 5 SSR evaluates $derived eagerly, outside component context, so
// createQuery/createMutation (which call getQueryClientContext inside $derived)
// always throw "No QueryClient found" during server-side rendering. Guard all
// .options() calls to return a loading-state stub on the server instead.
const browser = typeof window !== "undefined";

function ssrQueryStub<TData>(): any {
  return {
    data: undefined as TData | undefined,
    error: null,
    isLoading: false,
    isFetching: false,
    isPending: true,
    isError: false,
    isSuccess: false,
    status: "pending" as const,
    fetchStatus: "idle" as const,
    refetch: () => Promise.resolve({ data: undefined, error: null }),
  };
}

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
 * Configuration for defineMutation wrapper.
 *
 * `onMutate` runs BEFORE the mutation is sent to the server. Its return
 * value is threaded as `context` into the downstream `onSuccess` / `onError`
 * handlers, which is the correct place to snapshot cache entries that an
 * optimistic update is about to overwrite. On failure, `onError` receives
 * the context so the optimistic write can be rolled back without a
 * round-trip refetch.
 *
 * Example:
 *
 *   defineMutation<Input, Result, Error, { previous: Budget }>({
 *     mutationFn: (vars) => trpc().budgets.update.mutate(vars),
 *     onMutate: (vars) => {
 *       const previous = queryClient.getQueryData(budgetKeys.detail(vars.id));
 *       queryClient.setQueryData(budgetKeys.detail(vars.id), optimistic);
 *       return { previous };
 *     },
 *     onError: (err, vars, context) => {
 *       if (context?.previous) {
 *         queryClient.setQueryData(budgetKeys.detail(vars.id), context.previous);
 *       }
 *     },
 *   });
 */
export interface DefineMutationConfig<TVariables, TData, TError = Error, TContext = unknown> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  options?: CreateMutationOptions<TData, TError, TVariables, TContext>;
  /**
   * Runs before the mutation; return a context that will be threaded to
   * `onSuccess` and `onError`. Use this for optimistic cache writes and
   * capturing rollback state.
   */
  onMutate?: (variables: TVariables) => Promise<TContext> | TContext;
  onSuccess?: (
    data: TData,
    variables: TVariables,
    context: TContext | undefined
  ) => void | Promise<void>;
  onError?: (error: TError, variables: TVariables, context: TContext | undefined) => void;
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
 * Transforms service errors into TRPCError format for consistent error handling.
 *
 * `TRPCError` instances are preserved (they're already intentional, caller-
 * facing messages). Unknown `Error`s are NOT forwarded verbatim — their
 * messages can contain raw SQL, Drizzle internals, file paths, and other
 * server details that should never reach a client toast. We wrap them with
 * a generic user-facing message and attach the original as `cause` so
 * callers that care can inspect or log it themselves.
 *
 * This function does NOT log — callers already have `try/catch` paths that
 * decide what (and whether) to report. Logging here produced noisy console
 * errors for initialization-time best-effort calls that the caller handles
 * quietly.
 */
function transformError(error: unknown): TRPCError {
  if (error instanceof TRPCError) {
    return error;
  }

  if (error instanceof Error) {
    return new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
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
        if (!browser) return ssrQueryStub<TData>();
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
        }), () => queryClient);
      },

      async execute(params: TParams) {
        const queryKey = paramConfig.queryKey(params);
        try {
          // Try to get from cache first. Check `!== undefined` so truthy-
          // falsy values like `0`, `""`, or `[]` still hit the cache.
          const cachedData = queryClient.getQueryData<TData>(queryKey);
          if (cachedData !== undefined) {
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
      if (!browser) return ssrQueryStub<TData>();
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
      }), () => queryClient);
    },

    async execute() {
      try {
        // Try to get from cache first. Check `!== undefined` so truthy-
        // falsy values like `0`, `""`, or `[]` still hit the cache.
        const cachedData = queryClient.getQueryData<TData>(queryKey);
        if (cachedData !== undefined) {
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
 * Creates a mutation wrapper with dual interface pattern.
 *
 * Both `.options()` (reactive, TanStack) and `.execute()` (imperative) run
 * `onMutate → mutationFn → onSuccess | onError` with a shared `context`
 * value, so the same optimistic-write + rollback pattern works regardless
 * of which interface a caller picks.
 */
export function defineMutation<TVariables, TData, TError = Error, TContext = unknown>(
  config: DefineMutationConfig<TVariables, TData, TError, TContext>
): MutationWrapper<TVariables, TData, TError> {
  const {
    mutationFn,
    options = {},
    onMutate,
    onSuccess,
    onError,
    successMessage,
    errorMessage,
    importance = "normal",
  } = config;

  // Create the mutation with enhanced error handling and notifications.
  // The TanStack-native `onMutate → context → onError` path is wired here
  // so callers can do optimistic cache writes and roll them back on error
  // without losing the context across async hops.
  const createMutationWithConfig = () =>
    createMutation(() => ({
      mutationFn: async (variables: TVariables) => {
        try {
          return await mutationFn(variables);
        } catch (error) {
          throw transformError(error);
        }
      },
      onMutate: onMutate
        ? async (variables: TVariables) => {
            const ctx = await onMutate(variables);
            // If the caller also provided a passthrough onMutate on
            // `options`, run it too — its return value is ignored so our
            // context stays authoritative for rollback.
            if (options.onMutate) {
              await options.onMutate(variables);
            }
            return ctx;
          }
        : options.onMutate,
      onSuccess: (data: TData, variables: TVariables, context: TContext, queryClient: any) => {
        // Call custom onSuccess if provided
        if (onSuccess) {
          onSuccess(data, variables, context);
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
      onError: (error: TError, variables: TVariables, context: TContext, queryClient: any) => {
        // Call custom onError first — this is the rollback site. Running
        // before the toast/original-onError means rollback cache writes
        // land before any subscriber reads the error state.
        if (onError) {
          onError(error, variables, context);
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
    }), () => queryClient);

  return {
    options() {
      if (!browser) return ssrQueryStub<TData>();
      return createMutationWithConfig();
    },

    async execute(variables: TVariables) {
      // Imperative path: call mutationFn directly (avoids needing a
      // component-context `createMutation`). Still runs the same
      // onMutate → onSuccess|onError sequence so rollback semantics stay
      // identical across both interfaces.
      let context: TContext | undefined;

      if (onMutate) {
        // Failures inside onMutate should NOT be swallowed — an
        // optimistic-update error means the cache is in an indeterminate
        // state; surface it to the caller before trying the network call.
        try {
          context = await onMutate(variables);
        } catch (error) {
          const transformedError = transformError(error) as TError;
          if (onError) {
            onError(transformedError, variables, undefined);
          }
          throw transformedError;
        }
      }

      try {
        const result = await mutationFn(variables);

        // Call custom onSuccess if provided
        if (onSuccess) {
          await onSuccess(result, variables, context);
        }

        // Show success toast if message provided
        if (successMessage) {
          const message =
            typeof successMessage === "function"
              ? successMessage(result, variables)
              : successMessage;
          toast.success(message, { importance });
        }

        return result;
      } catch (error) {
        const transformedError = transformError(error) as TError;

        // Call custom onError if provided — receives the context captured
        // during onMutate so rollback logic can restore pre-mutation state.
        if (onError) {
          onError(transformedError, variables, context);
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
