import type { PriceProduct } from "$core/schema/price-products";
import type { PriceRetailer } from "$core/schema/price-retailers";
import type { PriceHistoryEntry } from "$core/schema/price-history";
import type { PriceAlert } from "$core/schema/price-alerts";
import { trpc } from "$core/trpc/client-factory";
import { cachePatterns } from "./_client";
import { defineMutation, defineQuery } from "./_factory";
import { toast } from "./_toast";

interface ProductPreview {
  url: string;
  retailer: string;
  retailerLogoUrl: string | null;
  name: string | null;
  price: number | null;
  currency: string | null;
  imageUrl: string | null;
  description: string | null;
  inStock: boolean;
}

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

export const previewUrl = defineMutation<{ url: string }, ProductPreview>({
  mutationFn: (params) => trpc().priceWatcherRoutes.previewUrl.mutate(params),
  errorMessage: "Failed to fetch product info",
});

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

export const bulkDeleteProducts = defineMutation<{ ids: number[] }, { count: number }>({
  mutationFn: (params) => trpc().priceWatcherRoutes.bulkDeleteProducts.mutate(params),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(["price-watcher"]);
  },
  successMessage: (result) => `${result.count} products deleted`,
  errorMessage: "Failed to delete products",
  importance: "critical",
});

export const bulkUpdateStatus = defineMutation<
  { ids: number[]; status: "active" | "paused" },
  { count: number }
>({
  mutationFn: (params) => trpc().priceWatcherRoutes.bulkUpdateStatus.mutate(params),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(["price-watcher"]);
  },
  successMessage: (result, variables) =>
    `${result.count} products ${variables.status === "paused" ? "paused" : "activated"}`,
  errorMessage: "Failed to update products",
});

export const bulkCheckPrices = defineMutation<
  { ids: number[] },
  { checked: number; errors: number }
>({
  mutationFn: (params) => trpc().priceWatcherRoutes.bulkCheckPrices.mutate(params),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(["price-watcher"]);
  },
  successMessage: (result) =>
    result.errors > 0
      ? `${result.checked} checked, ${result.errors} failed`
      : `${result.checked} prices checked`,
  errorMessage: "Failed to check prices",
});

export const checkPriceNow = defineMutation<{ productId: number }, PriceProduct>({
  mutationFn: (params) => trpc().priceWatcherRoutes.checkPriceNow.mutate(params),
  onSuccess: (result) => {
    cachePatterns.invalidatePrefix(["price-watcher"]);
    if (result.status === "error") {
      toast.error(`Check failed: ${result.errorMessage ?? "could not extract price"}`);
    } else {
      toast.success(
        result.currentPrice !== null
          ? `Price checked: $${result.currentPrice}`
          : "Price checked"
      );
    }
  },
  errorMessage: "Failed to check price",
});

export const refreshProductInfo = defineMutation<{ productId: number }, PriceProduct>({
  mutationFn: (params) => trpc().priceWatcherRoutes.refreshProductInfo.mutate(params),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(["price-watcher"]);
  },
  successMessage: "Product info refreshed",
  errorMessage: "Failed to refresh product info",
});

