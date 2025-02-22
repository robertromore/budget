<script lang="ts" generics="TData, TValue">
  import type { Column } from "@tanstack/table-core";
  import { DataTableFacetedFilter } from "..";
  import CircleUserRound from "lucide-svelte/icons/circle-user-round";
  import UsersRound from "lucide-svelte/icons/users-round";
  import type { Component } from "svelte";
  import { page } from "$app/state";
  import type { Transaction, Payee } from "$lib/schema";
  import { currentViews } from "$lib/states/current-views.svelte";

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
    payees?.map((payee: Payee) => {
      return {
        label: payee.name || "",
        value: payee.id + "",
        icon: CircleUserRound as unknown as Component,
      };
    })
  );

  const allPayeeOptions = $derived(
    allPayees?.map((payee: Payee) => {
      return {
        label: payee.name || "",
        value: payee.id + "",
        icon: CircleUserRound as unknown as Component,
      };
    })
  );
</script>

<DataTableFacetedFilter
  {column}
  title="Payee"
  options={payeeOptions}
  allOptions={allPayeeOptions}
  allIcon={UsersRound as unknown as Component}
/>
