import type { PriceProduct } from "$core/schema/price-products";
import type { PriceHistoryEntry } from "$core/schema/price-history";
import type { PriceAlert } from "$core/schema/price-alerts";
import { trpc } from "$core/trpc/client-factory";
import { cachePatterns } from "./_client";
import { defineMutation, defineQuery } from "./_factory";

/**
 * Query Keys for price watcher operations
 */
const priceWatcherKeys = {
  products: () => ["price-watcher", "products"] as const,
  product: (slug: string) => ["price-watcher", "product", slug] as const,
  history: (productId: number) => ["price-watcher", "history", productId] as const,
  alerts: () => ["price-watcher", "alerts"] as const,
  alertsByProduct: (productId: number) => ["price-watcher", "alerts", productId] as const,
};

// ─── Product Queries ─────────────────────────────────

export const listProducts = (filters?: { status?: "active" | "paused" | "error"; retailer?: string }) =>
  defineQuery<PriceProduct[]>({
    queryKey: [...priceWatcherKeys.products(), filters] as const,
    queryFn: () => trpc().priceWatcherRoutes.listProducts.query(filters),
    options: { staleTime: 30_000 },
  });

export const getProduct = (slug: string) =>
  defineQuery<PriceProduct | null>({
    queryKey: priceWatcherKeys.product(slug),
    queryFn: () => trpc().priceWatcherRoutes.getProduct.query({ slug }),
  });

export const getPriceHistory = (
  productId: number,
  dateRange?: { dateFrom?: string; dateTo?: string }
) =>
  defineQuery<PriceHistoryEntry[]>({
    queryKey: [...priceWatcherKeys.history(productId), dateRange] as const,
    queryFn: () =>
      trpc().priceWatcherRoutes.getPriceHistory.query({
        productId,
        ...dateRange,
      }),
    options: { staleTime: 60_000 },
  });

// ─── Product Mutations ─────────────────────────────────

export const addProduct = defineMutation<
  { url: string; targetPrice?: number; checkInterval?: number },
  PriceProduct
>({
  mutationFn: (params) => trpc().priceWatcherRoutes.addProduct.mutate(params),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(priceWatcherKeys.products());
  },
  successMessage: "Product added",
  errorMessage: "Failed to add product",
});

export const updateProduct = defineMutation<
  { id: number; data: { targetPrice?: number | null; checkInterval?: number; status?: "active" | "paused"; notes?: string | null; name?: string } },
  PriceProduct
>({
  mutationFn: (params) => trpc().priceWatcherRoutes.updateProduct.mutate(params),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(["price-watcher"]);
  },
  successMessage: "Product updated",
  errorMessage: "Failed to update product",
});

export const deleteProduct = defineMutation<{ id: number }, void>({
  mutationFn: (params) => trpc().priceWatcherRoutes.deleteProduct.mutate(params),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(priceWatcherKeys.products());
  },
  successMessage: "Product deleted",
  errorMessage: "Failed to delete product",
});

export const checkPriceNow = defineMutation<{ productId: number }, PriceProduct>({
  mutationFn: (params) => trpc().priceWatcherRoutes.checkPriceNow.mutate(params),
  onSuccess: (_result, variables) => {
    cachePatterns.invalidatePrefix(["price-watcher"]);
  },
  successMessage: "Price checked",
  errorMessage: "Failed to check price",
});

// ─── Alert Queries ─────────────────────────────────

export const listAlerts = (productId?: number) =>
  defineQuery<PriceAlert[]>({
    queryKey: productId
      ? priceWatcherKeys.alertsByProduct(productId)
      : priceWatcherKeys.alerts(),
    queryFn: () =>
      trpc().priceWatcherRoutes.listAlerts.query(
        productId ? { productId } : undefined
      ),
  });

// ─── Alert Mutations ─────────────────────────────────

export const createAlert = defineMutation<
  { productId: number; type: "price_drop" | "target_reached" | "back_in_stock" | "any_change"; threshold?: number | null; enabled?: boolean },
  PriceAlert
>({
  mutationFn: (params) => trpc().priceWatcherRoutes.createAlert.mutate(params),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(priceWatcherKeys.alerts());
  },
  successMessage: "Alert created",
  errorMessage: "Failed to create alert",
});

export const updateAlert = defineMutation<
  { id: number; data: { type?: "price_drop" | "target_reached" | "back_in_stock" | "any_change"; threshold?: number | null; enabled?: boolean } },
  PriceAlert
>({
  mutationFn: (params) => trpc().priceWatcherRoutes.updateAlert.mutate(params),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(priceWatcherKeys.alerts());
  },
  successMessage: "Alert updated",
  errorMessage: "Failed to update alert",
});

export const deleteAlert = defineMutation<{ id: number }, void>({
  mutationFn: (params) => trpc().priceWatcherRoutes.deleteAlert.mutate(params),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(priceWatcherKeys.alerts());
  },
  successMessage: "Alert deleted",
  errorMessage: "Failed to delete alert",
});
