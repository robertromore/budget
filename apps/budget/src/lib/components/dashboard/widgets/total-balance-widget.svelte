<script lang="ts">
import type { DashboardWidget } from '$lib/schema/dashboards';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import { currencyFormatter } from '$lib/utils/formatters';
import Wallet from '@lucide/svelte/icons/wallet';

let { config }: { config: DashboardWidget } = $props();

const accountsState = $derived(AccountsState.get());
const totalBalance = $derived(accountsState.getTotalBalance());
const accountCount = $derived(accountsState.accounts.size);
</script>

<div class="flex items-center gap-3">
  <div class="bg-primary/10 rounded-lg p-2.5">
    <Wallet class="text-primary h-5 w-5" />
  </div>
  <div class="min-w-0 flex-1">
    <div
      class="truncate text-2xl font-bold"
      class:text-green-600={totalBalance > 0}
      class:text-red-600={totalBalance < 0}
      class:text-muted-foreground={totalBalance === 0}>
      {currencyFormatter.format(totalBalance)}
    </div>
    <p class="text-muted-foreground text-xs">Across {accountCount} accounts</p>
  </div>
</div>
