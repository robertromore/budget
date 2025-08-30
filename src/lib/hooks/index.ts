// Export all TanStack Query hooks for oRPC integration

// Account hooks
export * from './accounts';

// Transaction hooks
export * from './transactions';

// Category hooks
export * from './categories';

// Payee hooks  
export * from './payees';

// Re-export TanStack Query utilities for convenience
export { 
  createQuery, 
  createMutation, 
  createInfiniteQuery,
  getQueryKey,
  getMutationKey 
} from '$lib/rpc/queries';

// Re-export query client utilities
export { getQueryClient } from '@tanstack/svelte-query';