import type { TopCategoryData, TransactionsFormat } from "$lib/types";
import { Context } from "runed";
import type { CurrentViewsState } from "./current-views.svelte";

/**
 * Factory function to create a view context for a specific table type
 *
 * @param key - Unique key for this context
 * @returns A Context instance for managing views of type TData
 *
 * @example
 * ```ts
 * const txContext = createViewContext<TransactionsFormat>("transaction_views");
 * const catContext = createViewContext<TopCategoryData>("category_views");
 * ```
 */
export function createViewContext<TData>(key: string) {
  return new Context<CurrentViewsState<TData>>(key);
}

/**
 * Pre-defined context for transaction table views
 */
export const transactionViewsContext = createViewContext<TransactionsFormat>("transaction_views");

/**
 * Pre-defined context for top categories table views
 */
export const categoryViewsContext = createViewContext<TopCategoryData>("category_views");

/**
 * Type-safe context getter helper
 *
 * @param context - The context to get the value from
 * @returns The context value or undefined
 */
export function getViewContext<TData>(context: Context<CurrentViewsState<TData>>) {
  return context.get();
}

/**
 * Type-safe context setter helper
 *
 * @param context - The context to set the value in
 * @param value - The value to set
 */
export function setViewContext<TData>(
  context: Context<CurrentViewsState<TData>>,
  value: CurrentViewsState<TData>
) {
  context.set(value);
}
