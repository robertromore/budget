<script lang="ts" generics="TData, TValue">
  import type { Column } from "@tanstack/table-core";
  import { DataTableFacetedFilter } from "..";
  import type { Component } from "svelte";
  import { page } from "$app/state";
  import type { Category, Transaction } from "$lib/schema";
  import { currentViews } from "$lib/states/current-views.svelte";
  import SquareMousePointer from "lucide-svelte/icons/square-mouse-pointer";
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

  const categoryOptions = $derived(
    new SvelteMap<number, FacetedFilterOption>(
      categories
        ?.filter((category: Category) => category.id !== undefined)
        .map((category: Category) => {
          return [
            category.id,
            {
              label: category.name || "",
              value: category.id + "",
              icon: SquareMousePointer as unknown as Component,
            },
          ];
        })
    )
  );

  const allCategoryOptions = $derived(
    new SvelteMap<number, FacetedFilterOption>(
      allCategories?.map((category: Category) => {
        return [
          category.id,
          {
            label: category.name || "",
            value: category.id + "",
            icon: SquareMousePointer as unknown as Component,
          },
        ];
      })
    )
  );
</script>

<DataTableFacetedFilter
  {column}
  title="Category"
  options={categoryOptions}
  allOptions={allCategoryOptions}
  allIcon={SquareMousePointer as unknown as Component}
/>
