<script lang="ts" generics="TData, TValue">
  import type { Column } from "@tanstack/table-core";
  import { DataTableFacetedFilter } from "..";
  import type { Component } from "svelte";
  import { page } from "$app/state";
  import type { Transaction, Payee } from "$lib/schema";
  import { currentViews } from "$lib/states/views/current-views.svelte";
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
  
  // Check if there are any transactions with null payees
  const hasNullPayees = $derived(
    account.transactions.some((transaction: Transaction) => transaction.payeeId === null)
  );

  const payeeOptions = $derived.by(() => {
    const options = new SvelteMap<number | string, FacetedFilterOption>();
    
    // Add "None" option if there are transactions with null payees
    if (hasNullPayees) {
      options.set("null", {
        label: "(None)",
        value: "null",
        icon: HandCoins as unknown as Component,
      });
    }
    
    // Add regular payee options
    payees
      ?.filter((payee: Payee) => payee.id !== undefined)
      .forEach((payee: Payee) => {
        options.set(payee.id, {
          label: payee.name || "",
          value: payee.id + "",
          icon: HandCoins as unknown as Component,
        });
      });
    
    return options;
  });

  const allPayeeOptions = $derived.by(() => {
    const options = new SvelteMap<number | string, FacetedFilterOption>();
    
    // Add "None" option if there are transactions with null payees
    if (hasNullPayees) {
      options.set("null", {
        label: "(None)",
        value: "null",
        icon: HandCoins as unknown as Component,
      });
    }
    
    // Add all payee options
    allPayees?.forEach((payee: Payee) => {
      options.set(payee.id, {
        label: payee.name || "",
        value: payee.id + "",
        icon: HandCoins as unknown as Component,
      });
    });
    
    return options;
  });
</script>

<DataTableFacetedFilter
  {column}
  title="Payee"
  options={payeeOptions}
  allOptions={allPayeeOptions}
  allIcon={HandCoins as unknown as Component}
/>
