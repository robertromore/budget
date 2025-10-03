<script lang="ts">
import * as Card from '$lib/components/ui/card';
import {Badge} from '$lib/components/ui/badge';
import {Button} from '$lib/components/ui/button';
import {FolderTree, Edit, Trash2, ChevronRight, ChevronDown} from '@lucide/svelte';
import {formatCurrency} from '$lib/utils';
import type {BudgetGroup} from '$lib/schema/budgets';

let {
  group,
  level,
  hasChildren = false,
  isExpanded = false,
  onToggleExpand,
  onEdit,
  onDelete,
}: {
  group: BudgetGroup;
  level: number;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onEdit?: (group: BudgetGroup) => void;
  onDelete?: (group: BudgetGroup) => void;
} = $props();
</script>

<div class="space-y-2" style:margin-left="{level * 24}px">
  <Card.Root class="transition-shadow hover:shadow-md">
    <Card.Content class="p-4">
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-start gap-3 flex-1 min-w-0">
          {#if hasChildren}
            <button
              onclick={onToggleExpand}
              class="mt-1 p-1 hover:bg-accent rounded transition-colors shrink-0"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {#if isExpanded}
                <ChevronDown class="h-4 w-4" />
              {:else}
                <ChevronRight class="h-4 w-4" />
              {/if}
            </button>
          {:else}
            <div class="w-6 shrink-0"></div>
          {/if}

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <FolderTree class="h-4 w-4 text-muted-foreground shrink-0" />
              <h3 class="font-medium truncate">{group.name}</h3>
              {#if level > 0}
                <Badge variant="outline" class="text-xs">
                  Level {level}
                </Badge>
              {/if}
            </div>

            {#if group.description}
              <p class="text-sm text-muted-foreground mt-1 line-clamp-2">
                {group.description}
              </p>
            {/if}

            {#if group.spendingLimit !== null}
              <div class="mt-2">
                <Badge variant="secondary">
                  Limit: {formatCurrency(group.spendingLimit)}
                </Badge>
              </div>
            {/if}
          </div>
        </div>

        <div class="flex gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onclick={() => onEdit?.(group)}
          >
            <Edit class="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onclick={() => onDelete?.(group)}
          >
            <Trash2 class="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card.Content>
  </Card.Root>
</div>
