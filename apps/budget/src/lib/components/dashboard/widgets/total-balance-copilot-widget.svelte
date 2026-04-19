<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import { currencyFormatter } from '$lib/utils/formatters';
import Wallet from '@lucide/svelte/icons/wallet';
import { copilotPalette } from './copilot-colors';

let { config }: { config: DashboardWidget } = $props();

const accountsState = $derived(AccountsState.get());
const totalBalance = $derived(accountsState.getTotalBalance());
const accountCount = $derived(accountsState.accounts.size);
const p = $derived(copilotPalette((config.settings as any)?.gradientColor));
</script>

<div class="rounded-xl border p-4 shadow-sm {p.container}">
  <div class="mb-2 flex items-center gap-2">
    <div class="rounded-lg p-1.5 {p.iconBg}">
      <Wallet class="h-3.5 w-3.5 {p.iconFg}" />
    </div>
    <span class="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
      {config.title || 'Total balance'}
    </span>
  </div>
  <div
    class="text-2xl font-bold tracking-tight"
    class:text-foreground={totalBalance > 0}
    class:text-amount-negative={totalBalance < 0}
    class:text-muted-foreground={totalBalance === 0}>
    {currencyFormatter.format(totalBalance)}
  </div>
  <p class="text-muted-foreground mt-0.5 text-xs">across {accountCount} account{accountCount === 1 ? '' : 's'}</p>
</div>
