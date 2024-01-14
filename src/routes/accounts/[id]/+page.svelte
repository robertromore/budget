<script context="module" lang="ts">
  export function getPageTitle(data: any) {
    return data.data.account?.name;
  }
  // export const pageTitle = false;
</script>

<script lang="ts">
	import { currencyFormatter } from "$lib/helpers/formatters";
	import type { Account } from "$lib/schema";
	import type { PageData } from "./$types";

  let { data } = $props<{data: PageData}>();
  let account: Account = data.account;
</script>

<h1>{account.name}</h1>
<p>{account.notes}</p>
<strong>Balance:</strong> {currencyFormatter.format(account.balance ?? 0)}
