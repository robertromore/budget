<script lang="ts">
import { getIconByName } from '$lib/components/ui/icon-picker/icon-categories';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import CreditCard from '@lucide/svelte/icons/credit-card';

interface Props {
  accountId: number;
}

let { accountId }: Props = $props();

const accountsState = $derived(AccountsState.get());
const account = $derived(accountsState?.getById(accountId) ?? null);
const accountColor = $derived((account as { accountColor?: string } | null)?.accountColor);
const accountIcon = $derived((account as { accountIcon?: string } | null)?.accountIcon);
const iconData = $derived(accountIcon ? getIconByName(accountIcon) : null);
</script>

{#if account}
  <a
    href="/accounts/{account.slug}"
    class="hover:bg-muted/50 -mx-1 inline-flex max-w-full items-center gap-2 rounded px-1 py-0.5 transition-colors">
    <div
      class="flex h-6 w-6 shrink-0 items-center justify-center rounded"
      style="background-color: {accountColor ? `${accountColor}15` : 'hsl(var(--muted))'}">
      {#if iconData?.icon}
        <iconData.icon
          class="h-3 w-3"
          style={accountColor
            ? `color: ${accountColor}`
            : 'color: hsl(var(--muted-foreground))'} />
      {:else}
        <CreditCard
          class="h-3 w-3"
          style={accountColor
            ? `color: ${accountColor}`
            : 'color: hsl(var(--muted-foreground))'} />
      {/if}
    </div>
    <span class="truncate text-sm">{account.name}</span>
  </a>
{:else}
  <span class="text-muted-foreground text-sm">—</span>
{/if}
