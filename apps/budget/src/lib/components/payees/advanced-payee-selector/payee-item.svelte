<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { cn } from '$lib/utils';
import { currencyFormatter } from '$lib/utils/formatters';
import Check from '@lucide/svelte/icons/check';
import Sparkles from '@lucide/svelte/icons/sparkles';
import type { DisplayMode, PayeeWithMetadata } from './types';
import { formatPayeeType } from './utils';

let {
  payee,
  displayMode = 'normal',
  isSelected = false,
  onSelect,
}: {
  payee: PayeeWithMetadata;
  displayMode?: DisplayMode;
  isSelected?: boolean;
  onSelect: () => void;
} = $props();

// Format last transaction date
const lastUsed = $derived.by(() => {
  if (!payee.lastTransactionDate) return null;
  const date = new Date(payee.lastTransactionDate);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) return 'Today';
  if (daysDiff === 1) return 'Yesterday';
  if (daysDiff < 7) return `${daysDiff}d ago`;
  if (daysDiff < 30) return `${Math.floor(daysDiff / 7)}w ago`;
  if (daysDiff < 365) return `${Math.floor(daysDiff / 30)}mo ago`;
  return `${Math.floor(daysDiff / 365)}y ago`;
});
</script>

<button
  type="button"
  onclick={onSelect}
  class={cn(
    'flex w-full items-center gap-2 px-3 py-2 text-left',
    'hover:bg-accent transition-colors',
    isSelected && 'bg-muted',
    displayMode === 'compact' && 'py-1.5',
    displayMode === 'detailed' && 'py-3'
  )}>
  <!-- Check icon -->
  <Check class={cn('h-4 w-4 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')} />

  <!-- Payee info -->
  <div class="min-w-0 flex-1">
    <div class="flex items-center gap-2">
      <!-- Name -->
      <span class="truncate text-sm font-medium">{payee.name}</span>

      <!-- ML Suggestion badge -->
      {#if payee._isSuggested}
        <Sparkles class="text-primary h-3 w-3 shrink-0" />
      {/if}

      <!-- Type badge (normal/detailed modes) -->
      {#if displayMode !== 'compact' && payee.payeeType}
        <Badge variant="outline" class="shrink-0 px-1.5 py-0 text-xs">
          {formatPayeeType(payee.payeeType)}
        </Badge>
      {/if}
    </div>

    <!-- Additional info for normal/detailed modes -->
    {#if displayMode !== 'compact'}
      <div class="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
        <!-- Last used -->
        {#if lastUsed}
          <span>{lastUsed}</span>
        {/if}

        <!-- Avg amount (detailed mode) -->
        {#if displayMode === 'detailed' && payee.avgAmount}
          {#if lastUsed}
            <span>•</span>
          {/if}
          <span>Avg {currencyFormatter.format(payee.avgAmount)}</span>
        {/if}

        <!-- Payment frequency (detailed mode) -->
        {#if displayMode === 'detailed' && payee.paymentFrequency}
          <span>•</span>
          <span>{payee.paymentFrequency}/mo</span>
        {/if}
      </div>
    {/if}
  </div>
</button>
