<script lang="ts">
  /**
   * Decision-helper stats panel for the compare page. Pure derivation
   * from the products + their histories — no tRPC calls, no mutations,
   * no state. If any stat can't be computed for the current input
   * (e.g. no product has a target, all histories are empty), its card
   * is hidden rather than showing a misleading "—".
   *
   * Stats are deliberately a one-line summary each ("Cheapest: Foo,
   * $120") rather than a chart — the side-by-side cards above and the
   * overlay chart below already carry the detail.
   */
  import type { PriceProduct } from "$core/schema/price-products";
  import type { PriceHistoryEntry } from "$core/schema/price-history";
  import { currencyFormatter } from "$lib/utils/formatters";
  import { calculateBasicStats } from "$lib/utils/chart-statistics";
  import TrendingDown from "@lucide/svelte/icons/trending-down";
  import DollarSign from "@lucide/svelte/icons/dollar-sign";
  import Target from "@lucide/svelte/icons/target";
  import Activity from "@lucide/svelte/icons/activity";
  import LineChart from "@lucide/svelte/icons/line-chart";

  let {
    products,
    histories,
  }: {
    products: PriceProduct[];
    /** Map keyed by product id; values are the history entries for the
     *  currently-selected period. Empty arrays are allowed (and handled). */
    histories: Map<number, PriceHistoryEntry[]>;
  } = $props();

  /**
   * Helper: find the product+value pair that minimises / maximises a
   * per-product metric. Products whose metric returns `null` are
   * skipped. Returns null if no product had a usable metric.
   */
  function pick(
    selector: (product: PriceProduct) => number | null,
    mode: "min" | "max"
  ): { product: PriceProduct; value: number } | null {
    let best: { product: PriceProduct; value: number } | null = null;
    for (const product of products) {
      const value = selector(product);
      if (value === null || !Number.isFinite(value)) continue;
      if (
        !best ||
        (mode === "min" ? value < best.value : value > best.value)
      ) {
        best = { product, value };
      }
    }
    return best;
  }

  const cheapestNow = $derived(pick((p) => p.currentPrice ?? null, "min"));

  const biggestDrop = $derived.by(() =>
    pick((p) => {
      const history = histories.get(p.id) ?? [];
      if (history.length < 2) return null;
      const first = history[0]?.price;
      const last = history[history.length - 1]?.price;
      if (!first || !last || first <= 0) return null;
      // Negative means "dropped" — we want the most negative.
      return ((last - first) / first) * 100;
    }, "min")
  );

  const closestToTarget = $derived.by(() =>
    pick((p) => {
      if (!p.currentPrice || !p.targetPrice || p.targetPrice <= 0) return null;
      // Fractional distance above target (0 = at-target, negative = below).
      return (p.currentPrice - p.targetPrice) / p.targetPrice;
    }, "min")
  );

  const mostVolatile = $derived.by(() =>
    pick((p) => {
      const history = histories.get(p.id) ?? [];
      if (history.length < 2) return null;
      const stats = calculateBasicStats(history.map((h) => h.price));
      // Coefficient of variation (stdDev / mean) normalises across
      // price scales — a $1,000 item with $50 swings is less volatile
      // than a $100 item with $50 swings.
      if (!stats || stats.mean <= 0) return null;
      return (stats.stdDev / stats.mean) * 100;
    }, "max")
  );

  const bestAverage = $derived.by(() =>
    pick((p) => {
      const history = histories.get(p.id) ?? [];
      if (history.length === 0) return null;
      const stats = calculateBasicStats(history.map((h) => h.price));
      return stats?.mean ?? null;
    }, "min")
  );

  function priceFmt(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) return "—";
    return currencyFormatter.format(value);
  }

  const anyStat = $derived(
    cheapestNow !== null ||
      biggestDrop !== null ||
      closestToTarget !== null ||
      mostVolatile !== null ||
      bestAverage !== null
  );
</script>

{#if anyStat}
  <div
    class="grid grid-cols-1 gap-2 rounded-md border bg-muted/30 p-3 sm:grid-cols-2 lg:grid-cols-5"
    aria-label="Comparison summary"
  >
    {#if cheapestNow}
      <div class="flex items-start gap-2">
        <DollarSign class="text-primary mt-0.5 h-4 w-4 shrink-0" />
        <div class="min-w-0">
          <p class="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
            Cheapest now
          </p>
          <p class="truncate text-sm font-medium">{cheapestNow.product.name}</p>
          <p class="text-muted-foreground text-xs">
            {priceFmt(cheapestNow.value)}
          </p>
        </div>
      </div>
    {/if}

    {#if biggestDrop && biggestDrop.value < 0}
      <div class="flex items-start gap-2">
        <TrendingDown class="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
        <div class="min-w-0">
          <p class="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
            Biggest drop
          </p>
          <p class="truncate text-sm font-medium">{biggestDrop.product.name}</p>
          <p class="text-muted-foreground text-xs">
            {biggestDrop.value.toFixed(1)}% over period
          </p>
        </div>
      </div>
    {/if}

    {#if closestToTarget}
      <div class="flex items-start gap-2">
        <Target class="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
        <div class="min-w-0">
          <p class="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
            Closest to target
          </p>
          <p class="truncate text-sm font-medium">{closestToTarget.product.name}</p>
          <p class="text-muted-foreground text-xs">
            {closestToTarget.value <= 0
              ? "at or below target"
              : `${(closestToTarget.value * 100).toFixed(1)}% above`}
          </p>
        </div>
      </div>
    {/if}

    {#if bestAverage}
      <div class="flex items-start gap-2">
        <LineChart class="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
        <div class="min-w-0">
          <p class="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
            Best average
          </p>
          <p class="truncate text-sm font-medium">{bestAverage.product.name}</p>
          <p class="text-muted-foreground text-xs">
            {priceFmt(bestAverage.value)}
          </p>
        </div>
      </div>
    {/if}

    {#if mostVolatile}
      <div class="flex items-start gap-2">
        <Activity class="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <div class="min-w-0">
          <p class="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
            Most volatile
          </p>
          <p class="truncate text-sm font-medium">{mostVolatile.product.name}</p>
          <p class="text-muted-foreground text-xs">
            {mostVolatile.value.toFixed(1)}% CoV
          </p>
        </div>
      </div>
    {/if}
  </div>
{/if}
