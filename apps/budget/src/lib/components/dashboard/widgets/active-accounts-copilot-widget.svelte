<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import CreditCard from '@lucide/svelte/icons/credit-card';
import { copilotPalette } from './copilot-colors';

let { config }: { config: DashboardWidget } = $props();

const accountsState = $derived(AccountsState.get());
const accounts = $derived(Array.from(accountsState.accounts.values()));
const activeCount = $derived(accounts.filter((a) => !a.closed).length);
const p = $derived(copilotPalette((config.settings as any)?.gradientColor));
</script>

<div class="rounded-xl border p-4 shadow-sm {p.container}">
  <div class="mb-2 flex items-center gap-2">
    <div class="rounded-lg p-1.5 {p.iconBg}">
      <CreditCard class="h-3.5 w-3.5 {p.iconFg}" />
    </div>
    <span class="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
      {config.title || 'Accounts'}
    </span>
  </div>
  <div class="text-2xl font-bold tracking-tight">{activeCount}</div>
  <p class="text-muted-foreground mt-0.5 text-xs">
    {accounts.length} total · {accounts.length - activeCount} closed
  </p>
</div>
