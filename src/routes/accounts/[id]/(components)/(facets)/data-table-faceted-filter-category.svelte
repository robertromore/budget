<script lang="ts" generics="TData, TValue">
  import type { Column } from "@tanstack/table-core";
  import { DataTableFacetedFilter } from "..";
  import type { Component } from "svelte";
  import { page } from "$app/state";
  import type { Category, Transaction } from "$lib/schema";
  import { currentViews } from "$lib/states/views/current-views.svelte";
  import SquareMousePointer from "@lucide/svelte/icons/square-mouse-pointer";
  import type { FacetedFilterOption } from "$lib/types";
  import { SvelteMap } from "svelte/reactivity";

  type Props<TData, TValue> = {
    column: Column<TData, TValue>;
  };

  let { column }: Props<TData, TValue> = $props();

  const { data } = $derived(page);
  const account = $derived(data.account);

  const activeView = $derived(currentViews.get().activeView);
  const activeViewModel = $derived(activeView.view);
  const selectedValues = $derived(activeViewModel.getFilterValue(column.id));

  const categories = $derived(
    account.transactions
      .map((transaction: Transaction) => transaction.category)
      .concat(selectedValues)
  );
  const allCategories = $derived(data.categories);
  
  // Check if there are any transactions with null categories
  const hasNullCategories = $derived(
    account.transactions.some((transaction: Transaction) => transaction.categoryId === null)
  );

  const categoryOptions = $derived.by(() => {
    const options = new SvelteMap<number | string, FacetedFilterOption>();
    
    // Add "None" option if there are transactions with null categories
    if (hasNullCategories) {
      options.set("null", {
        label: "(None)",
        value: "null",
        icon: SquareMousePointer as unknown as Component,
      });
    }
    
    // Add regular category options
    categories
      ?.filter((category: Category) => category.id !== undefined)
      .forEach((category: Category) => {
        options.set(category.id, {
          label: category.name || "",
          value: category.id + "",
          icon: SquareMousePointer as unknown as Component,
        });
      });
    
    return options;
  });

  const allCategoryOptions = $derived.by(() => {
    const options = new SvelteMap<number | string, FacetedFilterOption>();
    
    // Add "None" option if there are transactions with null categories
    if (hasNullCategories) {
      options.set("null", {
        label: "(None)",
        value: "null",
        icon: SquareMousePointer as unknown as Component,
      });
    }
    
    // Add all category options
    allCategories?.forEach((category: Category) => {
      options.set(category.id, {
        label: category.name || "",
        value: category.id + "",
        icon: SquareMousePointer as unknown as Component,
      });
    });
    
    return options;
  });
</script>

<DataTableFacetedFilter
  {column}
  title="Category"
  options={categoryOptions}
  allOptions={allCategoryOptions}
  allIcon={SquareMousePointer as unknown as Component}
/>
