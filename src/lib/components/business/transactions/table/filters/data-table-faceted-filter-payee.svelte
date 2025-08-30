<script lang="ts" generics="TData, TValue">
  import type { Column } from "@tanstack/table-core";
  import { DataTableFacetedFilter } from "..";
  import type { Component } from "svelte";
  import { page } from "$app/state";
  import type { Transaction, Payee } from "$lib/schema";
  import { currentViews } from "$lib/stores/app/current-views.svelte";
  import HandCoins from "@lucide/svelte/icons/hand-coins";
  import { SvelteMap } from "svelte/reactivity";
  import type { FacetedFilterOption } from "$lib/types";

  type Props<TData, TValue> = {
    column: Column<TData, TValue>;
  };

  let { column }: Props<TData, TValue> = $props();

  const { data } = $derived(page);
  const account = $derived(data.account);

  const activeView = $derived(currentViews.get().activeView);
  const activeViewModel = $derived(activeView.view);
  const selectedValues = $derived(activeViewModel.getFilterValue(column.id));

  const payees = $derived(
    account.transactions.map((transaction: Transaction) => transaction.payee).concat(selectedValues)
  );
  const allPayees = $derived(data.payees);

  const payeeOptions = $derived(
    new SvelteMap<number, FacetedFilterOption>(
      payees
        ?.filter((payee: Payee) => payee.id !== undefined)
        .map((payee: Payee) => {
          return [
            payee.id,
            {
              label: payee.name || "",
              value: payee.id + "",
              icon: HandCoins as unknown as Component,
            },
          ];
        })
    )
  );

  const allPayeeOptions = $derived(
    new SvelteMap<number, FacetedFilterOption>(
      allPayees?.map((payee: Payee) => {
        return [
          payee.id,
          {
            label: payee.name || "",
            value: payee.id + "",
            icon: HandCoins as unknown as Component,
          },
        ];
      })
    )
  );
</script>

<DataTableFacetedFilter
  {column}
  title="Payee"
  options={payeeOptions}
  allOptions={allPayeeOptions}
  allIcon={HandCoins as unknown as Component}
/>
