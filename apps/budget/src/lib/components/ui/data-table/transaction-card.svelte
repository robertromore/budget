<script lang="ts" generics="TData extends TransactionsFormat">
import type {TransactionsFormat} from '$lib/types';
import * as Card from '$lib/components/ui/card';
import {getIconByName} from '$lib/components/ui/icon-picker/icon-categories';
import {formatCurrency} from '$lib/utils/formatters';
import {formatDate} from '$lib/utils/date-formatters';
import {getLocalTimeZone} from '@internationalized/date';
import {Badge} from '$lib/components/ui/badge';
import Tag from '@lucide/svelte/icons/tag';
import {cn} from '$lib/utils';

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
const formattedDate = $derived(
  formatDate(transaction.date.toDate(getLocalTimeZone()))
);

// Determine amount color (negative = red, positive = green)
const amountClass = $derived(
  transaction.amount < 0 ? 'text-destructive' : 'text-green-600'
);

// Status badge variant
const statusVariant = $derived.by((): 'default' | 'secondary' | 'outline' => {
  if (transaction.status === 'cleared') return 'default';
  if (transaction.status === 'pending') return 'secondary';
  return 'outline';
});
</script>

<Card.Root
  class={cn('transition-all hover:shadow-md cursor-pointer', className)}
  onclick={() => onclick?.(transaction)}
>
  <Card.Header class="pb-3">
    <div class="flex items-start justify-between">
      <div class="flex-1 min-w-0">
        <Card.Title class="text-base font-semibold truncate">
          {#if visibleFields.payee && transaction.payee}
            {transaction.payee.name}
          {:else}
            Transaction
          {/if}
        </Card.Title>
        <p class="text-muted-foreground text-xs mt-1">{formattedDate}</p>
      </div>
      <div class="text-right ml-2">
        <p class={cn('text-lg font-bold', amountClass)}>
          {formatCurrency(transaction.amount)}
        </p>
      </div>
    </div>
  </Card.Header>

  <Card.Content class="pb-3 space-y-2">
    {#if visibleFields.category && categoryData.name}
      <div class="flex items-center gap-2 text-sm">
        {#if categoryData.color}
          <div
            class="w-1 h-5 rounded"
            style={`background-color: ${categoryData.color};`}
          ></div>
        {/if}
        <categoryData.icon
          class="h-4 w-4 flex-shrink-0"
          style={categoryData.color ? `color: ${categoryData.color};` : ''}
        />
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
      <p class="text-muted-foreground text-sm line-clamp-2">
        {transaction.notes}
      </p>
    {/if}

    {#if visibleFields.balance && transaction.balance !== null}
      <div class="text-muted-foreground flex items-center justify-between text-xs pt-1 border-t">
        <span>Balance:</span>
        <span class="font-medium">{formatCurrency(transaction.balance)}</span>
      </div>
    {/if}
  </Card.Content>
</Card.Root>