export const checkPriceWithBrowser = defineMutation<{ productId: number }, PriceProduct>({
  mutationFn: (params) => trpc().priceWatcherRoutes.checkPriceWithBrowser.mutate(params),
  onSuccess: (result) => {
    cachePatterns.invalidatePrefix(["price-watcher"]);
    if (result.status === "error") {
      toast.error(`Browser check failed: ${result.errorMessage ?? "could not extract price"}`);
    } else {
      toast.success(
        result.currentPrice !== null
          ? `Price checked: $${result.currentPrice}`
          : "Price checked with browser"
      );
    }
  },
  errorMessage: "Failed to check price with browser",
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

// ─── Manual Price Entry ─────────────────────────────────

export const logManualPrice = defineMutation<
  { productId: number; price: number; inStock?: boolean },
  PriceProduct
>({
  mutationFn: (params) => trpc().priceWatcherRoutes.logManualPrice.mutate(params),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(["price-watcher"]);
  },
  successMessage: "Price logged",
  errorMessage: "Failed to log price",
});

// ─── Retailers ─────────────────────────────────

const retailerKeys = {
  all: () => ["price-watcher", "retailers"] as const,
};

export const listRetailers = () =>
  defineQuery<PriceRetailer[]>({
    queryKey: retailerKeys.all(),
    queryFn: () => trpc().priceWatcherRoutes.listRetailers.query(),
    options: { staleTime: 60_000 },
  });

export const updateRetailer = defineMutation<
  { id: number; data: { name?: string; logoUrl?: string | null; website?: string | null; notes?: string | null; color?: string | null } },
  PriceRetailer
>({
  mutationFn: (params) => trpc().priceWatcherRoutes.updateRetailer.mutate(params),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(retailerKeys.all());
    cachePatterns.invalidatePrefix(priceWatcherKeys.products());
  },
  successMessage: "Retailer updated",
  errorMessage: "Failed to update retailer",
});

// ─── Tags ─────────────────────────────────

const tagKeys = {
  all: () => ["price-watcher", "tags"] as const,
  product: (productId: number) => ["price-watcher", "tags", productId] as const,
};

export const getAllTags = () =>
  defineQuery<Array<{ tag: string; count: number }>>({
    queryKey: tagKeys.all(),
    queryFn: () => trpc().priceWatcherRoutes.getAllTags.query(),
    options: { staleTime: 30_000 },
  });

export const getProductTags = (productId: number) =>
  defineQuery<string[]>({
    queryKey: tagKeys.product(productId),
    queryFn: () => trpc().priceWatcherRoutes.getProductTags.query({ productId }),
  });

export const getProductIdsByTags = (tags: string[]) =>
  defineQuery<number[]>({
    queryKey: [...tagKeys.all(), "byTags", tags] as const,
    queryFn: () => trpc().priceWatcherRoutes.getProductIdsByTags.query({ tags }),
    options: { enabled: tags.length > 0 },
  });

export const addTag = defineMutation<{ productId: number; tag: string }, void>({
  mutationFn: (params) => trpc().priceWatcherRoutes.addTag.mutate(params),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(tagKeys.all());
  },
  successMessage: "Tag added",
  errorMessage: "Failed to add tag",
});

export const removeTag = defineMutation<{ productId: number; tag: string }, void>({
  mutationFn: (params) => trpc().priceWatcherRoutes.removeTag.mutate(params),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(tagKeys.all());
  },
  successMessage: "Tag removed",
  errorMessage: "Failed to remove tag",
});

// ─── Lists ─────────────────────────────────

import type {
  PriceProductList,
  PriceProductListItem,
  PriceProductListKind,
} from "$core/schema/price-product-lists";
import type { ListProductWithNotes } from "$core/server/domains/price-watcher/list-service";

const listKeys = {
  all: () => ["price-watcher", "lists"] as const,
  byKind: (kind: PriceProductListKind) =>
    ["price-watcher", "lists", "by-kind", kind] as const,
  products: (listId: number) => ["price-watcher", "lists", listId, "products"] as const,
  productLists: (productId: number) => ["price-watcher", "product-lists", productId] as const,
};

export const getAllLists = (kind?: PriceProductListKind) =>
  defineQuery<Array<PriceProductList & { itemCount: number }>>({
    queryKey: kind ? listKeys.byKind(kind) : listKeys.all(),
    queryFn: () =>
      trpc().priceWatcherRoutes.getAllLists.query(kind ? { kind } : undefined),
    options: { staleTime: 30_000 },
  });

/** Convenience wrapper — a saved product comparison is a `kind=comparison` list. */
export const getComparisons = () => getAllLists("comparison");

export const getProductLists = (productId: number) =>
  defineQuery<PriceProductList[]>({
    queryKey: listKeys.productLists(productId),
    queryFn: () => trpc().priceWatcherRoutes.getProductLists.query({ productId }),
  });

