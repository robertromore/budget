<script lang="ts">
  /**
   * Side-by-side product cards for the compare page. One column per
   * selected product (max 6). Complements the overlay chart below
   * and the decision-helper summary above — the chart shows history,
   * this shows snapshot specs and per-item notes.
   *
   * For ephemeral compares (`?products=...` URL mode), notes fields
   * are hidden. For saved comparisons (`?list=...`), notes are shown
   * and debounce-saved via `onNotesChange`.
   */
  import type { PriceProduct } from "$core/schema/price-products";
  import type { PriceRetailer } from "$core/schema/price-retailers";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Textarea } from "$lib/components/ui/textarea";
  import { currencyFormatter } from "$lib/utils/formatters";
  import { cn } from "$lib/utils";
  import ProductImage from "./product-image.svelte";
  import RetailerBadge from "./retailer-badge.svelte";
  import Pause from "@lucide/svelte/icons/pause";
  import AlertTriangle from "@lucide/svelte/icons/alert-triangle";
  import TrendingDown from "@lucide/svelte/icons/trending-down";
  import TrendingUp from "@lucide/svelte/icons/trending-up";
  import X from "@lucide/svelte/icons/x";

  /**
   * `listNotes` is populated when the products come from a saved
   * comparison (server join on `price_product_list_item.notes`).
   * Undefined / null means "no notes."
   */
  export type ComparisonProduct = PriceProduct & { listNotes?: string | null };

  let {
    products,
    retailersById,
    editableNotes = false,
    onRemove,
    onNotesChange,
  }: {
    products: ComparisonProduct[];
    retailersById: Map<number, PriceRetailer>;
    /** When true, renders per-column notes textareas and "Remove" buttons. */
    editableNotes?: boolean;
    onRemove?: (productId: number) => void;
    /** Fires on change; the caller is responsible for debouncing. */
    onNotesChange?: (productId: number, notes: string) => void;
  } = $props();

  function priceChangePct(product: PriceProduct): number | null {
    if (
      product.currentPrice === null ||
      product.highestPrice === null ||
      product.highestPrice === 0
    ) {
      return null;
    }
    return ((product.currentPrice - product.highestPrice) / product.highestPrice) * 100;
  }

  function priceProgress(product: PriceProduct): number | null {
    if (
      product.lowestPrice === null ||
      product.highestPrice === null ||
      product.currentPrice === null
    ) {
      return null;
    }
    const range = product.highestPrice - product.lowestPrice;
    if (range === 0) return 50;
    return Math.max(
      0,
      Math.min(100, ((product.currentPrice - product.lowestPrice) / range) * 100)
    );
  }

  function targetPosition(product: PriceProduct): number | null {
    if (
      product.targetPrice === null ||
      product.lowestPrice === null ||
      product.highestPrice === null
    ) {
      return null;
    }
    const range = product.highestPrice - product.lowestPrice;
    if (range === 0) return null;
    return Math.max(
      0,
      Math.min(100, ((product.targetPrice - product.lowestPrice) / range) * 100)
    );
  }

  function isAtTarget(product: PriceProduct): boolean {
    return (
      product.currentPrice !== null &&
      product.targetPrice !== null &&
      product.currentPrice <= product.targetPrice
    );
  }
</script>

