<script lang="ts">
import type { BudgetWithRelations } from '$lib/server/domains/budgets';
import { Button } from '$lib/components/ui/button';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import MoreVertical from '@lucide/svelte/icons/ellipsis-vertical';
import ChartBar from '@lucide/svelte/icons/chart-bar';
import Pencil from '@lucide/svelte/icons/pencil';
import Copy from '@lucide/svelte/icons/copy';
import Archive from '@lucide/svelte/icons/archive';
import Trash2 from '@lucide/svelte/icons/trash-2';

interface Props {
  budget: BudgetWithRelations;
  onView: (budget: BudgetWithRelations) => void;
  onEdit: (budget: BudgetWithRelations) => void;
  onDuplicate: (budget: BudgetWithRelations) => void;
  onArchive: (budget: BudgetWithRelations) => void;
  onDelete: (budget: BudgetWithRelations) => void;
}

let { budget, onView, onEdit, onDuplicate, onArchive, onDelete }: Props = $props();
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button variant="ghost" size="icon" class="h-8 w-8 p-0" {...props}>
        <MoreVertical class="h-4 w-4" />
        <span class="sr-only">Open menu</span>
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end">
    <DropdownMenu.Label>Actions</DropdownMenu.Label>
    <DropdownMenu.Separator />

    <DropdownMenu.Item onclick={() => onView(budget)}>
      <ChartBar class="mr-2 h-4 w-4" />
      View Details
    </DropdownMenu.Item>

    <DropdownMenu.Item onclick={() => onEdit(budget)}>
      <Pencil class="mr-2 h-4 w-4" />
      Edit Budget
    </DropdownMenu.Item>

    <DropdownMenu.Separator />

    <DropdownMenu.Item onclick={() => onDuplicate(budget)}>
      <Copy class="mr-2 h-4 w-4" />
      Duplicate
    </DropdownMenu.Item>

    <DropdownMenu.Item onclick={() => onArchive(budget)}>
      <Archive class="mr-2 h-4 w-4" />
      Archive
    </DropdownMenu.Item>

    <DropdownMenu.Separator />

    <DropdownMenu.Item
      onclick={() => onDelete(budget)}
      class="text-destructive focus:text-destructive">
      <Trash2 class="mr-2 h-4 w-4" />
      Delete
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
