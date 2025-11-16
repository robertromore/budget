<script lang="ts">
import type {BudgetWithRelations} from '$lib/server/domains/budgets';
import {Badge} from '$lib/components/ui/badge';
import * as Tooltip from '$lib/components/ui/tooltip';
import {getBudgetValidationIssues} from '$lib/utils/budget-validation';
import TriangleAlert from '@lucide/svelte/icons/triangle-alert';

interface Props {
  budget: BudgetWithRelations;
}

let {budget}: Props = $props();

const validation = $derived(getBudgetValidationIssues(budget));
</script>

<div class="flex items-center gap-2">
  <a href="/budgets/{budget.slug}" class="font-medium hover:underline">
    {budget.name}
  </a>
  {#if validation.hasIssues}
    <Tooltip.Root>
      <Tooltip.Trigger>
        <Badge variant="destructive" class="gap-1 text-xs">
          <TriangleAlert class="h-3 w-3" />
          Invalid
        </Badge>
      </Tooltip.Trigger>
      <Tooltip.Content>
        <div class="space-y-1">
          <div class="font-semibold">This budget has validation issues:</div>
          {#each validation.messages as message}
            <div class="text-xs">• {message}</div>
          {/each}
        </div>
      </Tooltip.Content>
    </Tooltip.Root>
  {/if}
</div>
