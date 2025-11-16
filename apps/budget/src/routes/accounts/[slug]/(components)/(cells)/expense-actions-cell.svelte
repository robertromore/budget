<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import Ellipsis from '@lucide/svelte/icons/ellipsis';
import SquarePen from '@lucide/svelte/icons/square-pen';
import Trash2 from '@lucide/svelte/icons/trash-2';
import FileText from '@lucide/svelte/icons/file-text';
import Receipt from '@lucide/svelte/icons/receipt';
import type { ExpenseFormat } from '../../(data)/expense-columns.svelte';

interface Props {
  expense: ExpenseFormat;
  onEdit: () => void;
  onDelete: () => void;
  onManageClaims: () => void;
  onAddReceipt: () => void;
}

let { expense, onEdit, onDelete, onManageClaims, onAddReceipt }: Props = $props();
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button {...props} variant="ghost" size="icon">
        <Ellipsis class="size-4" />
        <span class="sr-only">Open menu</span>
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end">
    <DropdownMenu.Label>Actions</DropdownMenu.Label>
    <DropdownMenu.Separator />

    <DropdownMenu.Item onclick={onEdit}>
      <SquarePen class="mr-2 size-4" />
      Edit Expense
    </DropdownMenu.Item>

    <DropdownMenu.Item onclick={onManageClaims}>
      <FileText class="mr-2 size-4" />
      Manage Claims
    </DropdownMenu.Item>

    <DropdownMenu.Item onclick={onAddReceipt}>
      <Receipt class="mr-2 size-4" />
      Add Receipt
    </DropdownMenu.Item>

    <DropdownMenu.Separator />

    <DropdownMenu.Item onclick={onDelete} class="text-destructive focus:text-destructive">
      <Trash2 class="mr-2 size-4" />
      Delete Expense
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