{#if products.length > 0}
  <div
    class="grid gap-3"
    style="grid-template-columns: repeat({Math.min(products.length, 6)}, minmax(200px, 1fr));"
  >
    {#each products as product (product.id)}
      {@const retailer = product.retailerId ? retailersById.get(product.retailerId) : undefined}
      {@const change = priceChangePct(product)}
      {@const progress = priceProgress(product)}
      {@const targetPos = targetPosition(product)}
      <div class="relative flex flex-col rounded-md border bg-card p-3">
        {#if editableNotes && onRemove}
          <!-- Remove button top-right; keeps the same overlap pattern as
               other action-bearing cards in the app. -->
          <Button
            variant="ghost"
            size="icon"
            class="absolute right-1 top-1 h-6 w-6"
            title="Remove from comparison"
            onclick={() => onRemove?.(product.id)}
          >
            <X class="h-3.5 w-3.5" />
          </Button>
        {/if}

        <a
          href="/price-watcher/products/{product.slug}"
          class="flex flex-col items-center gap-2 pb-2"
        >
          <ProductImage imageUrl={product.imageUrl} alt={product.name} size="md" />
          <div class="w-full text-center">
            <div
              class="line-clamp-2 text-sm font-medium leading-tight"
              title={product.name}
            >
              {product.name}
            </div>
            <div class="mt-1 flex justify-center">
              {#if retailer}
                <RetailerBadge name={retailer.name} logoUrl={retailer.logoUrl} />
              {:else}
                <span class="text-muted-foreground text-xs capitalize">
                  {product.retailer}
                </span>
              {/if}
            </div>
          </div>
        </a>

        <!-- Status / alert badges -->
        <div class="mb-2 flex flex-wrap items-center justify-center gap-1">
          {#if product.status === "error"}
            <Badge variant="destructive" class="text-[10px]">Error</Badge>
          {:else if product.status === "paused"}
            <Badge variant="secondary" class="text-[10px]">
              <Pause class="mr-1 h-3 w-3" />Paused
            </Badge>
          {:else if isAtTarget(product)}
            <Badge class="bg-success text-[10px] text-white">Target</Badge>
          {/if}
        </div>

        <!-- Current price -->
        <div class="flex items-baseline justify-center gap-2">
          <span class="text-xl font-bold">
            {product.currentPrice !== null
              ? currencyFormatter.format(product.currentPrice)
              : "—"}
          </span>
          {#if change !== null && change !== 0}
            <span
              class={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                change < 0 ? "text-success" : "text-destructive"
              )}
            >
              {#if change < 0}
                <TrendingDown class="h-3 w-3" />
              {:else}
                <TrendingUp class="h-3 w-3" />
              {/if}
              {Math.abs(change).toFixed(0)}%
            </span>
          {/if}
        </div>

        <!-- Price range bar -->
        {#if progress !== null}
          <div class="mt-2">
            <div class="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                class="bg-info absolute left-0 top-0 h-full rounded-full transition-all"
                style="width: {progress}%"
              ></div>
              {#if targetPos !== null}
                <div
                  class="bg-success absolute top-0 h-full w-0.5"
                  style="left: {targetPos}%"
                ></div>
              {/if}
            </div>
            <div class="text-muted-foreground mt-1 flex justify-between text-[10px]">
              <span>
                {product.lowestPrice !== null
                  ? currencyFormatter.format(product.lowestPrice)
                  : ""}
              </span>
              <span>
                {product.highestPrice !== null
                  ? currencyFormatter.format(product.highestPrice)
                  : ""}
              </span>
            </div>
          </div>
        {/if}

        {#if product.targetPrice !== null}
          <p class="text-muted-foreground mt-2 text-center text-[10px]">
            Target: {currencyFormatter.format(product.targetPrice)}
          </p>
        {/if}

        {#if product.status === "error" && product.errorMessage}
          <div class="text-destructive mt-2 flex items-start gap-1 text-[10px]">
            <AlertTriangle class="mt-0.5 h-3 w-3 shrink-0" />
            <span class="line-clamp-2">{product.errorMessage}</span>
          </div>
        {/if}

        {#if editableNotes}
          <div class="mt-3">
            <label
              for="notes-{product.id}"
              class="text-muted-foreground mb-1 block text-[10px] font-medium uppercase tracking-wide"
            >
              Notes
            </label>
            <Textarea
              id="notes-{product.id}"
              rows={3}
              class="text-xs"
              placeholder="Deciding factors for this product…"
              value={product.listNotes ?? ""}
              oninput={(event) => {
                const target = event.currentTarget as HTMLTextAreaElement;
                onNotesChange?.(product.id, target.value);
              }}
            />
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}