export const getListProducts = (listId: number) =>
  defineQuery<ListProductWithNotes[]>({
    queryKey: listKeys.products(listId),
    queryFn: () => trpc().priceWatcherRoutes.getListProducts.query({ listId }),
  });

export const createList = defineMutation<
  { name: string; description?: string | null; kind?: PriceProductListKind },
  PriceProductList
>({
  mutationFn: (params) => trpc().priceWatcherRoutes.createList.mutate(params),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(listKeys.all());
  },
  successMessage: "List created",
  errorMessage: "Failed to create list",
});

/**
 * Create a comparison-kind list. Thin wrapper around `createList` with
 * `kind: "comparison"` baked in so the compare page doesn't have to
 * remember the discriminator.
 */
export const createComparison = defineMutation<
  { name: string; description?: string | null },
  PriceProductList
>({
  mutationFn: (params) =>
    trpc().priceWatcherRoutes.createList.mutate({ ...params, kind: "comparison" }),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(listKeys.all());
  },
  successMessage: "Comparison saved",
  errorMessage: "Failed to save comparison",
});

/**
 * Set the per-item notes on a list membership. Used by the comparison
 * view to attach decision context ("noisy per reviews") to a specific
 * product within a specific comparison.
 */
export const setListItemNotes = defineMutation<
  { listId: number; productId: number; notes: string | null },
  PriceProductListItem
>({
  mutationFn: (params) => trpc().priceWatcherRoutes.setListItemNotes.mutate(params),
  onSuccess: (_result, variables) => {
    cachePatterns.invalidatePrefix(listKeys.products(variables.listId));
  },
  errorMessage: "Failed to save notes",
});

export const updateList = defineMutation<
  { id: number; data: { name?: string; description?: string | null } },
  PriceProductList
>({
  mutationFn: (params) => trpc().priceWatcherRoutes.updateList.mutate(params),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(listKeys.all());
  },
  successMessage: "List updated",
  errorMessage: "Failed to update list",
});

export const deleteList = defineMutation<{ id: number }, void>({
  mutationFn: (params) => trpc().priceWatcherRoutes.deleteList.mutate(params),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(listKeys.all());
  },
  successMessage: "List deleted",
  errorMessage: "Failed to delete list",
});

export const addToList = defineMutation<{ listId: number; productId: number }, void>({
  mutationFn: (params) => trpc().priceWatcherRoutes.addToList.mutate(params),
  onSuccess: (_result, variables) => {
    cachePatterns.invalidatePrefix(listKeys.all());
    cachePatterns.invalidatePrefix(listKeys.products(variables.listId));
    cachePatterns.invalidatePrefix(["price-watcher", "product-lists"]);
  },
  successMessage: "Added to list",
  errorMessage: "Failed to add to list",
});

/**
 * Bulk-add multiple products to a list in one round-trip. Same cache
 * invalidations as `addToList` — one call regardless of batch size.
 * Silent on success (caller typically surfaces its own toast, e.g.
 * "Comparison saved").
 */
export const addManyToList = defineMutation<
  { listId: number; productIds: number[] },
  { added: number }
>({
  mutationFn: (params) => trpc().priceWatcherRoutes.addManyToList.mutate(params),
  onSuccess: (_result, variables) => {
    cachePatterns.invalidatePrefix(listKeys.all());
    cachePatterns.invalidatePrefix(listKeys.products(variables.listId));
    cachePatterns.invalidatePrefix(["price-watcher", "product-lists"]);
  },
  errorMessage: "Failed to add products to list",
});

export const removeFromList = defineMutation<{ listId: number; productId: number }, void>({
  mutationFn: (params) => trpc().priceWatcherRoutes.removeFromList.mutate(params),
  onSuccess: (_result, variables) => {
    cachePatterns.invalidatePrefix(listKeys.all());
    cachePatterns.invalidatePrefix(listKeys.products(variables.listId));
    cachePatterns.invalidatePrefix(["price-watcher", "product-lists"]);
  },
  successMessage: "Removed from list",
  errorMessage: "Failed to remove from list",
});
