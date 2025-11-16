<script lang="ts" generics="TData extends TransactionsFormat">
import { Badge } from '$lib/components/ui/badge';
import * as Card from '$lib/components/ui/card';
import { getIconByName } from '$lib/components/ui/icon-picker/icon-categories';
import type { TransactionsFormat } from '$lib/types';
import { cn } from '$lib/utils';
import { formatDate } from '$lib/utils/date-formatters';
import { formatCurrency } from '$lib/utils/formatters';
import { getLocalTimeZone } from '@internationalized/date';
import Tag from '@lucide/svelte/icons/tag';

interface Props {
  transaction: TData;
  /** Fields to display in the card */
  visibleFields?: {
    payee?: boolean;
    category?: boolean;
    status?: boolean;
    notes?: boolean;
    balance?: boolean;
  };
  /** Optional click handler for card interactions */
  onclick?: (transaction: TData) => void;
  /** Additional CSS classes */
  class?: string;
}

let {
  transaction,
  visibleFields = {
    payee: true,
    category: true,
    status: true,
    notes: false,
    balance: false,
  },
  onclick,
  class: className,
}: Props = $props();

// Derive category display data
const categoryData = $derived.by(() => {
  if (!transaction.category) return {icon: Tag, color: null, name: null};

  const iconData = transaction.category.categoryIcon
    ? getIconByName(transaction.category.categoryIcon)
    : null;
  const IconComponent = iconData?.icon || Tag;

  return {
    icon: IconComponent,
    color: transaction.category.categoryColor || null,
    name: transaction.category.name,
  };
});

// Format date for display
const formattedDate = $derived(formatDate(transaction.date.toDate(getLocalTimeZone())));

// Determine amount color (negative = red, positive = green)
const amountClass = $derived(transaction.amount < 0 ? 'text-destructive' : 'text-green-600');

// Status badge variant
const statusVariant = $derived.by((): 'default' | 'secondary' | 'outline' => {
  if (transaction.status === 'cleared') return 'default';
  if (transaction.status === 'pending') return 'secondary';
  return 'outline';
});
</script>

<Card.Root
  class={cn('cursor-pointer transition-all hover:shadow-md', className)}
  onclick={() => onclick?.(transaction)}>
  <Card.Header class="pb-3">
    <div class="flex items-start justify-between">
      <div class="min-w-0 flex-1">
        <Card.Title class="truncate text-base font-semibold">
          {#if visibleFields.payee && transaction.payee}
            {transaction.payee.name}
          {:else}
            Transaction
          {/if}
        </Card.Title>
        <p class="text-muted-foreground mt-1 text-xs">{formattedDate}</p>
      </div>
      <div class="ml-2 text-right">
        <p class={cn('text-lg font-bold', amountClass)}>
          {formatCurrency(transaction.amount)}
        </p>
      </div>
    </div>
  </Card.Header>

  <Card.Content class="space-y-2 pb-3">
    {#if visibleFields.category && categoryData.name}
      <div class="flex items-center gap-2 text-sm">
        {#if categoryData.color}
          <div class="h-5 w-1 rounded" style={`background-color: ${categoryData.color};`}></div>
        {/if}
        <categoryData.icon
          class="h-4 w-4 shrink-0"
          style={categoryData.color ? `color: ${categoryData.color};` : ''} />
        <span class="truncate">{categoryData.name}</span>
      </div>
    {/if}

    {#if visibleFields.status && transaction.status}
      <div class="flex items-center gap-2">
        <Badge variant={statusVariant} class="text-xs">
          {transaction.status}
        </Badge>
      </div>
    {/if}

    {#if visibleFields.notes && transaction.notes}
      <p class="text-muted-foreground line-clamp-2 text-sm">
        {transaction.notes}
      </p>
    {/if}

    {#if visibleFields.balance && transaction.balance !== null}
      <div class="text-muted-foreground flex items-center justify-between border-t pt-1 text-xs">
        <span>Balance:</span>
        <span class="font-medium">{formatCurrency(transaction.balance)}</span>
      </div>
    {/if}
  </Card.Content>
</Card.Root>
