<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import CreditCard from '@lucide/svelte/icons/credit-card';

let { config }: { config: DashboardWidget } = $props();

const accountsState = $derived(AccountsState.get());
const accounts = $derived(Array.from(accountsState.accounts.values()));
const activeCount = $derived(accounts.filter((a) => !a.closed).length);
</script>

<div class="flex items-center gap-3">
  <div class="bg-primary/10 rounded-lg p-2.5">
    <CreditCard class="text-primary h-5 w-5" />
  </div>
  <div class="min-w-0 flex-1">
    <div class="text-2xl font-bold">{activeCount}</div>
    <p class="text-muted-foreground text-xs">{accounts.length} total accounts</p>
  </div>
</div>
